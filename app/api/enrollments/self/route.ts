import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const selfEnrollSchema = z.object({
  courseId: z.string().optional(),
  learningPlanId: z.string().optional(),
}).refine(
  (data) => data.courseId || data.learningPlanId,
  {
    message: "Either courseId or learningPlanId is required",
    path: ["courseId"],
  }
);

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = selfEnrollSchema.parse(body);

    if (validated.courseId) {
      // Check if already enrolled
      const existing = await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          courseId: validated.courseId,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "CONFLICT", message: "You are already enrolled in this course" },
          { status: 409 }
        );
      }

      // Get course details
      const course = await prisma.course.findUnique({
        where: { id: validated.courseId },
      });

      if (!course) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Course not found" },
          { status: 404 }
        );
      }

      // Check if self-enrollment is allowed
      if (!course.selfEnrollment) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "Self-enrollment is not available for this course" },
          { status: 400 }
        );
      }

      // Check if course is published
      if (course.status !== "PUBLISHED") {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "Course is not available for enrollment" },
          { status: 400 }
        );
      }

      // Check enrollment limit
      if (course.maxEnrollments) {
        const enrollmentCount = await prisma.enrollment.count({
          where: {
            courseId: validated.courseId,
            status: { in: ["ENROLLED", "IN_PROGRESS"] },
          },
        });

        if (enrollmentCount >= course.maxEnrollments) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "Enrollment limit reached for this course" },
            { status: 403 }
          );
        }
      }

      // Check access permissions
      if (!course.publicAccess) {
        // Check if user has access through group
        const hasGroupAccess = await prisma.courseGroupAccess.findFirst({
          where: {
            courseId: validated.courseId,
            group: {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          },
        });

        if (!hasGroupAccess) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "You do not have access to this course" },
            { status: 403 }
          );
        }
      }

      // Find or create Public group for self-enrolled users
      let publicGroup = await prisma.group.findFirst({
        where: { name: "Public", type: "PUBLIC" },
      });

      if (!publicGroup) {
        publicGroup = await prisma.group.create({
          data: {
            name: "Public",
            type: "PUBLIC",
            description: "Public group for self-enrolled users",
          },
        });
      }

      // Add user to Public group if not already a member
      const existingMembership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: publicGroup.id,
          },
        },
      });

      if (!existingMembership) {
        await prisma.groupMember.create({
          data: {
            userId: user.id,
            groupId: publicGroup.id,
          },
        });
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: validated.courseId,
          status: course.requiresApproval ? "PENDING_APPROVAL" : "ENROLLED",
        },
      });

      return NextResponse.json(
        {
          enrollment: {
            id: enrollment.id,
            status: enrollment.status,
            requiresApproval: course.requiresApproval,
            message: course.requiresApproval
              ? "Enrollment request submitted. Waiting for approval."
              : "Successfully enrolled",
          },
        },
        { status: 201 }
      );
    }

    if (validated.learningPlanId) {
      // Check if already enrolled
      const existing = await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          learningPlanId: validated.learningPlanId,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "CONFLICT", message: "You are already enrolled in this learning plan" },
          { status: 409 }
        );
      }

      // Get learning plan details
      const learningPlan = await prisma.learningPlan.findUnique({
        where: { id: validated.learningPlanId },
      });

      if (!learningPlan) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Learning plan not found" },
          { status: 404 }
        );
      }

      // Check if self-enrollment is allowed
      if (!learningPlan.selfEnrollment) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "Self-enrollment is not available for this learning plan" },
          { status: 400 }
        );
      }

      // Check if learning plan is published
      if (learningPlan.status !== "PUBLISHED") {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "Learning plan is not available for enrollment" },
          { status: 400 }
        );
      }

      // Check enrollment limit
      if (learningPlan.maxEnrollments) {
        const enrollmentCount = await prisma.enrollment.count({
          where: {
            learningPlanId: validated.learningPlanId,
            status: { in: ["ENROLLED", "IN_PROGRESS"] },
          },
        });

        if (enrollmentCount >= learningPlan.maxEnrollments) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "Enrollment limit reached for this learning plan" },
            { status: 403 }
          );
        }
      }

      // Check access permissions
      if (!learningPlan.publicAccess) {
        // Check if user has access through group
        const hasGroupAccess = await prisma.learningPlanGroupAccess.findFirst({
          where: {
            learningPlanId: validated.learningPlanId,
            group: {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          },
        });

        if (!hasGroupAccess) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "You do not have access to this learning plan" },
            { status: 403 }
          );
        }
      }

      // Find or create Public group for self-enrolled users
      let publicGroup = await prisma.group.findFirst({
        where: { name: "Public", type: "PUBLIC" },
      });

      if (!publicGroup) {
        publicGroup = await prisma.group.create({
          data: {
            name: "Public",
            type: "PUBLIC",
            description: "Public group for self-enrolled users",
          },
        });
      }

      // Add user to Public group if not already a member
      const existingMembership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: publicGroup.id,
          },
        },
      });

      if (!existingMembership) {
        await prisma.groupMember.create({
          data: {
            userId: user.id,
            groupId: publicGroup.id,
          },
        });
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          learningPlanId: validated.learningPlanId,
          status: learningPlan.requiresApproval ? "PENDING_APPROVAL" : "ENROLLED",
        },
      });

      return NextResponse.json(
        {
          enrollment: {
            id: enrollment.id,
            status: enrollment.status,
            requiresApproval: learningPlan.requiresApproval,
            message: learningPlan.requiresApproval
              ? "Enrollment request submitted. Waiting for approval."
              : "Successfully enrolled",
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Either courseId or learningPlanId is required" },
      { status: 400 }
    );
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

    console.error("Error creating self-enrollment:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

