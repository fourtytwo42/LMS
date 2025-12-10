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

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
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

