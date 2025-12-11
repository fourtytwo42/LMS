import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await authenticate(request);
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json(
          { error: error.errorCode || "UNAUTHORIZED", message: error.message || "Authentication required" },
          { status: error.statusCode || 401 }
        );
      }
      throw error;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: id },
      include: {
        course: {
          select: {
            id: true,
            createdById: true,
            instructorAssignments: {
              select: { userId: true },
            },
            maxEnrollments: true,
          },
        },
        learningPlan: {
          select: {
            id: true,
            createdById: true,
            instructorAssignments: {
              select: { userId: true },
            },
            maxEnrollments: true,
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

    if (enrollment.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Enrollment is not pending approval" },
        { status: 400 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
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

    if (!isAdmin && !isInstructor) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check enrollment limits
    if (enrollment.courseId && enrollment.course?.maxEnrollments) {
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          courseId: enrollment.courseId,
          status: { in: ["ENROLLED", "IN_PROGRESS"] },
        },
      });

      if (enrollmentCount >= enrollment.course.maxEnrollments) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Enrollment limit reached for this course" },
          { status: 403 }
        );
      }
    }

    if (enrollment.learningPlanId && enrollment.learningPlan?.maxEnrollments) {
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          learningPlanId: enrollment.learningPlanId,
          status: { in: ["ENROLLED", "IN_PROGRESS"] },
        },
      });

      if (enrollmentCount >= enrollment.learningPlan.maxEnrollments) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Enrollment limit reached for this learning plan" },
          { status: 403 }
        );
      }
    }

    // Approve enrollment
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: id },
      data: {
        status: "ENROLLED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({
      enrollment: {
        id: updatedEnrollment.id,
        status: updatedEnrollment.status,
        approvedAt: updatedEnrollment.approvedAt,
      },
    });
  } catch (error) {
    console.error("Error approving enrollment:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

