import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkDeleteSchema = z.object({
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

    // Only admin can delete courses in bulk
    if (!user.roles.includes("ADMIN")) {
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
        // Check if course has active enrollments
        const enrollments = await prisma.enrollment.findMany({
          where: {
            courseId,
            status: "IN_PROGRESS",
          },
        });

        if (enrollments.length > 0) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Course has active enrollments",
          });
          continue;
        }

        await prisma.course.delete({
          where: { id: courseId },
        });

        results.deleted++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          courseId,
          error: error.message || "Failed to delete course",
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

    console.error("Error in bulk delete courses:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

