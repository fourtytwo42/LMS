import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateContentProgressSchema = z.object({
  contentItemId: z.string().min(1, "Content item ID is required"),
  progress: z.number().min(0).max(1), // Progress as a decimal (0.0 to 1.0)
  pagesViewed: z.number().int().min(0).optional(), // For PDF/PPT
  totalPages: z.number().int().min(0).optional(), // For PDF/PPT
  lastPage: z.number().int().min(1).optional(), // For PDF/PPT - current page number
});

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

    const body = await request.json();
    const validated = updateContentProgressSchema.parse(body);

    // Verify content item exists
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: validated.contentItemId },
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
    });

    if (!contentItem) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Content item not found" },
        { status: 404 }
      );
    }

    // Only allow PDF, PPT, HTML, and EXTERNAL types (videos use separate endpoint)
    if (contentItem.type === "VIDEO") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Use /api/progress/video for video content" },
        { status: 400 }
      );
    }

    if (contentItem.type === "TEST") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Test completion is handled separately" },
        { status: 400 }
      );
    }

    // Check if user is enrolled
    if (contentItem.course.enrollments.length === 0) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Calculate completion based on progress and threshold
    const completionThreshold = contentItem.completionThreshold || 0.8;
    const completed = validated.progress >= completionThreshold;

    // Get or create content progress record
    const existingProgress = await prisma.contentProgress.findUnique({
      where: {
        userId_contentItemId: {
          userId: user.id,
          contentItemId: validated.contentItemId,
        },
      },
    });

    // Determine last page for PDF/PPT
    const lastPage = validated.lastPage 
      ? validated.lastPage 
      : (validated.pagesViewed && validated.pagesViewed > 0 
        ? validated.pagesViewed 
        : existingProgress?.lastPage || null);

    if (existingProgress) {
      // Update existing progress
      await prisma.contentProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress: validated.progress,
          pagesViewed: validated.pagesViewed || existingProgress.pagesViewed,
          lastPage: lastPage,
          totalPages: validated.totalPages || existingProgress.totalPages,
          completed,
        },
      });
    } else {
      // Create new progress record
      await prisma.contentProgress.create({
        data: {
          userId: user.id,
          contentItemId: validated.contentItemId,
          progress: validated.progress,
          pagesViewed: validated.pagesViewed,
          lastPage: lastPage,
          totalPages: validated.totalPages,
          completed,
        },
      });
    }

    // Get or create completion record
    const existingCompletion = await prisma.completion.findFirst({
      where: {
        userId: user.id,
        courseId: contentItem.courseId,
        contentItemId: validated.contentItemId,
      },
    });

    if (completed) {
      if (existingCompletion) {
        // Update existing completion
        await prisma.completion.update({
          where: { id: existingCompletion.id },
          data: {
            completedAt: new Date(),
          },
        });
      } else {
        // Create new completion
        await prisma.completion.create({
          data: {
            userId: user.id,
            courseId: contentItem.courseId,
            contentItemId: validated.contentItemId,
            completedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      contentItemId: validated.contentItemId,
      progress: validated.progress,
      completed,
      completionPercentage: validated.progress * 100,
      lastPage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid request data", errors: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating content progress:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

