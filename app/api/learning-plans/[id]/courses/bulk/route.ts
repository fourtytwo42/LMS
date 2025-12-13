import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { isLearningPlanInstructor } from "@/lib/auth/permissions";
import { z } from "zod";

const bulkAssignSchema = z.object({
  courseIds: z.array(z.string()).min(1, "At least one course ID is required"),
});

export async function POST(
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
    const validated = bulkAssignSchema.parse(body);

    // Get current max order in learning plan
    const maxOrder = await prisma.learningPlanCourse.aggregate({
      where: { learningPlanId },
      _max: { order: true },
    });

    let currentOrder = (maxOrder._max.order ?? -1) + 1;

    const results = {
      assigned: 0,
      failed: 0,
      errors: [] as Array<{ courseId: string; error: string }>,
    };

    for (const courseId of validated.courseIds) {
      try {
        // Check if course exists
        const course = await prisma.course.findUnique({
          where: { id: courseId },
        });

        if (!course) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Course not found",
          });
          continue;
        }

        // Check if course is already in learning plan
        const existing = await prisma.learningPlanCourse.findFirst({
          where: {
            learningPlanId,
            courseId,
          },
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Course already in learning plan",
          });
          continue;
        }

        await prisma.learningPlanCourse.create({
          data: {
            learningPlanId,
            courseId,
            order: currentOrder++,
          },
        });

        results.assigned++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          courseId,
          error: error.message || "Failed to assign course",
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

    console.error("Error in bulk assign courses to learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

