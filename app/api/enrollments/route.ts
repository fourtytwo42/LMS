import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createEnrollmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
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

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");
    const learningPlanId = searchParams.get("learningPlanId");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Non-admins can only see their own enrollments or enrollments for courses/plans they manage
    if (!user.roles.includes("ADMIN")) {
      if (user.roles.includes("INSTRUCTOR")) {
        // Instructors can see enrollments for courses/plans they created or are assigned to
        where.OR = [
          { userId: user.id }, // Their own enrollments
          {
            course: {
              OR: [
                { createdById: user.id },
                {
                  instructorAssignments: {
                    some: { userId: user.id },
                  },
                },
              ],
            },
          },
          {
            learningPlan: {
              OR: [
                { createdById: user.id },
                {
                  instructorAssignments: {
                    some: { userId: user.id },
                  },
                },
              ],
            },
          },
        ];
      } else {
        // Learners can only see their own enrollments
        where.userId = user.id;
      }
    }

    if (userId) {
      where.userId = userId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (learningPlanId) {
      where.learningPlanId = learningPlanId;
    }

    if (status) {
      where.status = status;
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              code: true,
            },
          },
          learningPlan: {
            select: {
              id: true,
              title: true,
              code: true,
            },
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    // Calculate progress for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        let progress = 0;
        let contentCount = 0;
        let completedCount = 0;

        if (enrollment.courseId) {
          // Calculate course progress
          const course = await prisma.course.findUnique({
            where: { id: enrollment.courseId },
            include: {
              contentItems: {
                select: { id: true },
              },
              _count: {
                select: {
                  contentItems: true,
                },
              },
            },
          });

          if (course) {
            contentCount = course._count.contentItems;
            const completions = await prisma.completion.count({
              where: {
                userId: enrollment.userId,
                courseId: enrollment.courseId,
                completed: true,
              },
            });
            completedCount = completions;
            progress = contentCount > 0 ? Math.round((completedCount / contentCount) * 100) : 0;
          }
        } else if (enrollment.learningPlanId) {
          // Calculate learning plan progress
          const plan = await prisma.learningPlan.findUnique({
            where: { id: enrollment.learningPlanId },
            include: {
              courses: {
                include: {
                  course: {
                    include: {
                      _count: {
                        select: { contentItems: true },
                      },
                    },
                  },
                },
              },
            },
          });

          if (plan) {
            let totalContent = 0;
            let totalCompleted = 0;

            for (const planCourse of plan.courses) {
              const courseContentCount = planCourse.course._count.contentItems;
              totalContent += courseContentCount;

              const completions = await prisma.completion.count({
                where: {
                  userId: enrollment.userId,
                  courseId: planCourse.courseId,
                  completed: true,
                },
              });
              totalCompleted += completions;
            }

            progress = totalContent > 0 ? Math.round((totalCompleted / totalContent) * 100) : 0;
          }
        }

        return {
          id: enrollment.id,
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          learningPlanId: enrollment.learningPlanId,
          status: enrollment.status,
          progress,
          enrolledAt: enrollment.enrolledAt,
          startedAt: enrollment.startedAt,
          dueDate: enrollment.dueDate,
          approvedAt: enrollment.approvedAt,
          course: enrollment.course,
          learningPlan: enrollment.learningPlan,
          user: enrollment.user,
        };
      })
    );

    return NextResponse.json({
      enrollments: enrollmentsWithProgress,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing enrollments:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only instructor and admin can create enrollments manually
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createEnrollmentSchema.parse(body);

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled
    if (validated.courseId) {
      const existing = await prisma.enrollment.findFirst({
        where: {
          userId: validated.userId,
          courseId: validated.courseId,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "CONFLICT", message: "User is already enrolled in this course" },
          { status: 409 }
        );
      }

      // Verify course exists
      const course = await prisma.course.findUnique({
        where: { id: validated.courseId },
      });

      if (!course) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Course not found" },
          { status: 404 }
        );
      }

      // Check permissions - instructor can only enroll in their own courses or assigned courses
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
    }

    if (validated.learningPlanId) {
      const existing = await prisma.enrollment.findFirst({
        where: {
          userId: validated.userId,
          learningPlanId: validated.learningPlanId,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "CONFLICT", message: "User is already enrolled in this learning plan" },
          { status: 409 }
        );
      }

      // Verify learning plan exists
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
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: validated.userId,
        courseId: validated.courseId || null,
        learningPlanId: validated.learningPlanId || null,
        status: "ENROLLED",
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        learningPlan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        enrollment: {
          id: enrollment.id,
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          learningPlanId: enrollment.learningPlanId,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
        },
      },
      { status: 201 }
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

    console.error("Error creating enrollment:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

