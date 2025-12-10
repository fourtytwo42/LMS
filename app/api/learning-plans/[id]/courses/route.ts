import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const addCourseSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  order: z.number().int().min(0),
});

const reorderCoursesSchema = z.object({
  courseOrders: z.array(
    z.object({
      courseId: z.string(),
      order: z.number().int().min(0),
    })
  ),
});

export async function POST(
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

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: params.id },
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

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = addCourseSchema.parse(body);

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: validated.courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check if course is already in the plan
    const existing = await prisma.learningPlanCourse.findUnique({
      where: {
        learningPlanId_courseId: {
          learningPlanId: params.id,
          courseId: validated.courseId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "Course is already in this learning plan",
        },
        { status: 409 }
      );
    }

    await prisma.learningPlanCourse.create({
      data: {
        learningPlanId: params.id,
        courseId: validated.courseId,
        order: validated.order,
      },
    });

    return NextResponse.json({ message: "Course added to learning plan" });
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

    console.error("Error adding course to learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

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

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: params.id },
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

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = reorderCoursesSchema.parse(body);

    // Update all course orders in a transaction
    await prisma.$transaction(
      validated.courseOrders.map((co) =>
        prisma.learningPlanCourse.updateMany({
          where: {
            learningPlanId: params.id,
            courseId: co.courseId,
          },
          data: {
            order: co.order,
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

