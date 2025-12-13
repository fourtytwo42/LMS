import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { isLearningPlanInstructor } from "@/lib/auth/permissions";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  courseIds: z.array(z.string()).min(1, "At least one course ID is required"),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: learningPlanId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: learningPlanId },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = learningPlan.createdById === user.id;
    const hasInstructorAccess = await isLearningPlanInstructor(user.id, learningPlanId);

    if (!isAdmin && !isCreator && !hasInstructorAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkDeleteSchema.parse(body);

    const results = {
      deleted: 0,
      failed: 0,
      errors: [] as Array<{ courseId: string; error: string }>,
    };

    for (const courseId of validated.courseIds) {
      try {
        await prisma.learningPlanCourse.delete({
          where: {
            learningPlanId_courseId: {
              learningPlanId,
              courseId,
            },
          },
        });

        results.deleted++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          courseId,
          error: error.message || "Failed to remove course from learning plan",
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

    console.error("Error in bulk delete courses from learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

