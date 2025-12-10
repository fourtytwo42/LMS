import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: { contentItemId: string } }
) {
  try {
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

