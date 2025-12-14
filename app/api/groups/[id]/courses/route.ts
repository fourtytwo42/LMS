import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const addCoursesSchema = z.object({
  courseIds: z.array(z.string()).min(1, "At least one course ID is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can view group courses
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Group not found" },
        { status: 404 }
      );
    }

    const courseAccesses = await prisma.courseGroupAccess.findMany({
      where: { groupId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            shortDescription: true,
            coverImage: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      courses: courseAccesses.map((access) => ({
        id: access.course.id,
        title: access.course.title,
        shortDescription: access.course.shortDescription,
        coverImage: access.course.coverImage,
        status: access.course.status,
        addedAt: access.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching group courses:", error);
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
    const { id: groupId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can add courses to groups
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Group not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = addCoursesSchema.parse(body);

    const results = {
      added: 0,
      failed: 0,
      errors: [] as Array<{ courseId: string; error: string }>,
    };

    for (const courseId of validated.courseIds) {
      try {
        // Check if course exists
        const course = await prisma.course.findUnique({
          where: { id: courseId },
        });

        if (!course) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Course not found",
          });
          continue;
        }

        // Check if access already exists
        const existingAccess = await prisma.courseGroupAccess.findUnique({
          where: {
            courseId_groupId: {
              courseId,
              groupId,
            },
          },
        });

        if (existingAccess) {
          results.failed++;
          results.errors.push({
            courseId,
            error: "Course already has access",
          });
          continue;
        }

        // Create access
        await prisma.courseGroupAccess.create({
          data: {
            courseId,
            groupId,
          },
        });

        results.added++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          courseId,
          error: error.message || "Failed to add course",
        });
      }
    }

    return NextResponse.json({
      message: `Added ${results.added} course(s) to group`,
      results,
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

    console.error("Error adding courses to group:", error);
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
    const { id: groupId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can remove courses from groups
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "courseId is required" },
        { status: 400 }
      );
    }

    await prisma.courseGroupAccess.delete({
      where: {
        courseId_groupId: {
          courseId,
          groupId,
        },
      },
    });

    return NextResponse.json({ message: "Course removed from group" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course access not found" },
        { status: 404 }
      );
    }

    console.error("Error removing course from group:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

