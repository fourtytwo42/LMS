import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const addLearningPlansSchema = z.object({
  learningPlanIds: z.array(z.string()).min(1, "At least one learning plan ID is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can view group learning plans
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Group not found" },
        { status: 404 }
      );
    }

    const learningPlanAccesses = await prisma.learningPlanGroupAccess.findMany({
      where: { groupId },
      include: {
        learningPlan: {
          select: {
            id: true,
            title: true,
            shortDescription: true,
            coverImage: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      learningPlans: learningPlanAccesses.map((access) => ({
        id: access.learningPlan.id,
        title: access.learningPlan.title,
        shortDescription: access.learningPlan.shortDescription,
        coverImage: access.learningPlan.coverImage,
        status: access.learningPlan.status,
        addedAt: access.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching group learning plans:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can add learning plans to groups
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Group not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = addLearningPlansSchema.parse(body);

    const results = {
      added: 0,
      failed: 0,
      errors: [] as Array<{ learningPlanId: string; error: string }>,
    };

    for (const learningPlanId of validated.learningPlanIds) {
      try {
        // Check if learning plan exists
        const learningPlan = await prisma.learningPlan.findUnique({
          where: { id: learningPlanId },
        });

        if (!learningPlan) {
          results.failed++;
          results.errors.push({
            learningPlanId,
            error: "Learning plan not found",
          });
          continue;
        }

        // Check if access already exists
        const existingAccess = await prisma.learningPlanGroupAccess.findUnique({
          where: {
            learningPlanId_groupId: {
              learningPlanId,
              groupId,
            },
          },
        });

        if (existingAccess) {
          results.failed++;
          results.errors.push({
            learningPlanId,
            error: "Learning plan already has access",
          });
          continue;
        }

        // Create access
        await prisma.learningPlanGroupAccess.create({
          data: {
            learningPlanId,
            groupId,
          },
        });

        results.added++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          learningPlanId,
          error: error.message || "Failed to add learning plan",
        });
      }
    }

    return NextResponse.json({
      message: `Added ${results.added} learning plan(s) to group`,
      results,
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

    console.error("Error adding learning plans to group:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can remove learning plans from groups
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const learningPlanId = searchParams.get("learningPlanId");

    if (!learningPlanId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "learningPlanId is required" },
        { status: 400 }
      );
    }

    await prisma.learningPlanGroupAccess.delete({
      where: {
        learningPlanId_groupId: {
          learningPlanId,
          groupId,
        },
      },
    });

    return NextResponse.json({ message: "Learning plan removed from group" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan access not found" },
        { status: 404 }
      );
    }

    console.error("Error removing learning plan from group:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

