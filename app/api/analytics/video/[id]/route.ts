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

    // Get content item
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              where: { userId: user.id },
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

    // Check if it's a video
    if (contentItem.type !== "VIDEO") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Content item is not a video" },
        { status: 400 }
      );
    }

    // Check access
    const hasAccess =
      contentItem.course.createdById === user.id ||
      contentItem.course.instructorAssignments.length > 0 ||
      user.roles.includes("ADMIN");

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get video progress data
    const videoProgresses = await prisma.videoProgress.findMany({
      where: { contentItemId: id },
    });

    const totalViews = videoProgresses.length;
    const uniqueViewers = new Set(videoProgresses.map((vp) => vp.userId)).size;

    const averageWatchTime =
      totalViews > 0
        ? videoProgresses.reduce((sum, vp) => sum + vp.watchTime, 0) / totalViews
        : 0;

    // Calculate completion rate
    const completedViews = videoProgresses.filter((vp) => vp.completed).length;
    const completionRate =
      totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

    // Calculate average completion rate (watchTime / totalDuration)
    const averageCompletionRate =
      totalViews > 0
        ? videoProgresses
            .filter((vp) => vp.totalDuration > 0)
            .reduce(
              (sum, vp) => sum + (vp.watchTime / vp.totalDuration) * 100,
              0
            ) / videoProgresses.filter((vp) => vp.totalDuration > 0).length
        : 0;

    // Calculate drop-off points (simplified - group by time ranges)
    const dropOffPoints: Array<{ time: number; viewers: number }> = [];
    const timeRanges = [0, 30, 60, 120, 300, 600]; // seconds
    for (let i = 0; i < timeRanges.length - 1; i++) {
      const rangeStart = timeRanges[i];
      const rangeEnd = timeRanges[i + 1];
      const viewersInRange = videoProgresses.filter(
        (vp) => vp.watchTime >= rangeStart && vp.watchTime < rangeEnd && !vp.completed
      ).length;
      if (viewersInRange > 0) {
        dropOffPoints.push({
          time: rangeEnd,
          viewers: viewersInRange,
        });
      }
    }

    // Calculate watch time distribution
    const watchTimeDistribution = [
      { range: "0-25%", viewers: 0 },
      { range: "25-50%", viewers: 0 },
      { range: "50-75%", viewers: 0 },
      { range: "75-100%", viewers: 0 },
    ];

    videoProgresses.forEach((vp) => {
      if (vp.totalDuration > 0) {
        const percentage = (vp.watchTime / vp.totalDuration) * 100;
        if (percentage < 25) {
          watchTimeDistribution[0].viewers++;
        } else if (percentage < 50) {
          watchTimeDistribution[1].viewers++;
        } else if (percentage < 75) {
          watchTimeDistribution[2].viewers++;
        } else {
          watchTimeDistribution[3].viewers++;
        }
      }
    });

    return NextResponse.json({
      contentItemId: id,
      totalViews,
      uniqueViewers,
      averageWatchTime: Math.round(averageWatchTime),
      averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      dropOffPoints,
      watchTimeDistribution,
    });
  } catch (error) {
    console.error("Error fetching video analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

