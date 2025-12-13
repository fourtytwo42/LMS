import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
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

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: id },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Get learning plans that contain this course
    const learningPlanCourses = await prisma.learningPlanCourse.findMany({
      where: { courseId: id },
      include: {
        learningPlan: {
          select: {
            id: true,
            title: true,
            status: true,
            coverImage: true,
          },
        },
      },
      orderBy: {
        learningPlan: {
          title: "asc",
        },
      },
    });

    const learningPlans = learningPlanCourses.map((lpc) => ({
      id: lpc.learningPlan.id,
      title: lpc.learningPlan.title,
      status: lpc.learningPlan.status,
      coverImage: lpc.learningPlan.coverImage,
      order: lpc.order,
    }));

    return NextResponse.json({ learningPlans });
  } catch (error) {
    console.error("Error fetching learning plans for course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

