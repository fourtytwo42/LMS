import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updatePrerequisitesSchema = z.object({
  prerequisiteIds: z.array(z.string()),
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

    const contentItem = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              select: { userId: true },
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
      (ia) => ia.userId === user.id
    );
    const isCreator = contentItem.course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      prerequisites: contentItem.prerequisites.map((p) => ({
        id: p.prerequisite.id,
        title: p.prerequisite.title,
        type: p.prerequisite.type,
        order: p.prerequisite.order,
      })),
    });
  } catch (error) {
    console.error("Error fetching prerequisites:", error);
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
      where: { id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              select: { userId: true },
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
      (ia) => ia.userId === user.id
    );
    const isCreator = contentItem.course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updatePrerequisitesSchema.parse(body);

    // Prevent self-prerequisite
    if (validated.prerequisiteIds.includes(id)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Content item cannot be a prerequisite of itself" },
        { status: 400 }
      );
    }

    // Verify all prerequisites are in the same course
    const prerequisiteItems = await prisma.contentItem.findMany({
      where: {
        id: { in: validated.prerequisiteIds },
        courseId: contentItem.courseId,
      },
    });

    if (prerequisiteItems.length !== validated.prerequisiteIds.length) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "All prerequisites must be in the same course" },
        { status: 400 }
      );
    }

    // Delete existing prerequisites
    await prisma.contentItemPrerequisite.deleteMany({
      where: { contentItemId: id },
    });

    // Create new prerequisites
    if (validated.prerequisiteIds.length > 0) {
      await prisma.contentItemPrerequisite.createMany({
        data: validated.prerequisiteIds.map((prerequisiteId) => ({
          contentItemId: id,
          prerequisiteId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch updated prerequisites
    const updatedPrerequisites = await prisma.contentItemPrerequisite.findMany({
      where: { contentItemId: id },
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
    });

    return NextResponse.json({
      prerequisites: updatedPrerequisites.map((p) => ({
        id: p.prerequisite.id,
        title: p.prerequisite.title,
        type: p.prerequisite.type,
        order: p.prerequisite.order,
      })),
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

    console.error("Error updating prerequisites:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

