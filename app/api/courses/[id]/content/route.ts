import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createContentItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["VIDEO", "YOUTUBE", "PDF", "PPT", "HTML", "EXTERNAL", "TEST"]),
  order: z.number().int().min(0),
  priority: z.number().int().default(0),
  required: z.boolean().default(true),
  // Video-specific
  videoUrl: z.string().optional(), // Allow relative URLs for uploaded files
  videoDuration: z.number().optional(),
  completionThreshold: z.number().min(0).max(1).default(0.8),
  allowSeeking: z.boolean().default(true),
  // PDF-specific
  pdfUrl: z.string().optional(), // Allow relative URLs for uploaded files
  pdfPages: z.number().optional(),
  // PPT-specific
  pptUrl: z.string().optional(), // Allow relative URLs for uploaded files
  pptSlides: z.number().optional(),
  // HTML-specific
  htmlContent: z.string().optional(),
  // External-specific
  externalUrl: z.string().url().optional(),
  externalType: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check course access
    const course = await prisma.course.findUnique({
      where: { id: courseId },
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

    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructorAssignments.some(
      (inst) => inst.userId === user.id
    );
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        courseId: courseId,
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

    const contentItems = await prisma.contentItem.findMany({
      where: { courseId: courseId },
      include: {
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
      orderBy: [{ order: "asc" }, { priority: "desc" }],
    });

    // Get user's progress if enrolled
    let progressMap: Record<string, any> = {};
    if (isEnrolled) {
      const progress = await prisma.videoProgress.findMany({
        where: {
          contentItemId: { in: contentItems.map((ci) => ci.id) },
          userId: user.id,
        },
      });
      progressMap = progress.reduce((acc, p) => {
        acc[p.contentItemId] = {
          progress: p.totalDuration > 0 ? (p.watchTime / p.totalDuration) * 100 : 0,
          completed: p.completed,
        };
        return acc;
      }, {} as Record<string, any>);
    }

    return NextResponse.json({
      contentItems: contentItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        order: item.order,
        priority: item.priority,
        required: item.required,
        videoUrl: item.videoUrl,
        videoDuration: item.videoDuration,
        completionThreshold: item.completionThreshold,
        allowSeeking: item.allowSeeking,
        pdfUrl: item.pdfUrl,
        pdfPages: item.pdfPages,
        pptUrl: item.pptUrl,
        pptSlides: item.pptSlides,
        htmlContent: item.htmlContent,
        externalUrl: item.externalUrl,
        externalType: item.externalType,
        test: item.test
          ? {
              id: item.test.id,
              title: item.test.title,
              passingScore: item.test.passingScore,
              maxAttempts: item.test.maxAttempts,
              timeLimit: item.test.timeLimit,
              questionCount: item.test._count.questions,
            }
          : null,
        progress: progressMap[item.id]?.progress || 0,
        completed: progressMap[item.id]?.completed || false,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching content items:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check course and permissions
    const course = await prisma.course.findUnique({
      where: { id: courseId },
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

    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructorAssignments.some(
      (inst) => inst.userId === user.id
    );
    const isCreator = course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createContentItemSchema.parse(body);

    // Validate type-specific fields
    if (validated.type === "VIDEO" && !validated.videoUrl) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "videoUrl is required for VIDEO type" },
        { status: 400 }
      );
    }
    if (validated.type === "YOUTUBE" && !validated.videoUrl) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "videoUrl (YouTube URL) is required for YOUTUBE type" },
        { status: 400 }
      );
    }
    if (validated.type === "PDF" && !validated.pdfUrl) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "pdfUrl is required for PDF type" },
        { status: 400 }
      );
    }
    if (validated.type === "PPT" && !validated.pptUrl) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "pptUrl is required for PPT type" },
        { status: 400 }
      );
    }
    if (validated.type === "EXTERNAL" && !validated.externalUrl) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "externalUrl is required for EXTERNAL type" },
        { status: 400 }
      );
    }

    const newContentItem = await prisma.contentItem.create({
      data: {
        courseId: courseId,
        title: validated.title,
        description: validated.description,
        type: validated.type,
        order: validated.order,
        priority: validated.priority,
        required: validated.required,
        videoUrl: validated.videoUrl,
        videoDuration: validated.videoDuration,
        completionThreshold: validated.completionThreshold,
        allowSeeking: validated.allowSeeking,
        pdfUrl: validated.pdfUrl,
        pdfPages: validated.pdfPages,
        pptUrl: validated.pptUrl,
        pptSlides: validated.pptSlides,
        htmlContent: validated.htmlContent,
        externalUrl: validated.externalUrl,
        externalType: validated.externalType,
      },
    });

    return NextResponse.json(
      {
        contentItem: {
          id: newContentItem.id,
          title: newContentItem.title,
          type: newContentItem.type,
          order: newContentItem.order,
          createdAt: newContentItem.createdAt,
        },
      },
      { status: 201 }
    );
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

    console.error("Error creating content item:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

