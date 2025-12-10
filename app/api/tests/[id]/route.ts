import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateTestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  passingScore: z.number().min(0).max(1).optional(),
  maxAttempts: z.number().int().positive().optional().nullable(),
  timeLimit: z.number().int().positive().optional().nullable(),
  showCorrectAnswers: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeAnswers: z.boolean().optional(),
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

    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        contentItem: {
          include: {
            course: {
              select: {
                id: true,
                enrollments: {
                  where: { userId: user.id },
                  select: { id: true },
                },
              },
            },
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

    // Check access - user must be enrolled or be instructor/admin
    const isAdmin = user.roles.includes("ADMIN");
    const isInstructor = user.roles.includes("INSTRUCTOR");
    const isEnrolled = test.contentItem.course.enrollments.length > 0;

    if (!isAdmin && !isInstructor && !isEnrolled) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You do not have access to this test" },
        { status: 403 }
      );
    }

    // For learners, hide correct answers if configured
    const isLearner = !isAdmin && !isInstructor;
    const shouldHideAnswers = isLearner && !test.showCorrectAnswers;

    const questions = test.questions.map((q) => {
      const question: any = {
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        points: q.points,
        order: q.order,
      };

      if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
        question.options = q.options.map((opt: any, index: number) => ({
          text: opt.text,
          ...(shouldHideAnswers ? {} : { correct: opt.correct }),
        }));
      }

      if (!shouldHideAnswers && q.explanation) {
        question.explanation = q.explanation;
      }

      return question;
    });

    return NextResponse.json({
      id: test.id,
      title: test.title,
      description: test.description,
      passingScore: test.passingScore,
      maxAttempts: test.maxAttempts,
      timeLimit: test.timeLimit,
      showCorrectAnswers: test.showCorrectAnswers,
      randomizeQuestions: test.randomizeQuestions,
      randomizeAnswers: test.randomizeAnswers,
      questions,
    });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Only instructor and admin can update tests
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
    const validated = updateTestSchema.parse(body);

    const updateData: any = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.passingScore !== undefined) updateData.passingScore = validated.passingScore;
    if (validated.maxAttempts !== undefined) updateData.maxAttempts = validated.maxAttempts;
    if (validated.timeLimit !== undefined) updateData.timeLimit = validated.timeLimit;
    if (validated.showCorrectAnswers !== undefined)
      updateData.showCorrectAnswers = validated.showCorrectAnswers;
    if (validated.randomizeQuestions !== undefined)
      updateData.randomizeQuestions = validated.randomizeQuestions;
    if (validated.randomizeAnswers !== undefined)
      updateData.randomizeAnswers = validated.randomizeAnswers;

    const updatedTest = await prisma.test.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      test: {
        id: updatedTest.id,
        title: updatedTest.title,
        updatedAt: updatedTest.updatedAt,
      },
    });
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

    console.error("Error updating test:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

