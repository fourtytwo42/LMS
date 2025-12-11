import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await authenticate(request);
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json(
          { error: error.errorCode || "UNAUTHORIZED", message: error.message || "Authentication required" },
          { status: error.statusCode || 401 }
        );
      }
      throw error;
    }

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        contentItems: true,
        enrollments: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: id,
        userId: user.id,
      },
    });

    if (!isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Enrollment statistics
    const enrollments = {
      total: course.enrollments.length,
      active: course.enrollments.filter((e) => e.status === "IN_PROGRESS").length,
      completed: course.enrollments.filter((e) => e.status === "COMPLETED").length,
      dropped: course.enrollments.filter((e) => e.status === "DROPPED").length,
    };

    // Calculate completion rate
    const completionRate =
      enrollments.total > 0
        ? (enrollments.completed / enrollments.total) * 100
        : 0;

    // Get average score from test attempts
    const testContentItems = course.contentItems.filter((item) => item.type === "TEST");
    let totalScore = 0;
    let scoreCount = 0;

    for (const testItem of testContentItems) {
      const test = await prisma.test.findUnique({
        where: { contentItemId: testItem.id },
        include: {
          attempts: {
            where: {
              userId: {
                in: course.enrollments.map((e) => e.userId),
              },
            },
          },
        },
      });

      if (test) {
        for (const attempt of test.attempts) {
          if (attempt.score !== null) {
            totalScore += attempt.score;
            scoreCount++;
          }
        }
      }
    }

    const averageScore = scoreCount > 0 ? (totalScore / scoreCount) * 100 : 0;

    // Calculate average time to complete
    const completedEnrollments = course.enrollments.filter(
      (e) => e.status === "COMPLETED" && e.startedAt && e.completedAt
    );
    let totalTime = 0;
    for (const enrollment of completedEnrollments) {
      if (enrollment.startedAt && enrollment.completedAt) {
        const timeDiff =
          enrollment.completedAt.getTime() - enrollment.startedAt.getTime();
        totalTime += Math.floor(timeDiff / (1000 * 60)); // minutes
      }
    }
    const averageTimeToComplete =
      completedEnrollments.length > 0 ? totalTime / completedEnrollments.length : 0;

    // Content item analytics
    const contentItemsAnalytics = await Promise.all(
      course.contentItems.map(async (item) => {
        if (item.type === "VIDEO") {
          const videoProgresses = await prisma.videoProgress.findMany({
            where: {
              contentItemId: item.id,
              userId: {
                in: course.enrollments.map((e) => e.userId),
              },
            },
          });

          const completions = await prisma.completion.count({
            where: {
              contentItemId: item.id,
              courseId: id,
            },
          });

          const totalViews = videoProgresses.length;
          const uniqueViewers = new Set(videoProgresses.map((vp) => vp.userId)).size;
          const averageWatchTime =
            videoProgresses.length > 0
              ? videoProgresses.reduce((sum, vp) => sum + vp.watchTime, 0) /
                videoProgresses.length
              : 0;
          const completionRate =
            totalViews > 0 ? (completions / totalViews) * 100 : 0;

          return {
            id: item.id,
            title: item.title,
            type: item.type,
            completionRate,
            averageWatchTime: Math.round(averageWatchTime),
            timesWatched: totalViews,
            uniqueViewers,
          };
        } else if (item.type === "TEST") {
          const test = await prisma.test.findUnique({
            where: { contentItemId: item.id },
            include: {
              attempts: {
                where: {
                  userId: {
                    in: course.enrollments.map((e) => e.userId),
                  },
                },
              },
            },
          });

          if (test) {
            const totalAttempts = test.attempts.length;
            const passedAttempts = test.attempts.filter((a) => a.passed).length;
            const passRate =
              totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;
            const averageScore =
              totalAttempts > 0
                ? (test.attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts) *
                  100
                : 0;

            return {
              id: item.id,
              title: item.title,
              type: item.type,
              totalAttempts,
              passRate: Math.round(passRate * 10) / 10,
              averageScore: Math.round(averageScore * 10) / 10,
            };
          }
        }

        // For other content types, just return basic info
        const completions = await prisma.completion.count({
          where: {
            contentItemId: item.id,
            courseId: id,
          },
        });

        return {
          id: item.id,
          title: item.title,
          type: item.type,
          completions,
        };
      })
    );

    return NextResponse.json({
      courseId: id,
      enrollments,
      completionRate: Math.round(completionRate * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      averageTimeToComplete: Math.round(averageTimeToComplete),
      contentItems: contentItemsAnalytics,
    });
  } catch (error) {
    console.error("Error fetching course analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

