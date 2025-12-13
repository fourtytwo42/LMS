import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { isLearningPlanInstructor } from "@/lib/auth/permissions";
import { z } from "zod";

const bulkPublishSchema = z.object({
  planIds: z.array(z.string()).min(1, "At least one learning plan ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const isAdmin = user.roles.includes("ADMIN");
    const isInstructor = user.roles.includes("INSTRUCTOR");

    if (!isAdmin && !isInstructor) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkPublishSchema.parse(body);

    const results = {
      published: 0,
      failed: 0,
      errors: [] as Array<{ planId: string; error: string }>,
    };

    for (const planId of validated.planIds) {
      try {
        const learningPlan = await prisma.learningPlan.findUnique({
          where: { id: planId },
        });

        if (!learningPlan) {
          results.failed++;
          results.errors.push({
            planId,
            error: "Learning plan not found",
          });
          continue;
        }

        // Check permissions
        const isCreator = learningPlan.createdById === user.id;
        const hasInstructorAccess = await isLearningPlanInstructor(user.id, planId);

        if (!isAdmin && !isCreator && !hasInstructorAccess) {
          results.failed++;
          results.errors.push({
            planId,
            error: "Insufficient permissions",
          });
          continue;
        }

        // Only publish if status is DRAFT
        if (learningPlan.status !== "DRAFT") {
          results.failed++;
          results.errors.push({
            planId,
            error: `Learning plan is not in DRAFT status (current: ${learningPlan.status})`,
          });
          continue;
        }

        await prisma.learningPlan.update({
          where: { id: planId },
          data: { status: "PUBLISHED" },
        });

        results.published++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          planId,
          error: error.message || "Failed to publish learning plan",
        });
      }
    }

    return NextResponse.json(results);
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

    console.error("Error in bulk publish learning plans:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

