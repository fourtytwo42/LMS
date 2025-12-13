import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateContentItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  priority: z.number().int().optional(),
  required: z.boolean().optional(),
  videoUrl: z.string().optional().or(z.literal("")), // Allow relative URLs
  videoDuration: z.number().optional(),
  completionThreshold: z.number().min(0).max(1).optional(),
  allowSeeking: z.boolean().optional(),
  pdfUrl: z.string().optional().or(z.literal("")), // Allow relative URLs
  pdfPages: z.number().optional(),
  pptUrl: z.string().optional().or(z.literal("")), // Allow relative URLs
  pptSlides: z.number().optional(),
  htmlContent: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  externalType: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              select: {
                userId: true,
              },
            },
          },
        },
        test: {
          include: {
            _count: {
              select: {
                questions: true,
              },
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

    // Check access permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = contentItem.course.instructorAssignments.some(
      (inst) => inst.userId === user.id
    );
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        courseId: contentItem.courseId,
        userId: user.id,
      },
    });

    const hasAccess =
      isAdmin ||
      isAssignedInstructor ||
      contentItem.course.publicAccess ||
      isEnrolled ||
      contentItem.course.createdById === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: contentItem.id,
      title: contentItem.title,
      description: contentItem.description,
      type: contentItem.type,
      order: contentItem.order,
      priority: contentItem.priority,
      required: contentItem.required,
      videoUrl: contentItem.videoUrl,
      videoDuration: contentItem.videoDuration,
      completionThreshold: contentItem.completionThreshold,
      allowSeeking: contentItem.allowSeeking,
      pdfUrl: contentItem.pdfUrl,
      pdfPages: contentItem.pdfPages,
      pptUrl: contentItem.pptUrl,
      pptSlides: contentItem.pptSlides,
      htmlContent: contentItem.htmlContent,
      externalUrl: contentItem.externalUrl,
      externalType: contentItem.externalType,
      test: contentItem.test
        ? {
            id: contentItem.test.id,
            title: contentItem.test.title,
            passingScore: contentItem.test.passingScore,
            maxAttempts: contentItem.test.maxAttempts,
            timeLimit: contentItem.test.timeLimit,
            questionCount: contentItem.test._count.questions,
          }
        : null,
      createdAt: contentItem.createdAt,
      updatedAt: contentItem.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching content item:", error);
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

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              select: {
                userId: true,
              },
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

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = contentItem.course.instructorAssignments.some(
      (inst) => inst.userId === user.id
    );
    const isCreator = contentItem.course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateContentItemSchema.parse(body);

    const updateData: any = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.order !== undefined) updateData.order = validated.order;
    if (validated.priority !== undefined)
      updateData.priority = validated.priority;
    if (validated.required !== undefined)
      updateData.required = validated.required;
    if (validated.videoUrl !== undefined)
      updateData.videoUrl = validated.videoUrl || null;
    if (validated.videoDuration !== undefined)
      updateData.videoDuration = validated.videoDuration;
    if (validated.completionThreshold !== undefined)
      updateData.completionThreshold = validated.completionThreshold;
    if (validated.allowSeeking !== undefined)
      updateData.allowSeeking = validated.allowSeeking;
    if (validated.pdfUrl !== undefined)
      updateData.pdfUrl = validated.pdfUrl || null;
    if (validated.pdfPages !== undefined)
      updateData.pdfPages = validated.pdfPages;
    if (validated.pptUrl !== undefined)
      updateData.pptUrl = validated.pptUrl || null;
    if (validated.pptSlides !== undefined)
      updateData.pptSlides = validated.pptSlides;
    if (validated.htmlContent !== undefined)
      updateData.htmlContent = validated.htmlContent;
    if (validated.externalUrl !== undefined)
      updateData.externalUrl = validated.externalUrl || null;
    if (validated.externalType !== undefined)
      updateData.externalType = validated.externalType;

    const updatedItem = await prisma.contentItem.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json({
      contentItem: {
        id: updatedItem.id,
        title: updatedItem.title,
        type: updatedItem.type,
        order: updatedItem.order,
        updatedAt: updatedItem.updatedAt,
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

    console.error("Error updating content item:", error);
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

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              select: {
                userId: true,
              },
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

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = contentItem.course.instructorAssignments.some(
      (inst) => inst.userId === user.id
    );
    const isCreator = contentItem.course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await prisma.contentItem.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Content item deleted successfully" });
  } catch (error) {
    console.error("Error deleting content item:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

