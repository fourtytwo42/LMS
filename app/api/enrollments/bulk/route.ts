import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkEnrollSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  courseId: z.string().optional(),
  learningPlanId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
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

    // Only instructor and admin can do bulk enrollment
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkEnrollSchema.parse(body);

    const results = {
      enrolled: 0,
      failed: 0,
      enrollments: [] as Array<{ id: string; userId: string }>,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    if (validated.courseId) {
      // Verify course exists and check permissions
      const course = await prisma.course.findUnique({
        where: { id: validated.courseId },
      });

      if (!course) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Course not found" },
          { status: 404 }
        );
      }

      // Check permissions
      if (!user.roles.includes("ADMIN")) {
        const isCreator = course.createdById === user.id;
        const isAssigned = await prisma.instructorAssignment.findFirst({
          where: {
            courseId: validated.courseId,
            userId: user.id,
          },
        });

        if (!isCreator && !isAssigned) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "Insufficient permissions for this course" },
            { status: 403 }
          );
        }
      }

      // Process each user
      for (const userId of validated.userIds) {
        try {
          // Check if user exists
          const targetUser = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (!targetUser) {
            results.failed++;
            results.errors.push({ userId, error: "User not found" });
            continue;
          }

          // Check if already enrolled
          const existing = await prisma.enrollment.findFirst({
            where: {
              userId,
              courseId: validated.courseId,
            },
          });

          if (existing) {
            results.failed++;
            results.errors.push({ userId, error: "Already enrolled" });
            continue;
          }

          // Create enrollment
          const enrollment = await prisma.enrollment.create({
            data: {
              userId,
              courseId: validated.courseId,
              status: "ENROLLED",
              dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
              approvedById: user.id,
              approvedAt: new Date(),
            },
          });

          results.enrolled++;
          results.enrollments.push({ id: enrollment.id, userId });
        } catch (error: any) {
          results.failed++;
          results.errors.push({ userId, error: error.message || "Failed to enroll" });
        }
      }
    }

    if (validated.learningPlanId) {
      // Verify learning plan exists and check permissions
      const learningPlan = await prisma.learningPlan.findUnique({
        where: { id: validated.learningPlanId },
      });

      if (!learningPlan) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Learning plan not found" },
          { status: 404 }
        );
      }

      // Check permissions
      if (!user.roles.includes("ADMIN")) {
        const isCreator = learningPlan.createdById === user.id;
        const isAssigned = await prisma.instructorAssignment.findFirst({
          where: {
            learningPlanId: validated.learningPlanId,
            userId: user.id,
          },
        });

        if (!isCreator && !isAssigned) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "Insufficient permissions for this learning plan" },
            { status: 403 }
          );
        }
      }

      // Process each user
      for (const userId of validated.userIds) {
        try {
          // Check if user exists
          const targetUser = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (!targetUser) {
            results.failed++;
            results.errors.push({ userId, error: "User not found" });
            continue;
          }

          // Check if already enrolled
          const existing = await prisma.enrollment.findFirst({
            where: {
              userId,
              learningPlanId: validated.learningPlanId,
            },
          });

          if (existing) {
            results.failed++;
            results.errors.push({ userId, error: "Already enrolled" });
            continue;
          }

          // Create enrollment
          const enrollment = await prisma.enrollment.create({
            data: {
              userId,
              learningPlanId: validated.learningPlanId,
              status: "ENROLLED",
              dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
              approvedById: user.id,
              approvedAt: new Date(),
            },
          });

          results.enrolled++;
          results.enrollments.push({ id: enrollment.id, userId });
        } catch (error: any) {
          results.failed++;
          results.errors.push({ userId, error: error.message || "Failed to enroll" });
        }
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

    console.error("Error during bulk enrollment:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

