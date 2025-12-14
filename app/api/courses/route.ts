import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createCourseSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["E-LEARNING", "BLENDED", "IN_PERSON"]).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  estimatedTime: z.number().optional(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  publicAccess: z.boolean().default(false),
  selfEnrollment: z.boolean().default(false),
  sequentialRequired: z.boolean().default(true),
  allowSkipping: z.boolean().default(false),
  coverImage: z.string().optional(),
  thumbnail: z.string().optional(),
});

export async function GET(request: NextRequest) {
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
      // Non-admins and non-instructors only see published courses
      where.status = "PUBLISHED";
    }

    // For non-admin/instructor users, don't set publicAccess directly if we're going to use OR conditions
    // Instead, include it in the OR condition so group access also works
    const isLearner = !user.roles.includes("ADMIN") && !user.roles.includes("INSTRUCTOR");
    
    if (publicAccess === "true" && !isLearner) {
      // Only set directly for admins/instructors
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
    // Always include all access methods (public, enrolled, instructor, group) even if publicAccess=true is requested
    if (isLearner) {
      // Get user's group IDs
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      });
      const userGroupIds = userGroups.map((gm) => gm.groupId);

      // Merge with existing OR from search if it exists
      const accessOr: any[] = [
        { publicAccess: true },
        {
          enrollments: {
            some: {
              userId: user.id,
            },
          },
        },
        {
          instructorAssignments: {
            some: {
              userId: user.id,
            },
          },
        },
      ];

      // Add group-based access if user is in any groups
      if (userGroupIds.length > 0) {
        accessOr.push({
          groupAccess: {
            some: {
              groupId: { in: userGroupIds },
            },
          },
        });
      }

      if (where.OR) {
        // If search OR exists, combine them with AND logic
        // This means: (search matches) AND (public OR enrolled OR instructor OR group access)
        where.AND = [
          { OR: where.OR },
          { OR: accessOr },
        ];
        delete where.OR;
      } else {
        where.OR = accessOr;
      }
    }

    // Build orderBy
    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "title") {
      orderBy = { title: "asc" };
    } else if (sort === "rating") {
      // Rating sorting not directly supported - would need to calculate from ratings relation
      // For now, fall back to default sorting
      orderBy = { createdAt: "desc" };
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
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
              contentItems: true,
              ratings: true,
            },
          },
        },
        orderBy,
      }),
      prisma.course.count({ where }),
    ]);

    return NextResponse.json({
      courses: courses.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        shortDescription: course.shortDescription,
        thumbnail: course.thumbnail,
        status: course.status,
        type: course.type,
        estimatedTime: course.estimatedTime,
        difficultyLevel: course.difficultyLevel,
        publicAccess: course.publicAccess,
        selfEnrollment: course.selfEnrollment,
        rating: null, // Rating not directly stored on Course - would need to calculate from ratings relation
        reviewCount: course._count?.ratings || 0,
        category: course.category,
        enrollmentCount: course._count.enrollments,
        contentItemCount: course._count.contentItems,
        createdAt: course.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing courses:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

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

    // Only instructor and admin can create courses
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createCourseSchema.parse(body);

    // Check if code already exists (if provided)
    if (validated.code) {
      const existingCourse = await prisma.course.findUnique({
        where: { code: validated.code },
      });

      if (existingCourse) {
        return NextResponse.json(
          { error: "CONFLICT", message: "Course code already exists" },
          { status: 409 }
        );
      }
    }

    // Create course
    const newCourse = await prisma.course.create({
      data: {
        code: validated.code,
        title: validated.title,
        shortDescription: validated.shortDescription,
        description: validated.description || "",
        type: validated.type || "E-LEARNING",
        categoryId: validated.categoryId,
        coverImage: validated.coverImage,
        thumbnail: validated.thumbnail,
        tags: validated.tags || [],
        estimatedTime: validated.estimatedTime,
        difficultyLevel: validated.difficultyLevel,
        publicAccess: validated.publicAccess,
        selfEnrollment: validated.selfEnrollment,
        sequentialRequired: validated.sequentialRequired,
        allowSkipping: validated.allowSkipping,
        coverImage: validated.coverImage,
        thumbnail: validated.thumbnail,
        status: "DRAFT",
        createdById: user.id,
        instructorAssignments: {
          create: {
            userId: user.id,
            assignedById: user.id,
          },
        },
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
        course: {
          id: newCourse.id,
          code: newCourse.code,
          title: newCourse.title,
          status: newCourse.status,
          type: newCourse.type,
          category: newCourse.category,
          createdAt: newCourse.createdAt,
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

    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

