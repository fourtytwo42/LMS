import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const addGroupsSchema = z.object({
  groupIds: z.array(z.string()).min(1, "At least one group ID is required"),
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

    // Check if user has access (admin or instructor)
    const isAdmin = user.roles.includes("ADMIN");
    if (!isAdmin) {
      // Check if user is an instructor for this course
      const instructorAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          courseId,
          userId: user.id,
        },
      });

      if (!instructorAssignment) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    const groupAccesses = await prisma.courseGroupAccess.findMany({
      where: { courseId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      groups: groupAccesses.map((access) => ({
        id: access.group.id,
        name: access.group.name,
        type: access.group.type,
        description: access.group.description,
        addedAt: access.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching course groups:", error);
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

    // Check if user has access (admin or instructor)
    const isAdmin = user.roles.includes("ADMIN");
    if (!isAdmin) {
      // Check if user is an instructor for this course
      const instructorAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          courseId,
          userId: user.id,
        },
      });

      if (!instructorAssignment) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = addGroupsSchema.parse(body);

    const results = {
      added: 0,
      failed: 0,
      errors: [] as Array<{ groupId: string; error: string }>,
    };

    for (const groupId of validated.groupIds) {
      try {
        // Check if group exists
        const group = await prisma.group.findUnique({
          where: { id: groupId },
        });

        if (!group) {
          results.failed++;
          results.errors.push({
            groupId,
            error: "Group not found",
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
            groupId,
            error: "Group already has access",
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
          groupId,
          error: error.message || "Failed to add group",
        });
      }
    }

    return NextResponse.json({
      message: `Added ${results.added} group(s) to course`,
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

    console.error("Error adding groups to course:", error);
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
    const { id: courseId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has access (admin or instructor)
    const isAdmin = user.roles.includes("ADMIN");
    if (!isAdmin) {
      // Check if user is an instructor for this course
      const instructorAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          courseId,
          userId: user.id,
        },
      });

      if (!instructorAssignment) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "groupId is required" },
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

    return NextResponse.json({ message: "Group removed from course" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Group access not found" },
        { status: 404 }
      );
    }

    console.error("Error removing group from course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

