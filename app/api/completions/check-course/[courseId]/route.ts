import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: params.courseId,
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
      where: { id: params.courseId },
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
        courseId: params.courseId,
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
          courseId: params.courseId,
          contentItemId: null, // Course-level completion
        },
      });

      if (!existingCompletion) {
        // Create course completion
        const completion = await prisma.completion.create({
          data: {
            userId: user.id,
            courseId: params.courseId,
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

        // Award badge if enabled
        if (course.hasBadge) {
          await prisma.completion.update({
            where: { id: completion.id },
            data: {
              badgeAwarded: true,
              badgeAwardedAt: new Date(),
            },
          });
        }

        // Generate certificate if enabled
        if (course.hasCertificate) {
          const certificateUrl = `/api/certificates/${completion.id}`;
          await prisma.completion.update({
            where: { id: completion.id },
            data: {
              certificateUrl,
              certificateGeneratedAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          completed: true,
          completionId: completion.id,
          certificateUrl: course.hasCertificate ? `/api/certificates/${completion.id}` : null,
          badgeAwarded: course.hasBadge,
        });
      }
    }

    return NextResponse.json({
      completed: allContentCompleted,
      progress: course.contentItems.length > 0
        ? (completedContentIds.size / course.contentItems.length) * 100
        : 0,
    });
  } catch (error) {
    console.error("Error checking course completion:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

