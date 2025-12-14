import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

// GET endpoint to fetch progress for a content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentItemId: string }> }
) {
  try {
    const { contentItemId } = await params;
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

    // Get content item to determine type
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: {
        course: {
          select: {
            id: true,
            createdById: true,
            publicAccess: true,
            enrollments: {
              where: { userId: user.id },
              select: { id: true },
            },
            groupAccess: {
              select: {
                group: {
                  select: {
                    members: {
                      where: { userId: user.id },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contentItem) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Content item not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isInstructor = user.roles.includes("INSTRUCTOR");
    const isCreator = contentItem.course.createdById === user.id;
    const isDirectlyEnrolled = contentItem.course.enrollments.length > 0;
    const hasCourseGroupAccess = contentItem.course.groupAccess.some((ga) => ga.group.members.length > 0);
    
    // Check learning plan access
    let hasLearningPlanAccess = false;
    if (!isAdmin && !isInstructor && !isCreator && !isDirectlyEnrolled && !hasCourseGroupAccess && !contentItem.course.publicAccess) {
      // Find all learning plans that contain this course
      const learningPlanCourses = await prisma.learningPlanCourse.findMany({
        where: {
          courseId: contentItem.course.id,
        },
        include: {
          learningPlan: {
            select: {
              id: true,
              createdById: true,
              publicAccess: true,
            },
          },
        },
      });

      if (learningPlanCourses.length > 0) {
        // Get user's group IDs
        const userGroups = await prisma.groupMember.findMany({
          where: { userId: user.id },
          select: { groupId: true },
        });
        const userGroupIds = userGroups.map((gm) => gm.groupId);

        // Check if user has access to any learning plan containing this course
        for (const lpCourse of learningPlanCourses) {
          const learningPlan = lpCourse.learningPlan;
          
          // Check if user is enrolled in the learning plan
          const isEnrolledInPlan = await prisma.enrollment.findFirst({
            where: {
              learningPlanId: learningPlan.id,
              userId: user.id,
            },
          });

          // Check if learning plan is public
          const isPublic = learningPlan.publicAccess;

          // Check if user is in a group that has access to the learning plan
          const learningPlanGroupAccess = await prisma.learningPlanGroupAccess.findMany({
            where: {
              learningPlanId: learningPlan.id,
              groupId: { in: userGroupIds },
            },
          });

          // Check if user is the creator
          const isPlanCreator = learningPlan.createdById === user.id;

          if (isEnrolledInPlan || isPublic || learningPlanGroupAccess.length > 0 || isPlanCreator) {
            hasLearningPlanAccess = true;
            break;
          }
        }
      }
    }

    const hasAccess = isAdmin || isInstructor || isCreator || isDirectlyEnrolled || hasLearningPlanAccess || hasCourseGroupAccess || contentItem.course.publicAccess;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You do not have access to this course" },
        { status: 403 }
      );
    }

    // For videos, get video progress
    if (contentItem.type === "VIDEO") {
      const videoProgress = await prisma.videoProgress.findUnique({
        where: {
          userId_contentItemId: {
            userId: user.id,
            contentItemId: contentItemId,
          },
        },
      });

      // Get completion record for videos (completion records take precedence)
      const completion = await prisma.completion.findFirst({
        where: {
          userId: user.id,
          courseId: contentItem.courseId,
          contentItemId: contentItemId,
        },
      });

      if (!videoProgress) {
        return NextResponse.json({
          contentItemId,
          progress: 0,
          completed: !!completion, // Mark completed if completion record exists
          lastPage: null,
          lastPosition: 0,
        });
      }

      // Completion record takes precedence over videoProgress.completed
      const isCompleted = !!completion || videoProgress.completed;

      return NextResponse.json({
        contentItemId,
        progress: videoProgress.totalDuration > 0 
          ? (videoProgress.watchTime / videoProgress.totalDuration) 
          : 0,
        completed: isCompleted,
        lastPage: null,
        lastPosition: videoProgress.lastPosition,
      });
    }

    // For PDF/PPT, get content progress
    const contentProgress = await prisma.contentProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId: user.id,
          contentItemId: contentItemId,
        },
      },
    });

    // Get completion record
    const completion = await prisma.completion.findFirst({
      where: {
        userId: user.id,
        courseId: contentItem.courseId,
        contentItemId: contentItemId,
      },
    });

    if (contentProgress) {
      return NextResponse.json({
        contentItemId,
        progress: contentProgress.progress,
        completed: contentProgress.completed || !!completion,
        lastPage: contentProgress.lastPage,
        lastPosition: null,
      });
    }

    // No progress record yet
    return NextResponse.json({
      contentItemId,
      progress: 0,
      completed: !!completion,
      lastPage: null,
      lastPosition: null,
    });
  } catch (error) {
    console.error("Error fetching content progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

