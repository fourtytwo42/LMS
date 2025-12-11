import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

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

    // Check access
    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id },
      include: {
        instructorAssignments: {
          where: { userId: user.id },
        },
        courses: {
          include: {
            course: {
              include: {
                contentItems: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    const hasAccess =
      learningPlan.createdById === user.id ||
      learningPlan.instructorAssignments.length > 0 ||
      user.roles.includes("ADMIN");

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { learningPlanId: id },
    });

    const enrollmentStats = {
      total: enrollments.length,
      active: enrollments.filter((e) => e.status === "IN_PROGRESS").length,
      completed: enrollments.filter((e) => e.status === "COMPLETED").length,
      dropped: enrollments.filter((e) => e.status === "DROPPED").length,
    };

    // Calculate completion rate
    const completionRate =
      enrollmentStats.total > 0
        ? (enrollmentStats.completed / enrollmentStats.total) * 100
        : 0;

    // Get course analytics
    const courseAnalytics = await Promise.all(
      learningPlan.courses.map(async (planCourse) => {
        const courseEnrollments = await prisma.enrollment.findMany({
          where: {
            learningPlanId: id,
            courseId: planCourse.courseId,
          },
        });

        const courseCompletions = await prisma.completion.count({
          where: {
            courseId: planCourse.courseId,
            learningPlanId: id,
          },
        });

        const courseCompletionRate =
          courseEnrollments.length > 0
            ? (courseCompletions / courseEnrollments.length) * 100
            : 0;

        // Get average score from completions
        const completionsWithScores = await prisma.completion.findMany({
          where: {
            courseId: planCourse.courseId,
            learningPlanId: id,
            score: { not: null },
          },
          select: { score: true },
        });

        const averageScore =
          completionsWithScores.length > 0
            ? completionsWithScores.reduce((sum, c) => sum + (c.score || 0), 0) /
              completionsWithScores.length
            : 0;

        return {
          courseId: planCourse.courseId,
          title: planCourse.course.title,
          completionRate: Math.round(courseCompletionRate * 10) / 10,
          averageScore: Math.round(averageScore * 100 * 10) / 10,
        };
      })
    );

    return NextResponse.json({
      learningPlanId: id,
      enrollments: enrollmentStats,
      completionRate: Math.round(completionRate * 10) / 10,
      courses: courseAnalytics,
    });
  } catch (error) {
    console.error("Error fetching learning plan analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

