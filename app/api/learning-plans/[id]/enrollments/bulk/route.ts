import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { isLearningPlanInstructor } from "@/lib/auth/permissions";
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
    const { id: learningPlanId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: learningPlanId },
      include: {
        instructorAssignments: {
          where: { userId: user.id },
        },
        courses: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = learningPlan.instructorAssignments.length > 0;
    const isCreator = learningPlan.createdById === user.id;
    const hasInstructorAccess = await isLearningPlanInstructor(user.id, learningPlanId);

    if (!isAdmin && !isAssignedInstructor && !isCreator && !hasInstructorAccess) {
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
            userId_learningPlanId: {
              userId: userId,
              learningPlanId: learningPlanId,
            },
          },
        });

        if (existingEnrollment) {
          results.failed++;
          results.errors.push({
            userId,
            error: "User is already enrolled in this learning plan",
          });
          continue;
        }

        // Create enrollment
        await prisma.enrollment.create({
          data: {
            userId: userId,
            learningPlanId: learningPlanId,
            status: "ENROLLED",
            dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
            approvedById: user.id,
            approvedAt: new Date(),
          },
        });

        // If enrolling as instructor, create instructor assignments for all courses in the learning plan
        if (validated.role === "INSTRUCTOR") {
          // Create instructor assignment for learning plan
          await prisma.instructorAssignment.upsert({
            where: {
              userId_learningPlanId: {
                userId: userId,
                learningPlanId: learningPlanId,
              },
            },
            create: {
              userId: userId,
              learningPlanId: learningPlanId,
            },
            update: {},
          });

          // Create instructor assignments for all courses in the learning plan
          for (const courseRelation of learningPlan.courses) {
            await prisma.instructorAssignment.upsert({
              where: {
                userId_courseId: {
                  userId: userId,
                  courseId: courseRelation.courseId,
                },
              },
              create: {
                userId: userId,
                courseId: courseRelation.courseId,
              },
              update: {},
            });
          }
        }
        // If enrolling as learner, add to "Public" group if self-enrolling (but this is bulk, so skip)
        // The auto-group assignment is only for self-enrollment

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

    console.error("Error in bulk enroll users to learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

