import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateQuestionSchema = z.object({
  type: z.enum([
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "FILL_BLANK",
  ]).optional(),
  questionText: z.string().min(1).optional(),
  points: z.number().int().positive().optional(),
  options: z
    .array(
      z.object({
        text: z.string(),
        correct: z.boolean(),
      })
    )
    .optional(),
  correctAnswer: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        test: {
          include: {
            contentItem: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Question not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isInstructor = user.roles.includes("INSTRUCTOR");
    const isCreator = question.test.contentItem.course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: question.test.contentItem.courseId,
        userId: user.id,
      },
    });

    if (!isAdmin && !isInstructor && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      question: {
        id: question.id,
        type: question.type,
        questionText: question.questionText,
        points: question.points,
        order: question.order,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    console.error("Error fetching question:", error);
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

    // Only instructor and admin can update questions
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        test: {
          include: {
            contentItem: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Question not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = question.test.contentItem.course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: question.test.contentItem.courseId,
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
    const validated = updateQuestionSchema.parse(body);

    const updateData: any = {};
    if (validated.type) updateData.type = validated.type;
    if (validated.questionText) updateData.questionText = validated.questionText;
    if (validated.points) updateData.points = validated.points;
    if (validated.options) updateData.options = validated.options;
    if (validated.correctAnswer !== undefined) updateData.correctAnswer = validated.correctAnswer;
    if (validated.explanation !== undefined) updateData.explanation = validated.explanation;
    if (validated.order !== undefined) updateData.order = validated.order;

    const updatedQuestion = await prisma.question.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      question: {
        id: updatedQuestion.id,
        questionText: updatedQuestion.questionText,
        updatedAt: updatedQuestion.updatedAt,
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

    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only instructor and admin can delete questions
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        test: {
          include: {
            contentItem: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Question not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = question.test.contentItem.course.createdById === user.id;
    const isAssigned = await prisma.instructorAssignment.findFirst({
      where: {
        courseId: question.test.contentItem.courseId,
        userId: user.id,
      },
    });

    if (!isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.question.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

