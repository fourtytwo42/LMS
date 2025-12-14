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

    // Check if user has access through a learning plan that contains this course
    let hasLearningPlanAccess = false;
    if (!isAdmin && !isAssignedInstructor && !isEnrolled && !course.publicAccess && course.createdById !== user.id) {
      // Find all learning plans that contain this course
      const learningPlanCourses = await prisma.learningPlanCourse.findMany({
        where: {
          courseId: courseId,
        },
        include: {
          learningPlan: {
            include: {
              groupAccess: {
                select: {
                  groupId: true,
                },
              },
            },
          },
        },
      });

      if (learningPlanCourses.length > 0) {
        // Get user's group IDs
        const userGroups = await prisma.groupMember.findMany({
          where: { userId: user.id },
          select: { groupId: true },
        });
        const userGroupIds = userGroups.map((gm) => gm.groupId);

        // Check if user has access to any learning plan containing this course
        for (const lpCourse of learningPlanCourses) {
          const learningPlan = lpCourse.learningPlan;
          
          // Check if user is enrolled in the learning plan
          const isEnrolledInPlan = await prisma.enrollment.findFirst({
            where: {
              learningPlanId: learningPlan.id,
              userId: user.id,
            },
          });

          // Check if learning plan is public
          const isPublic = learningPlan.publicAccess;

          // Check if user is in a group that has access
          const hasGroupAccess = userGroupIds.length > 0 && learningPlan.groupAccess.some(
            (ga) => userGroupIds.includes(ga.groupId)
          );

          // Check if user is the creator
          const isCreator = learningPlan.createdById === user.id;

          if (isEnrolledInPlan || isPublic || hasGroupAccess || isCreator) {
            hasLearningPlanAccess = true;
            break;
          }
        }
      }
    }

    const hasAccess =
      isAdmin ||
      isAssignedInstructor ||
      course.publicAccess ||
      isEnrolled ||
      course.createdById === user.id ||
      hasLearningPlanAccess;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Try to fetch content items with prerequisites
    // If the table doesn't exist yet (migration not run), fetch without prerequisites
    let contentItems;
    try {
      contentItems = await prisma.contentItem.findMany({
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
          prerequisites: {
            include: {
              prerequisite: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  order: true,
                },
              },
            },
          },
        },
        orderBy: [{ order: "asc" }, { priority: "desc" }],
      });
    } catch (error: any) {
      // If prerequisites table doesn't exist, fetch without it
      const errorMessage = String(error?.message || '');
      const errorCode = String(error?.code || '');
      const errorString = JSON.stringify(error);
      
      console.error("Error fetching content items with prerequisites:", {
        code: errorCode,
        message: errorMessage,
        error: errorString,
      });
      
      // Check if it's a table/relation missing error
      if (
        errorCode === 'P2021' || 
        errorCode === 'P2001' ||
        errorCode === '42P01' || // PostgreSQL: relation does not exist
        errorMessage.toLowerCase().includes('does not exist') || 
        errorMessage.toLowerCase().includes('contentitemprerequisite') ||
        errorMessage.toLowerCase().includes('relation') ||
        errorMessage.toLowerCase().includes('table') ||
        errorMessage.toLowerCase().includes('unknown') ||
        errorString.toLowerCase().includes('contentitemprerequisite')
      ) {
        console.warn("ContentItemPrerequisite table not found, fetching without prerequisites. Run migration to enable prerequisites feature.");
        try {
          contentItems = await prisma.contentItem.findMany({
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
          // Add empty prerequisites array to each item
          contentItems = contentItems.map((item: any) => ({
            ...item,
            prerequisites: [],
          }));
        } catch (fallbackError: any) {
          console.error("Error in fallback query:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    // Get user's progress if enrolled (directly or via learning plan)
    let progressMap: Record<string, any> = {};
    if (isEnrolled || hasLearningPlanAccess || isAdmin || isAssignedInstructor || course.createdById === user.id) {
      // Get video progress
      const videoProgress = await prisma.videoProgress.findMany({
        where: {
          contentItemId: { in: contentItems.map((ci) => ci.id) },
          userId: user.id,
        },
      });
      
      // Get content progress for PDF/PPT/HTML/EXTERNAL
      let contentProgress: any[] = [];
      try {
        contentProgress = await prisma.contentProgress.findMany({
          where: {
            contentItemId: { in: contentItems.map((ci) => ci.id) },
            userId: user.id,
          },
        });
      } catch (error: any) {
        // If ContentProgress table doesn't exist, use empty array
        const errorMessage = error?.message || '';
        const errorCode = error?.code || '';
        if (
          errorCode === 'P2021' || 
          errorCode === 'P2001' ||
          errorMessage.includes('does not exist') || 
          errorMessage.includes('ContentProgress') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('table')
        ) {
          console.warn("ContentProgress table not found, skipping content progress. Run migration to enable progress tracking.");
        } else {
          console.error("Error fetching content progress:", error);
          // Continue without progress data rather than failing
        }
      }
      
      // Get completion records for all content types
      const completions = await prisma.completion.findMany({
        where: {
          contentItemId: { in: contentItems.map((ci) => ci.id) },
          userId: user.id,
          courseId: courseId,
        },
      });
      
      // Build progress map from video progress
      videoProgress.forEach((p) => {
        progressMap[p.contentItemId] = {
          progress: p.totalDuration > 0 ? (p.watchTime / p.totalDuration) * 100 : 0,
          completed: p.completed,
          lastPosition: p.lastPosition,
        };
      });
      
      // Add content progress for PDF/PPT/HTML/EXTERNAL
      contentProgress.forEach((cp) => {
        const contentItem = contentItems.find((ci) => ci.id === cp.contentItemId);
        if (contentItem && contentItem.type !== "VIDEO") {
          progressMap[cp.contentItemId] = {
            progress: cp.progress * 100, // Convert to percentage
            completed: cp.completed,
            lastPage: cp.lastPage,
            pagesViewed: cp.pagesViewed,
          };
        }
      });
      
      // Update completion status from completion records
      // Completion records take precedence - if a completion exists, mark as completed
      completions.forEach((c) => {
        if (c.contentItemId) {
          if (!progressMap[c.contentItemId]) {
            progressMap[c.contentItemId] = {
              progress: 100,
              completed: true,
            };
          } else {
            // Always mark as completed if a completion record exists
            progressMap[c.contentItemId].completed = true;
            // Set progress to 100 if completion exists
            progressMap[c.contentItemId].progress = 100;
          }
        }
      });
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
        progress: progressMap[item.id]?.progress ?? 0,
        completed: progressMap[item.id]?.completed === true, // Explicit boolean
        lastPage: progressMap[item.id]?.lastPage || null,
        lastPosition: progressMap[item.id]?.lastPosition || null,
        unlocked: item.unlocked !== false, // Default to true if not explicitly false
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

