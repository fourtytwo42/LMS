import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateCourseSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["E-LEARNING", "BLENDED", "IN_PERSON"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  estimatedTime: z.number().optional().nullable(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
  publicAccess: z.boolean().optional(),
  selfEnrollment: z.boolean().optional(),
  sequentialRequired: z.boolean().optional(),
  allowSkipping: z.boolean().optional(),
  thumbnail: z.string().url().optional().or(z.literal("")),
  coverImage: z.string().url().optional().or(z.literal("")),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: id },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        instructorAssignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            contentItems: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructorAssignments.some(
      (ia) => ia.userId === user.id
    );
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        courseId: course.id,
        userId: user.id,
      },
    });

    const hasAccess =
      isAdmin ||
      isAssignedInstructor ||
      course.publicAccess ||
      isEnrolled ||
      course.createdById === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: course.id,
      code: course.code,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      coverImage: course.coverImage,
      status: course.status,
      type: course.type,
      estimatedTime: course.estimatedTime,
      difficultyLevel: course.difficultyLevel,
      publicAccess: course.publicAccess,
      selfEnrollment: course.selfEnrollment,
      sequentialRequired: course.sequentialRequired,
      allowSkipping: course.allowSkipping,
      category: course.category,
      tags: course.tags,
      featured: course.featured,
      createdBy: course.createdBy,
      instructors: course.instructorAssignments.map((ia) => ia.user),
      enrollmentCount: course._count.enrollments,
      contentItemCount: course._count.contentItems,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: id },
      include: {
        instructorAssignments: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructorAssignments.some(
      (ia) => ia.userId === user.id
    );
    const isCreator = course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateCourseSchema.parse(body);

    const updateData: any = {};
    if (validated.code !== undefined) updateData.code = validated.code;
    if (validated.title) updateData.title = validated.title;
    if (validated.shortDescription !== undefined)
      updateData.shortDescription = validated.shortDescription;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.type) updateData.type = validated.type;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.categoryId !== undefined)
      updateData.categoryId = validated.categoryId || null;
    if (validated.tags) updateData.tags = validated.tags;
    if (validated.estimatedTime !== undefined)
      updateData.estimatedTime = validated.estimatedTime;
    if (validated.difficultyLevel !== undefined)
      updateData.difficultyLevel = validated.difficultyLevel;
    if (validated.publicAccess !== undefined)
      updateData.publicAccess = validated.publicAccess;
    if (validated.selfEnrollment !== undefined)
      updateData.selfEnrollment = validated.selfEnrollment;
    if (validated.sequentialRequired !== undefined)
      updateData.sequentialRequired = validated.sequentialRequired;
    if (validated.allowSkipping !== undefined)
      updateData.allowSkipping = validated.allowSkipping;
    if (validated.thumbnail !== undefined)
      updateData.thumbnail = validated.thumbnail || null;
    if (validated.coverImage !== undefined)
      updateData.coverImage = validated.coverImage || null;

    const updatedCourse = await prisma.course.update({
      where: { id: id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      course: {
        id: updatedCourse.id,
        code: updatedCourse.code,
        title: updatedCourse.title,
        status: updatedCourse.status,
        type: updatedCourse.type,
        category: updatedCourse.category,
        updatedAt: updatedCourse.updatedAt,
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

    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can delete courses
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if course has active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: id,
        status: "IN_PROGRESS",
      },
    });

    if (enrollments.length > 0) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "Cannot delete course with active enrollments",
        },
        { status: 409 }
      );
    }

    await prisma.course.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

