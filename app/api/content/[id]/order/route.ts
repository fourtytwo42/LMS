import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateOrderSchema = z.object({
  order: z.number().int().min(0),
  priority: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructors: true,
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
    const isAssignedInstructor = contentItem.course.instructors.some(
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
    const validated = updateOrderSchema.parse(body);

    const updateData: any = { order: validated.order };
    if (validated.priority !== undefined) {
      updateData.priority = validated.priority;
    }

    const updatedItem = await prisma.contentItem.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      contentItem: {
        id: updatedItem.id,
        order: updatedItem.order,
        priority: updatedItem.priority,
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

    console.error("Error updating content item order:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

