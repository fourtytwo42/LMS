import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

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
            course: true,
          },
        },
        questions: true,
        attempts: true,
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

    const totalAttempts = test.attempts.length;
    const passedAttempts = test.attempts.filter((a) => a.passed).length;
    const passRate =
      totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;

    const averageScore =
      totalAttempts > 0
        ? (test.attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts) * 100
        : 0;

    const averageTimeSpent =
      totalAttempts > 0
        ? test.attempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts / 60
        : 0;

    // Question performance
    const questionPerformance = await Promise.all(
      test.questions.map(async (question) => {
        const answers = await prisma.testAnswer.findMany({
          where: {
            questionId: question.id,
            attempt: {
              testId: params.id,
            },
          },
          include: {
            attempt: true,
          },
        });

        let correctAttempts = 0;
        for (const answer of answers) {
          let isCorrect = false;

          if (question.type === "SINGLE_CHOICE") {
            const correctIndex = question.options.findIndex((opt: any) => opt.correct);
            isCorrect = answer.selectedOptions[0] === correctIndex;
          } else if (question.type === "MULTIPLE_CHOICE") {
            const correctIndices = question.options
              .map((opt: any, idx: number) => (opt.correct ? idx : -1))
              .filter((idx: number) => idx !== -1)
              .sort();
            const selectedIndices = [...answer.selectedOptions].sort();
            isCorrect =
              correctIndices.length === selectedIndices.length &&
              correctIndices.every((val: number, idx: number) => val === selectedIndices[idx]);
          } else {
            const correctAnswer = question.correctAnswer?.toLowerCase().trim();
            const userAnswer = answer.answerText?.toLowerCase().trim();
            isCorrect = correctAnswer === userAnswer;
          }

          if (isCorrect) correctAttempts++;
        }

        const correctRate =
          answers.length > 0 ? (correctAttempts / answers.length) * 100 : 0;

        return {
          questionId: question.id,
          questionText: question.questionText,
          totalAttempts: answers.length,
          correctAttempts,
          correctRate: Math.round(correctRate * 10) / 10,
        };
      })
    );

    // Score distribution
    const scoreRanges = [
      { min: 0, max: 50, label: "0-50" },
      { min: 50, max: 60, label: "50-60" },
      { min: 60, max: 70, label: "60-70" },
      { min: 70, max: 80, label: "70-80" },
      { min: 80, max: 90, label: "80-90" },
      { min: 90, max: 100, label: "90-100" },
    ];

    const scoreDistribution: Record<string, number> = {};
    for (const range of scoreRanges) {
      scoreDistribution[range.label] = test.attempts.filter(
        (a) => {
          const scorePercent = a.score * 100;
          return scorePercent >= range.min && scorePercent < range.max;
        }
      ).length;
    }

    return NextResponse.json({
      testId: params.id,
      totalAttempts,
      passRate: Math.round(passRate * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      averageTimeSpent: Math.round(averageTimeSpent * 10) / 10,
      questionPerformance,
      scoreDistribution,
    });
  } catch (error) {
    console.error("Error fetching test analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

