import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

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

    // Get content item to check course ID for completion records
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: { courseId: true },
    });

    const videoProgress = await prisma.videoProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId: user.id,
          contentItemId: contentItemId,
        },
      },
    });

    // Get completion record (completion records take precedence)
    let completion = null;
    if (contentItem) {
      completion = await prisma.completion.findFirst({
        where: {
          userId: user.id,
          courseId: contentItem.courseId,
          contentItemId: contentItemId,
        },
      });
    }

    if (!videoProgress) {
      return NextResponse.json({
        contentItemId: contentItemId,
        watchTime: 0,
        totalDuration: 0,
        lastPosition: 0,
        timesWatched: 0,
        completed: !!completion, // Mark completed if completion record exists
        completedAt: completion?.completedAt || null,
      });
    }

    // Completion record takes precedence over videoProgress.completed
    const isCompleted = !!completion || videoProgress.completed;

    return NextResponse.json({
      contentItemId: videoProgress.contentItemId,
      watchTime: videoProgress.watchTime,
      totalDuration: videoProgress.totalDuration,
      lastPosition: videoProgress.lastPosition,
      timesWatched: videoProgress.timesWatched,
      completed: isCompleted,
      completedAt: completion?.completedAt || videoProgress.completedAt,
    });
  } catch (error) {
    console.error("Error fetching video progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

