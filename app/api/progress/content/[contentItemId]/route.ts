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

    // Check enrollment
    if (contentItem.course.enrollments.length === 0) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
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

      if (!videoProgress) {
        return NextResponse.json({
          contentItemId,
          progress: 0,
          completed: false,
          lastPage: null,
          lastPosition: 0,
        });
      }

      return NextResponse.json({
        contentItemId,
        progress: videoProgress.totalDuration > 0 
          ? (videoProgress.watchTime / videoProgress.totalDuration) 
          : 0,
        completed: videoProgress.completed,
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

