import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { isLearningPlanInstructor } from "@/lib/auth/permissions";
import { z } from "zod";

const updateLearningPlanSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1).optional(),
  shortDescription: z.string().max(130).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  estimatedTime: z.number().int().positive().optional().nullable(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
  publicAccess: z.boolean().optional(),
  selfEnrollment: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  maxEnrollments: z.number().int().positive().optional().nullable(),
  hasCertificate: z.boolean().optional(),
  hasBadge: z.boolean().optional(),
  coverImage: z.string().optional(),
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

    const learningPlan = await prisma.learningPlan.findUnique({
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
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                estimatedTime: true,
                difficultyLevel: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            enrollments: true,
            courses: true,
          },
        },
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        learningPlanId: learningPlan.id,
        userId: user.id,
      },
    });

    const hasAccess =
      isAdmin ||
      learningPlan.publicAccess ||
      isEnrolled ||
      learningPlan.createdById === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: learningPlan.id,
      code: learningPlan.code,
      title: learningPlan.title,
      shortDescription: learningPlan.shortDescription,
      description: learningPlan.description,
      coverImage: learningPlan.coverImage,
      status: learningPlan.status,
      estimatedTime: learningPlan.estimatedTime,
      difficultyLevel: learningPlan.difficultyLevel,
      publicAccess: learningPlan.publicAccess,
      selfEnrollment: learningPlan.selfEnrollment,
      requiresApproval: learningPlan.requiresApproval,
      maxEnrollments: learningPlan.maxEnrollments,
      hasCertificate: learningPlan.hasCertificate,
      hasBadge: learningPlan.hasBadge,
      category: learningPlan.category,
      tags: learningPlan.tags,
      createdBy: learningPlan.createdBy,
      courses: learningPlan.courses.map((lpCourse) => ({
        id: lpCourse.course.id,
        title: lpCourse.course.title,
        order: lpCourse.order,
        estimatedTime: lpCourse.course.estimatedTime,
        difficultyLevel: lpCourse.course.difficultyLevel,
      })),
      courseCount: learningPlan._count.courses,
      enrollmentCount: learningPlan._count.enrollments,
      createdAt: learningPlan.createdAt,
      updatedAt: learningPlan.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching learning plan:", error);
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

    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: id },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = learningPlan.createdById === user.id;
    const hasInstructorAccess = await isLearningPlanInstructor(user.id, id);

    if (!isAdmin && !isCreator && !hasInstructorAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateLearningPlanSchema.parse(body);

    const updateData: any = {};
    if (validated.code !== undefined) updateData.code = validated.code;
    if (validated.title) updateData.title = validated.title;
    if (validated.shortDescription !== undefined)
      updateData.shortDescription = validated.shortDescription;
    if (validated.description !== undefined)
      updateData.description = validated.description;
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
    if (validated.requiresApproval !== undefined)
      updateData.requiresApproval = validated.requiresApproval;
    if (validated.maxEnrollments !== undefined)
      updateData.maxEnrollments = validated.maxEnrollments;
    if (validated.hasCertificate !== undefined)
      updateData.hasCertificate = validated.hasCertificate;
    if (validated.hasBadge !== undefined)
      updateData.hasBadge = validated.hasBadge;
    if (validated.coverImage !== undefined)
      updateData.coverImage = validated.coverImage || null;

    const updatedPlan = await prisma.learningPlan.update({
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
      learningPlan: {
        id: updatedPlan.id,
        code: updatedPlan.code,
        title: updatedPlan.title,
        status: updatedPlan.status,
        category: updatedPlan.category,
        updatedAt: updatedPlan.updatedAt,
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

    console.error("Error updating learning plan:", error);
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

    // Only admin can delete learning plans
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if plan has active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        learningPlanId: id,
        status: "IN_PROGRESS",
      },
    });

    if (enrollments.length > 0) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "Cannot delete learning plan with active enrollments",
        },
        { status: 409 }
      );
    }

    await prisma.learningPlan.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: "Learning plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

