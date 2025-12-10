import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateVideoProgressSchema = z.object({
  contentItemId: z.string().min(1, "Content item ID is required"),
  watchTime: z.number().int().min(0),
  totalDuration: z.number().int().min(0),
  lastPosition: z.number().min(0).max(1),
  timesWatched: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateVideoProgressSchema.parse(body);

    // Verify content item exists and is a video
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: validated.contentItemId },
      include: {
        course: {
          select: {
            id: true,
            enrollments: {
              where: { userId: user.id },
              select: { id: true },
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

    if (contentItem.type !== "VIDEO") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Content item is not a video" },
        { status: 400 }
      );
    }

    // Check if user is enrolled
    if (contentItem.course.enrollments.length === 0) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Get or create video progress
    const existingProgress = await prisma.videoProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId: user.id,
          contentItemId: validated.contentItemId,
        },
      },
    });

    const completionThreshold = contentItem.completionThreshold || 0.8;
    const completionPercentage = validated.totalDuration > 0
      ? validated.watchTime / validated.totalDuration
      : 0;
    const completed = completionPercentage >= completionThreshold;

    let videoProgress;
    if (existingProgress) {
      videoProgress = await prisma.videoProgress.update({
        where: { id: existingProgress.id },
        data: {
          watchTime: validated.watchTime,
          totalDuration: validated.totalDuration,
          lastPosition: validated.lastPosition,
          timesWatched: validated.timesWatched || existingProgress.timesWatched,
          completed,
          completedAt: completed && !existingProgress.completed ? new Date() : existingProgress.completedAt,
        },
      });
    } else {
      videoProgress = await prisma.videoProgress.create({
        data: {
          userId: user.id,
          contentItemId: validated.contentItemId,
          watchTime: validated.watchTime,
          totalDuration: validated.totalDuration,
          lastPosition: validated.lastPosition,
          timesWatched: validated.timesWatched || 0,
          completed,
          completedAt: completed ? new Date() : null,
        },
      });
    }

    // If completed, create or update completion record
    if (completed) {
      await prisma.completion.upsert({
        where: {
          userId_courseId_contentItemId: {
            userId: user.id,
            courseId: contentItem.courseId,
            contentItemId: validated.contentItemId,
          },
        },
        update: {
          completed: true,
          completedAt: new Date(),
        },
        create: {
          userId: user.id,
          courseId: contentItem.courseId,
          contentItemId: validated.contentItemId,
          completed: true,
          completedAt: new Date(),
        },
      });

      // Check if next content should be unlocked
      const nextContent = await prisma.contentItem.findFirst({
        where: {
          courseId: contentItem.courseId,
          order: { gt: contentItem.order },
        },
        orderBy: { order: "asc" },
      });

      const unlockedNext = !!nextContent;

      return NextResponse.json({
        progress: {
          contentItemId: videoProgress.contentItemId,
          watchTime: videoProgress.watchTime,
          totalDuration: videoProgress.totalDuration,
          lastPosition: videoProgress.lastPosition,
          timesWatched: videoProgress.timesWatched,
          completed: videoProgress.completed,
          completionPercentage,
        },
        unlockedNext,
      });
    }

    return NextResponse.json({
      progress: {
        contentItemId: videoProgress.contentItemId,
        watchTime: videoProgress.watchTime,
        totalDuration: videoProgress.totalDuration,
        lastPosition: videoProgress.lastPosition,
        timesWatched: videoProgress.timesWatched,
        completed: videoProgress.completed,
        completionPercentage,
      },
      unlockedNext: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.issues.reduce((acc, err) => {
            acc[err.path.join(".")] = err.message;
            return acc;
          }, {} as Record<string, string>),
        },
        { status: 400 }
      );
    }

    console.error("Error updating video progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

