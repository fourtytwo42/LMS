import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
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

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not enrolled in this course" },
        { status: 403 }
      );
    }

    // Get course with content items
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        contentItems: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check if all content items are completed
    const allCompletions = await prisma.completion.findMany({
      where: {
        userId: user.id,
        courseId: courseId,
      },
    });

    const completedContentIds = new Set(
      allCompletions.map((c) => c.contentItemId).filter((id): id is string => !!id)
    );

    const allContentCompleted = course.contentItems.every((item) =>
      completedContentIds.has(item.id)
    );

    if (allContentCompleted) {
      // Check if course completion already exists
      const existingCompletion = await prisma.completion.findFirst({
        where: {
          userId: user.id,
          courseId: courseId,
          contentItemId: null, // Course-level completion
        },
      });

      if (!existingCompletion) {
        // Create course completion
        const completion = await prisma.completion.create({
          data: {
            userId: user.id,
            courseId: courseId,
            completedAt: new Date(),
          },
        });

        // Update enrollment status
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        // Note: Badges and certificates are only available for learning plans, not individual courses

        return NextResponse.json({
          completed: true,
          completionId: completion.id,
          certificateUrl: null, // Certificates are only available for learning plans
          badgeAwarded: false, // Badges are only available for learning plans
          progress: course.contentItems.length > 0
            ? 100
            : 100, // Course with no content is considered 100% complete
        });
      }
    }

    return NextResponse.json({
      completed: allContentCompleted,
      progress: course.contentItems.length > 0
        ? (completedContentIds.size / course.contentItems.length) * 100
        : 100, // Course with no content is considered 100% complete
    });
  } catch (error) {
    console.error("Error checking course completion:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

