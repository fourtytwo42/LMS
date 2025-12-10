import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createQuestionSchema = z.object({
  type: z.enum([
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "FILL_BLANK",
  ]),
  questionText: z.string().min(1, "Question text is required"),
  points: z.number().int().positive().default(10),
  options: z
    .array(
      z.object({
        text: z.string(),
        correct: z.boolean(),
      })
    )
    .optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
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

    // Only instructor and admin can view questions for editing
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        contentItem: {
          include: {
            course: true,
          },
        },
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Test not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = test.contentItem.course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: test.contentItem.courseId,
        userId: user.id,
      },
    });

    if (!isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const questions = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      points: q.points,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      order: q.order,
    }));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching test questions:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Only instructor and admin can add questions
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        contentItem: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Test not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = test.contentItem.course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: test.contentItem.courseId,
        userId: user.id,
      },
    });

    if (!isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createQuestionSchema.parse(body);

    // Validate question type requirements
    if (
      (validated.type === "SINGLE_CHOICE" || validated.type === "MULTIPLE_CHOICE") &&
      (!validated.options || validated.options.length < 2)
    ) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Multiple choice questions require at least 2 options" },
        { status: 400 }
      );
    }

    if (
      (validated.type === "SHORT_ANSWER" || validated.type === "FILL_BLANK") &&
      !validated.correctAnswer
    ) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Short answer and fill blank questions require a correct answer" },
        { status: 400 }
      );
    }

    // Get max order to set default
    const maxOrder = await prisma.question.findFirst({
      where: { testId: params.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const question = await prisma.question.create({
      data: {
        testId: params.id,
        type: validated.type,
        questionText: validated.questionText,
        points: validated.points,
        options: validated.options || [],
        correctAnswer: validated.correctAnswer || null,
        explanation: validated.explanation || null,
        order: validated.order ?? (maxOrder ? maxOrder.order + 1 : 0),
      },
    });

    return NextResponse.json(
      {
        question: {
          id: question.id,
          questionText: question.questionText,
          createdAt: question.createdAt,
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

    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

