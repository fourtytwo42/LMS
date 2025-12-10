import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");
    const learningPlanId = searchParams.get("learningPlanId");

    // Users can only view their own completions unless admin
    const isAdmin = user.roles.includes("ADMIN");
    const targetUserId = userId || user.id;

    if (!isAdmin && targetUserId !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const where: any = {
      userId: targetUserId,
    };

    if (courseId) {
      where.courseId = courseId;
    }

    if (learningPlanId) {
      where.learningPlanId = learningPlanId;
    }

    const completions = await prisma.completion.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        learningPlan: {
          select: {
            id: true,
            title: true,
            code: true,
            hasCertificate: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    return NextResponse.json({
      completions: completions.map((c) => ({
        id: c.id,
        userId: c.userId,
        courseId: c.courseId,
        learningPlanId: c.learningPlanId,
        completedAt: c.completedAt,
        score: c.score,
        certificateUrl: c.certificateUrl,
        certificateGeneratedAt: c.certificateGeneratedAt,
        badgeAwarded: c.badgeAwarded,
        badgeAwardedAt: c.badgeAwardedAt,
        course: c.course,
        learningPlan: c.learningPlan,
      })),
    });
  } catch (error) {
    console.error("Error fetching completions:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

