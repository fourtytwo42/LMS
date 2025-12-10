import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function DELETE(
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

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.id },
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
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Enrollment not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.enrollment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Enrollment removed successfully",
    });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

