import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: params.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Get course with content items
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
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
        courseId: params.courseId,
        completed: true,
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

    // Build content items with progress
    const contentItemsWithProgress = course.contentItems.map((item) => {
      const completion = completionMap.get(item.id);
      const videoProgress = videoProgressMap.get(item.id);

      let progress = 0;
      let unlocked = true;

      if (item.order > 0) {
        // Check if previous item is completed
        const previousItem = course.contentItems.find(
          (ci) => ci.order === item.order - 1
        );
        if (previousItem) {
          const prevCompletion = completionMap.get(previousItem.id);
          unlocked = !!prevCompletion?.completed;
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
        completed: completion?.completed || false,
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
      (item) => item.completed
    ).length;
    const overallProgress =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      courseId: params.courseId,
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

