import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createRepositorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
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

    // Only instructors and admins can access question repository
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const repository = await prisma.questionRepository.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        questions: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!repository) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Question repository not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      repository: {
        id: repository.id,
        name: repository.name,
        description: repository.description,
        category: repository.category,
        createdBy: repository.createdBy,
        questions: repository.questions.map((q) => ({
          id: q.id,
          type: q.type,
          questionText: q.questionText,
          points: q.points,
          options: q.options, // This is JSON field
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: q.order,
        })),
        createdAt: repository.createdAt,
        updatedAt: repository.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching question repository:", error);
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

    // Only instructors and admins can update question repository
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const repository = await prisma.questionRepository.findUnique({
      where: { id: params.id },
    });

    if (!repository) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Question repository not found" },
        { status: 404 }
      );
    }

    // Check if user created the repository or is admin
    if (repository.createdById !== user.id && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createRepositorySchema.parse(body);

    const updated = await prisma.questionRepository.update({
      where: { id: params.id },
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
      },
    });

    return NextResponse.json({
      repository: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        category: updated.category,
        updatedAt: updated.updatedAt,
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

    console.error("Error updating question repository:", error);
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

    // Only instructors and admins can delete question repository
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const repository = await prisma.questionRepository.findUnique({
      where: { id: params.id },
    });

    if (!repository) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Question repository not found" },
        { status: 404 }
      );
    }

    // Check if user created the repository or is admin
    if (repository.createdById !== user.id && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.questionRepository.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Question repository deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question repository:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

