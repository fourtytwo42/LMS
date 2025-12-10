import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const reorderCoursesSchema = z.object({
  courseOrders: z.array(
    z.object({
      courseId: z.string().min(1, "Course ID is required"),
      order: z.number().int().min(0, "Order must be non-negative"),
    })
  ),
});

export async function PUT(
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

    // Only instructors and admins can reorder courses
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = reorderCoursesSchema.parse(body);

    // Check learning plan access
    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: params.id },
      include: {
        instructorAssignments: {
          where: { userId: user.id },
        },
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    const hasPermission =
      learningPlan.createdById === user.id ||
      learningPlan.instructorAssignments.length > 0 ||
      user.roles.includes("ADMIN");

    if (!hasPermission) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Update course orders
    await Promise.all(
      validated.courseOrders.map(({ courseId, order }) =>
        prisma.learningPlanCourse.updateMany({
          where: {
            learningPlanId: params.id,
            courseId,
          },
          data: {
            order,
          },
        })
      )
    );

    return NextResponse.json({
      message: "Courses reordered successfully",
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

    console.error("Error reordering courses:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

