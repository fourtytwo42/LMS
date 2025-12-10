import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createTestSchema = z.object({
  contentItemId: z.string().min(1, "Content item ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  passingScore: z.number().min(0).max(1).default(0.7),
  maxAttempts: z.number().int().positive().optional().nullable(),
  timeLimit: z.number().int().positive().optional().nullable(),
  showCorrectAnswers: z.boolean().default(false),
  randomizeQuestions: z.boolean().default(false),
  randomizeAnswers: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause - users can see tests for courses they're enrolled in or manage
    const where: any = {};

    if (!user.roles.includes("ADMIN") && !user.roles.includes("INSTRUCTOR")) {
      // Learners can only see tests for courses they're enrolled in
      where.contentItem = {
        course: {
          enrollments: {
            some: {
              userId: user.id,
              status: { in: ["ENROLLED", "IN_PROGRESS", "COMPLETED"] },
            },
          },
        },
      };
    } else if (user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      // Instructors can see tests for courses they created or are assigned to
      where.contentItem = {
        course: {
          OR: [
            { createdById: user.id },
            {
              instructorAssignments: {
                some: {
                  userId: user.id,
                },
              },
            },
          ],
        },
      };
    }

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        skip,
        take: limit,
        include: {
          contentItem: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.test.count({ where }),
    ]);

    return NextResponse.json({
      tests: tests.map((test) => ({
        id: test.id,
        title: test.title,
        description: test.description,
        passingScore: test.passingScore,
        maxAttempts: test.maxAttempts,
        timeLimit: test.timeLimit,
        contentItem: test.contentItem,
        questionCount: test._count.questions,
        attemptCount: test._count.attempts,
        createdAt: test.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing tests:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Only instructor and admin can create tests
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createTestSchema.parse(body);

    // Verify content item exists and is a TEST type
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: validated.contentItemId },
      include: {
        course: true,
      },
    });

    if (!contentItem) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Content item not found" },
        { status: 404 }
      );
    }

    if (contentItem.type !== "TEST") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Content item must be of type TEST" },
        { status: 400 }
      );
    }

    // Check if test already exists for this content item
    const existingTest = await prisma.test.findUnique({
      where: { contentItemId: validated.contentItemId },
    });

    if (existingTest) {
      return NextResponse.json(
        { error: "CONFLICT", message: "Test already exists for this content item" },
        { status: 409 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = contentItem.course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: contentItem.courseId,
        userId: user.id,
      },
    });

    if (!isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions for this course" },
        { status: 403 }
      );
    }

    // Create test
    const test = await prisma.test.create({
      data: {
        contentItemId: validated.contentItemId,
        title: validated.title,
        description: validated.description,
        passingScore: validated.passingScore,
        maxAttempts: validated.maxAttempts,
        timeLimit: validated.timeLimit,
        showCorrectAnswers: validated.showCorrectAnswers,
        randomizeQuestions: validated.randomizeQuestions,
        randomizeAnswers: validated.randomizeAnswers,
      },
    });

    return NextResponse.json(
      {
        test: {
          id: test.id,
          title: test.title,
          createdAt: test.createdAt,
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

    console.error("Error creating test:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

