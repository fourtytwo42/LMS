import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createLearningPlanSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  estimatedTime: z.union([z.number().int().positive(), z.null(), z.undefined()]).optional().nullable(),
  difficultyLevel: z.union([z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]), z.null(), z.undefined()]).optional().nullable(),
  publicAccess: z.boolean().default(false),
  selfEnrollment: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  maxEnrollments: z.union([z.number().int().positive(), z.null(), z.undefined()]).optional().nullable(),
  hasCertificate: z.boolean().default(false),
  hasBadge: z.boolean().default(false),
  coverImage: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const publicAccess = searchParams.get("publicAccess");
    const selfEnrollment = searchParams.get("selfEnrollment");
    const featured = searchParams.get("featured");
    const difficultyLevel = searchParams.get("difficultyLevel");
    const sort = searchParams.get("sort") || "newest";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    } else if (!user.roles.includes("ADMIN") && !user.roles.includes("INSTRUCTOR")) {
      // Non-admins and non-instructors only see published plans
      where.status = "PUBLISHED";
    }

    if (publicAccess === "true") {
      where.publicAccess = true;
    } else if (publicAccess === "false") {
      where.publicAccess = false;
    }

    if (selfEnrollment === "true") {
      where.selfEnrollment = true;
    } else if (selfEnrollment === "false") {
      where.selfEnrollment = false;
    }

    if (featured === "true") {
      where.featured = true;
    }

    if (difficultyLevel) {
      where.difficultyLevel = difficultyLevel;
    }

    // If user is not admin/instructor, filter by access
    if (!user.roles.includes("ADMIN") && !user.roles.includes("INSTRUCTOR")) {
      where.OR = [
        { publicAccess: true },
        {
          enrollments: {
            some: {
              userId: user.id,
            },
          },
        },
      ];
    }

    // Build orderBy
    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "title") {
      orderBy = { title: "asc" };
    }

    const [learningPlans, total] = await Promise.all([
      prisma.learningPlan.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              courses: true,
            },
          },
        },
        orderBy,
      }),
      prisma.learningPlan.count({ where }),
    ]);

    return NextResponse.json({
      learningPlans: learningPlans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        title: plan.title,
        shortDescription: plan.shortDescription,
        coverImage: plan.coverImage,
        status: plan.status,
        estimatedTime: plan.estimatedTime,
        difficultyLevel: plan.difficultyLevel,
        publicAccess: plan.publicAccess,
        selfEnrollment: plan.selfEnrollment,
        category: plan.category,
        courseCount: plan._count.courses,
        enrollmentCount: plan._count.enrollments,
        createdAt: plan.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing learning plans:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only instructor and admin can create learning plans
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createLearningPlanSchema.parse(body);

    // Check if code already exists (if provided)
    if (validated.code) {
      const existingPlan = await prisma.learningPlan.findUnique({
        where: { code: validated.code },
      });

      if (existingPlan) {
        return NextResponse.json(
          { error: "CONFLICT", message: "Learning plan code already exists" },
          { status: 409 }
        );
      }
    }

    // Create learning plan
    const newPlan = await prisma.learningPlan.create({
      data: {
        code: validated.code,
        title: validated.title,
        shortDescription: validated.shortDescription,
        description: validated.description,
        categoryId: validated.categoryId,
        tags: validated.tags || [],
        estimatedTime: validated.estimatedTime,
        difficultyLevel: validated.difficultyLevel,
        publicAccess: validated.publicAccess,
        selfEnrollment: validated.selfEnrollment,
        requiresApproval: validated.requiresApproval,
        maxEnrollments: validated.maxEnrollments,
        hasCertificate: validated.hasCertificate,
        hasBadge: validated.hasBadge,
        coverImage: validated.coverImage || null,
        status: "DRAFT",
        createdById: user.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        learningPlan: {
          id: newPlan.id,
          code: newPlan.code,
          title: newPlan.title,
          status: newPlan.status,
          category: newPlan.category,
          createdAt: newPlan.createdAt,
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

    console.error("Error creating learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

