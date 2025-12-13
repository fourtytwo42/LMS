import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const enrollUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["LEARNER", "INSTRUCTOR"]).default("LEARNER"),
  dueDate: z.string().datetime().optional(),
});

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

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: id },
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

    // Check permissions - only admins and instructors assigned to the learning plan can view enrollments
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = learningPlan.instructorAssignments.length > 0;
    const isCreator = learningPlan.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const skip = (page - 1) * limit;

    const where: any = {
      learningPlanId: id,
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
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
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
      }),
      prisma.enrollment.count({ where }),
    ]);

    // Check which users are instructors
    const instructorAssignments = await prisma.instructorAssignment.findMany({
      where: { learningPlanId: id },
      select: { userId: true },
    });
    const instructorUserIds = new Set(instructorAssignments.map((ia) => ia.userId));

    const enrollmentsWithRoles = enrollments.map((enrollment) => ({
      ...enrollment,
      user: {
        ...enrollment.user,
        isInstructor: instructorUserIds.has(enrollment.userId),
      },
    }));

    return NextResponse.json({
      enrollments: enrollmentsWithRoles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching learning plan enrollments:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: id },
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

    // Check permissions - only admins and instructors assigned to the learning plan can enroll users
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = learningPlan.instructorAssignments.length > 0;
    const isCreator = learningPlan.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = enrollUserSchema.parse(body);

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_learningPlanId: {
          userId: validated.userId,
          learningPlanId: id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "CONFLICT", message: "User is already enrolled in this learning plan" },
        { status: 409 }
      );
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: validated.userId,
        learningPlanId: id,
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
            avatar: true,
          },
        },
      },
    });

    // If enrolling as instructor, create instructor assignment for learning plan
    if (validated.role === "INSTRUCTOR") {
      // Check if instructor assignment already exists
      const existingAssignment = await prisma.instructorAssignment.findUnique({
        where: {
          userId_learningPlanId: {
            userId: validated.userId,
            learningPlanId: id,
          },
        },
      });

      if (!existingAssignment) {
        await prisma.instructorAssignment.create({
          data: {
            userId: validated.userId,
            learningPlanId: id,
            assignedById: user.id,
          },
        });

        // Also create instructor assignments for all courses in the learning plan
        for (const course of learningPlan.courses) {
          const existingCourseAssignment = await prisma.instructorAssignment.findUnique({
            where: {
              userId_courseId: {
                userId: validated.userId,
                courseId: course.courseId,
              },
            },
          });

          if (!existingCourseAssignment) {
            await prisma.instructorAssignment.create({
              data: {
                userId: validated.userId,
                courseId: course.courseId,
                assignedById: user.id,
              },
            });
          }
        }
      }
    }

    return NextResponse.json(
      {
        enrollment: {
          id: enrollment.id,
          userId: enrollment.userId,
          learningPlanId: enrollment.learningPlanId,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          user: enrollment.user,
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

    console.error("Error enrolling user in learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

