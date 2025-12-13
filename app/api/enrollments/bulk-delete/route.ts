import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  enrollmentIds: z.array(z.string()).min(1, "At least one enrollment ID is required"),
});

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin and instructors can delete enrollments
    if (!user.roles.includes("ADMIN") && !user.roles.includes("INSTRUCTOR")) {
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
      errors: [] as Array<{ enrollmentId: string; error: string }>,
    };

    for (const enrollmentId of validated.enrollmentIds) {
      try {
        // Check permissions for each enrollment
        const enrollment = await prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            course: {
              select: {
                id: true,
                createdById: true,
                instructorAssignments: {
                  select: { userId: true },
                },
              },
            },
            learningPlan: {
              select: {
                id: true,
                createdById: true,
                instructorAssignments: {
                  select: { userId: true },
                },
              },
            },
          },
        });

        if (!enrollment) {
          results.failed++;
          results.errors.push({
            enrollmentId,
            error: "Enrollment not found",
          });
          continue;
        }

        // Check permissions
        const isAdmin = user.roles.includes("ADMIN");
        const isSelf = enrollment.userId === user.id;
        let isInstructor = false;

        if (enrollment.courseId && enrollment.course) {
          const isCreator = enrollment.course.createdById === user.id;
          const isAssigned = enrollment.course.instructorAssignments.some(
            (ia) => ia.userId === user.id
          );
          isInstructor = isCreator || isAssigned;
        }

        if (enrollment.learningPlanId && enrollment.learningPlan) {
          const isCreator = enrollment.learningPlan.createdById === user.id;
          const isAssigned = enrollment.learningPlan.instructorAssignments.some(
            (ia) => ia.userId === user.id
          );
          isInstructor = isCreator || isAssigned;
        }

        if (!isAdmin && !isSelf && !isInstructor) {
          results.failed++;
          results.errors.push({
            enrollmentId,
            error: "Insufficient permissions",
          });
          continue;
        }

        await prisma.enrollment.delete({
          where: { id: enrollmentId },
        });

        results.deleted++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          enrollmentId,
          error: error.message || "Failed to delete enrollment",
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

    console.error("Error in bulk delete enrollments:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

