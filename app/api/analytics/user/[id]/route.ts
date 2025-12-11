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

    // Users can only view their own analytics unless admin
    if (!user.roles.includes("ADMIN") && user.id !== id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get user enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: id },
    });

    const enrollmentStats = {
      total: enrollments.length,
      completed: enrollments.filter((e) => e.status === "COMPLETED").length,
      inProgress: enrollments.filter((e) => e.status === "IN_PROGRESS").length,
      dropped: enrollments.filter((e) => e.status === "DROPPED").length,
    };

    // Get completions with scores
    const completions = await prisma.completion.findMany({
      where: {
        userId: id,
        score: { not: null },
      },
      select: { score: true },
    });

    const averageScore =
      completions.length > 0
        ? completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.length
        : 0;

    // Calculate total time spent (from video progress)
    const videoProgresses = await prisma.videoProgress.findMany({
      where: { userId: id },
      select: { watchTime: true },
    });

    const totalTimeSpent =
      videoProgresses.reduce((sum, vp) => sum + vp.watchTime, 0) / 60; // Convert to minutes

    // Get certificates earned
    const certificatesEarned = await prisma.completion.count({
      where: {
        userId: id,
        certificateUrl: { not: null },
      },
    });

    // Get badges earned
    const badgesEarned = await prisma.completion.count({
      where: {
        userId: id,
        badgeAwarded: true,
      },
    });

    // Get recent completions (filter out null completedAt in the query by ordering)
    const allCompletions = await prisma.completion.findMany({
      where: {
        userId: id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // Filter out completions without completedAt and take first 10
    const recentCompletions = allCompletions
      .filter((c) => c.completedAt !== null)
      .slice(0, 10);

    return NextResponse.json({
      userId: id,
      enrollments: enrollmentStats,
      averageScore: Math.round(averageScore * 100 * 10) / 10,
      totalTimeSpent: Math.round(totalTimeSpent),
      certificatesEarned,
      badgesEarned,
      recentCompletions: recentCompletions.map((c) => ({
        courseId: c.courseId,
        courseTitle: c.course?.title || "Unknown Course",
        completedAt: c.completedAt,
        score: c.score ? Math.round(c.score * 100 * 10) / 10 : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

