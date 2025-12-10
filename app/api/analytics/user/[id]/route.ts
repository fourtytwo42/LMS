import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Users can only view their own analytics unless admin
    if (!user.roles.includes("ADMIN") && user.id !== params.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get user enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: params.id },
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
        userId: params.id,
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
      where: { userId: params.id },
      select: { watchTime: true },
    });

    const totalTimeSpent =
      videoProgresses.reduce((sum, vp) => sum + vp.watchTime, 0) / 60; // Convert to minutes

    // Get certificates earned
    const certificatesEarned = await prisma.completion.count({
      where: {
        userId: params.id,
        certificateUrl: { not: null },
      },
    });

    // Get badges earned
    const badgesEarned = await prisma.completion.count({
      where: {
        userId: params.id,
        badgeAwarded: true,
      },
    });

    // Get recent completions
    const recentCompletions = await prisma.completion.findMany({
      where: {
        userId: params.id,
        completedAt: { not: null },
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
      take: 10,
    });

    return NextResponse.json({
      userId: params.id,
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

