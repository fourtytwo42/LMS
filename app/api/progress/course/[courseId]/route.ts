import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
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

    // Get enrollment first
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: courseId,
      },
    });

    if (!enrollment) {
      // Check if course exists to return appropriate error
      const courseExists = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });

      if (!courseExists) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Course not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Get course with content items
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        contentItems: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Get all completions for this user and course
    const completions = await prisma.completion.findMany({
      where: {
        userId: user.id,
        courseId: courseId,
      },
    });

    const completionMap = new Map(
      completions.map((c) => [c.contentItemId, c])
    );

    // Get video progress for all video content items
    const videoProgresses = await prisma.videoProgress.findMany({
      where: {
        userId: user.id,
        contentItemId: {
          in: course.contentItems
            .filter((item) => item.type === "VIDEO")
            .map((item) => item.id),
        },
      },
    });

    const videoProgressMap = new Map(
      videoProgresses.map((vp) => [vp.contentItemId, vp])
    );

    // Get all prerequisites for content items (if table exists)
    let prerequisitesMap = new Map<string, string[]>();
    try {
      const prerequisites = await prisma.contentItemPrerequisite.findMany({
        where: {
          contentItemId: {
            in: course.contentItems.map((item) => item.id),
          },
        },
      });

      prerequisites.forEach((p) => {
        if (!prerequisitesMap.has(p.contentItemId)) {
          prerequisitesMap.set(p.contentItemId, []);
        }
        prerequisitesMap.get(p.contentItemId)!.push(p.prerequisiteId);
      });
    } catch (error: any) {
      // If prerequisites table doesn't exist, use empty map
      const errorMessage = error?.message || '';
      const errorCode = error?.code || '';
      if (
        errorCode === 'P2021' || 
        errorCode === 'P2001' ||
        errorMessage.includes('does not exist') || 
        errorMessage.includes('ContentItemPrerequisite') ||
        errorMessage.includes('relation') ||
        errorMessage.includes('table')
      ) {
        console.warn("ContentItemPrerequisite table not found, skipping prerequisites check. Run migration to enable prerequisites feature.");
      } else {
        console.error("Error fetching prerequisites:", error);
        throw error;
      }
    }

    // Build content items with progress
    const contentItemsWithProgress = course.contentItems.map((item) => {
      const completion = completionMap.get(item.id);
      const videoProgress = videoProgressMap.get(item.id);

      let progress = 0;
      let unlocked = true;

      // Check prerequisites
      const requiredPrerequisites = prerequisitesMap.get(item.id) || [];
      if (requiredPrerequisites.length > 0) {
        // All prerequisites must be completed
        unlocked = requiredPrerequisites.every((prereqId) => {
          const prereqCompletion = completionMap.get(prereqId);
          return !!prereqCompletion;
        });
      } else if (course.sequentialRequired && item.order > 0) {
        // Fallback to sequential check if no prerequisites and sequential is required
        const previousItem = course.contentItems.find(
          (ci) => ci.order === item.order - 1
        );
        if (previousItem) {
          const prevCompletion = completionMap.get(previousItem.id);
          unlocked = !!prevCompletion;
        }
      }

      if (item.type === "VIDEO" && videoProgress) {
        progress =
          videoProgress.totalDuration > 0
            ? videoProgress.watchTime / videoProgress.totalDuration
            : 0;
      } else if (completion) {
        progress = 1.0;
      }

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        order: item.order,
        completed: !!completion,
        progress,
        unlocked,
        completedAt: completion?.completedAt || null,
        ...(item.type === "TEST" && {
          bestScore: 0, // TODO: Get from test attempts
        }),
      };
    });

    // Calculate overall progress
    const totalItems = contentItemsWithProgress.length;
    const completedItems = contentItemsWithProgress.filter(
      (item) => item.completed === true
    ).length;
    const overallProgress =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      courseId: courseId,
      enrollmentId: enrollment.id,
      status: enrollment.status,
      progress: overallProgress,
      contentItems: contentItemsWithProgress,
      startedAt: enrollment.startedAt,
      dueDate: enrollment.dueDate,
    });
  } catch (error) {
    console.error("Error fetching course progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

