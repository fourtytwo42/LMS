import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: { contentItemId: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const videoProgress = await prisma.videoProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId: user.id,
          contentItemId: params.contentItemId,
        },
      },
    });

    if (!videoProgress) {
      return NextResponse.json({
        contentItemId: params.contentItemId,
        watchTime: 0,
        totalDuration: 0,
        lastPosition: 0,
        timesWatched: 0,
        completed: false,
        completedAt: null,
      });
    }

    return NextResponse.json({
      contentItemId: videoProgress.contentItemId,
      watchTime: videoProgress.watchTime,
      totalDuration: videoProgress.totalDuration,
      lastPosition: videoProgress.lastPosition,
      timesWatched: videoProgress.timesWatched,
      completed: videoProgress.completed,
      completedAt: videoProgress.completedAt,
    });
  } catch (error) {
    console.error("Error fetching video progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

