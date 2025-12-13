import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { isLearningPlanInstructor } from "@/lib/auth/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: id },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check permissions - only admins and instructors can publish
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = learningPlan.createdById === user.id;
    const hasInstructorAccess = await isLearningPlanInstructor(user.id, id);

    if (!isAdmin && !isCreator && !hasInstructorAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Only allow publishing if status is DRAFT
    if (learningPlan.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: `Cannot publish learning plan with status: ${learningPlan.status}. Only DRAFT plans can be published.`,
        },
        { status: 400 }
      );
    }

    // Update status to PUBLISHED
    const updatedPlan = await prisma.learningPlan.update({
      where: { id: id },
      data: { status: "PUBLISHED" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Learning plan published successfully",
      learningPlan: {
        id: updatedPlan.id,
        title: updatedPlan.title,
        status: updatedPlan.status,
        category: updatedPlan.category,
        updatedAt: updatedPlan.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error publishing learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

