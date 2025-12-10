import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const submitTestSchema = z.object({
  testId: z.string().min(1, "Test ID is required"),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answerText: z.string().optional(),
      selectedOptions: z.array(z.number()).optional(),
    })
  ),
  timeSpent: z.number().int().min(0),
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

    const body = await request.json();
    const validated = submitTestSchema.parse(body);

    // Get test with questions
    const test = await prisma.test.findUnique({
      where: { id: validated.testId },
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

    // Check if user is enrolled
    if (test.contentItem.course.enrollments.length === 0) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check max attempts
    const attemptCount = await prisma.testAttempt.count({
      where: {
        testId: validated.testId,
        userId: user.id,
      },
    });

    if (test.maxAttempts && attemptCount >= test.maxAttempts) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Maximum attempts reached" },
        { status: 403 }
      );
    }

    // Grade the test
    let totalPoints = 0;
    let pointsEarned = 0;
    const gradedAnswers: Array<{
      questionId: string;
      isCorrect: boolean;
      pointsEarned: number;
      correctAnswer?: string;
    }> = [];

    for (const question of test.questions) {
      totalPoints += question.points;
      const userAnswer = validated.answers.find((a) => a.questionId === question.id);
      let isCorrect = false;
      let earnedPoints = 0;

      if (question.type === "SINGLE_CHOICE") {
        const correctIndex = question.options.findIndex((opt: any) => opt.correct);
        isCorrect =
          userAnswer?.selectedOptions?.[0] === correctIndex && correctIndex !== -1;
        earnedPoints = isCorrect ? question.points : 0;
        gradedAnswers.push({
          questionId: question.id,
          isCorrect,
          pointsEarned: earnedPoints,
          correctAnswer: question.options[correctIndex]?.text,
        });
      } else if (question.type === "MULTIPLE_CHOICE") {
        const correctIndices = question.options
          .map((opt: any, idx: number) => (opt.correct ? idx : -1))
          .filter((idx: number) => idx !== -1)
          .sort();
        const selectedIndices = (userAnswer?.selectedOptions || []).sort();
        isCorrect =
          correctIndices.length === selectedIndices.length &&
          correctIndices.every((val: number, idx: number) => val === selectedIndices[idx]);
        earnedPoints = isCorrect ? question.points : 0;
        gradedAnswers.push({
          questionId: question.id,
          isCorrect,
          pointsEarned: earnedPoints,
          correctAnswer: question.options
            .filter((opt: any) => opt.correct)
            .map((opt: any) => opt.text)
            .join(", "),
        });
      } else if (question.type === "TRUE_FALSE") {
        const correctAnswer = question.correctAnswer?.toLowerCase().trim();
        const userAnswerText = userAnswer?.answerText?.toLowerCase().trim();
        isCorrect = correctAnswer === userAnswerText;
        earnedPoints = isCorrect ? question.points : 0;
        gradedAnswers.push({
          questionId: question.id,
          isCorrect,
          pointsEarned: earnedPoints,
          correctAnswer: question.correctAnswer || "",
        });
      } else if (question.type === "SHORT_ANSWER" || question.type === "FILL_BLANK") {
        const correctAnswer = question.correctAnswer?.toLowerCase().trim();
        const userAnswerText = userAnswer?.answerText?.toLowerCase().trim();
        // Simple exact match - could be enhanced with fuzzy matching
        isCorrect = correctAnswer === userAnswerText;
        earnedPoints = isCorrect ? question.points : 0;
        gradedAnswers.push({
          questionId: question.id,
          isCorrect,
          pointsEarned: earnedPoints,
          correctAnswer: question.correctAnswer || "",
        });
      } else {
        // No answer provided
        gradedAnswers.push({
          questionId: question.id,
          isCorrect: false,
          pointsEarned: 0,
        });
      }

      pointsEarned += earnedPoints;
    }

    const score = totalPoints > 0 ? pointsEarned / totalPoints : 0;
    const passed = score >= test.passingScore;

    // Create test attempt
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: validated.testId,
        userId: user.id,
        attemptNumber: attemptCount + 1,
        score,
        pointsEarned,
        totalPoints,
        passed,
        timeSpent: validated.timeSpent,
      },
    });

    // Create test answers
    await Promise.all(
      validated.answers.map((answer) =>
        prisma.testAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: answer.questionId,
            answerText: answer.answerText || null,
            selectedOptions: answer.selectedOptions || [],
          },
        })
      )
    );

    // If passed, create completion record
    if (passed) {
      const existingCompletion = await prisma.completion.findFirst({
        where: {
          userId: user.id,
          courseId: test.contentItem.courseId,
          contentItemId: test.contentItemId,
        },
      });

      if (existingCompletion) {
        await prisma.completion.update({
          where: { id: existingCompletion.id },
          data: {
            completedAt: new Date(),
            score: score,
          },
        });
      } else {
        await prisma.completion.create({
          data: {
            userId: user.id,
            courseId: test.contentItem.courseId,
            contentItemId: test.contentItemId,
            completedAt: new Date(),
            score: score,
          },
        });
      }
    }

    const remainingAttempts = test.maxAttempts
      ? Math.max(0, test.maxAttempts - attemptCount - 1)
      : null;

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        testId: attempt.testId,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        pointsEarned: attempt.pointsEarned,
        totalPoints: attempt.totalPoints,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        submittedAt: attempt.submittedAt,
      },
      answers: gradedAnswers,
      canRetake: remainingAttempts === null || remainingAttempts > 0,
      maxAttempts: test.maxAttempts,
      remainingAttempts,
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

    console.error("Error submitting test:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

