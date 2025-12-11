import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
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

    const test = await prisma.test.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Test not found" },
        { status: 404 }
      );
    }

    const attempts = await prisma.testAttempt.findMany({
      where: {
        testId: testId,
        userId: user.id,
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    const bestAttempt = attempts.reduce(
      (best, current) => ((current.score || 0) > (best.score || 0) ? current : best),
      attempts[0] || { score: 0 }
    );

    const remainingAttempts = test.maxAttempts
      ? Math.max(0, test.maxAttempts - attempts.length)
      : null;

    return NextResponse.json({
      testId: testId,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
      })),
      bestScore: bestAttempt.score || 0,
      canRetake: remainingAttempts === null || remainingAttempts > 0,
      remainingAttempts,
    });
  } catch (error) {
    console.error("Error fetching test progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

