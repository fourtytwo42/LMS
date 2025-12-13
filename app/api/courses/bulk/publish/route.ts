import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkPublishSchema = z.object({
  courseIds: z.array(z.string()).min(1, "At least one course ID is required"),
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
      errors: [] as Array<{ courseId: string; error: string }>,
    };

    for (const courseId of validated.courseIds) {
      try {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: {
            instructorAssignments: {
              select: { userId: true },
            },
          },
        });

        if (!course) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Course not found",
          });
          continue;
        }

        // Check permissions
        const isAssignedInstructor = course.instructorAssignments.some(
          (ia) => ia.userId === user.id
        );
        const isCreator = course.createdById === user.id;

        if (!isAdmin && !isAssignedInstructor && !isCreator) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Insufficient permissions",
          });
          continue;
        }

        // Only publish if status is DRAFT
        if (course.status !== "DRAFT") {
          results.failed++;
          results.errors.push({
            courseId,
            error: `Course is not in DRAFT status (current: ${course.status})`,
          });
          continue;
        }

        await prisma.course.update({
          where: { id: courseId },
          data: { status: "PUBLISHED" },
        });

        results.published++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          courseId,
          error: error.message || "Failed to publish course",
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

    console.error("Error in bulk publish courses:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

