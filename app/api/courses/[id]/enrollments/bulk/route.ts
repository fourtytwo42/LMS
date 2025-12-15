import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkEnrollSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  role: z.enum(["LEARNER", "INSTRUCTOR"]).default("LEARNER"),
  dueDate: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructorAssignments: {
          where: { userId: user.id },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructorAssignments.length > 0;
    const isCreator = course.createdById === user.id;

    // Check if user is enrolled as instructor in a learning plan that contains this course
    let isLearningPlanInstructor = false;
    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      const learningPlanEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          learningPlan: {
            courses: {
              some: {
                courseId: courseId,
              },
            },
          },
        },
      });

      if (learningPlanEnrollment) {
        const instructorAssignment = await prisma.instructorAssignment.findFirst({
          where: {
            userId: user.id,
            learningPlanId: learningPlanEnrollment.learningPlanId,
          },
        });
        isLearningPlanInstructor = !!instructorAssignment;
      }
    }

    if (!isAdmin && !isAssignedInstructor && !isCreator && !isLearningPlanInstructor) {
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
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const userId of validated.userIds) {
      try {
        // Check if user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!targetUser) {
          results.failed++;
          results.errors.push({
            userId,
            error: "User not found",
          });
          continue;
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: userId,
              courseId: courseId,
            },
          },
        });

        if (existingEnrollment) {
          results.failed++;
          results.errors.push({
            userId,
            error: "User is already enrolled in this course",
          });
          continue;
        }

        // Create enrollment
        await prisma.enrollment.create({
          data: {
            userId: userId,
            courseId: courseId,
            status: "ENROLLED",
            dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });

        // If enrolling as instructor, create instructor assignment
        if (validated.role === "INSTRUCTOR") {
          await prisma.instructorAssignment.upsert({
            where: {
              userId_courseId: {
                userId: userId,
                courseId: courseId,
              },
            },
            create: {
              userId: userId,
              courseId: courseId,
              assignedById: user.id,
            },
            update: {},
          });
        }

        results.enrolled++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message || "Failed to enroll user",
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

    console.error("Error in bulk enroll users to course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

