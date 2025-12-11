import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
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

    const category = await prisma.category.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            courses: true,
            learningPlans: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      parent: category.parent,
      children: category.children,
      order: category.order,
      courseCount: category._count.courses,
      learningPlanCount: category._count.learningPlans,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
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

    // Only admin can update categories
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Category not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    // If name is being updated, check for conflicts
    if (validated.name && validated.name !== category.name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: validated.name,
          NOT: { id: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: "CONFLICT",
            message: "Category with this name already exists",
          },
          { status: 409 }
        );
      }
    }

    // If parentId is being updated, verify it exists and prevent circular references
    if (validated.parentId !== undefined) {
      if (validated.parentId === id) {
        return NextResponse.json(
          {
            error: "BAD_REQUEST",
            message: "Category cannot be its own parent",
          },
          { status: 400 }
        );
      }

      if (validated.parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: validated.parentId },
        });

        if (!parent) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Parent category not found" },
            { status: 404 }
          );
        }

        // Check for circular reference (parent's parent chain)
        let currentParentId = parent.parentId;
        while (currentParentId) {
          if (currentParentId === id) {
            return NextResponse.json(
              {
                error: "BAD_REQUEST",
                message: "Circular reference detected",
              },
              { status: 400 }
            );
          }
          const currentParent = await prisma.category.findUnique({
            where: { id: currentParentId },
            select: { parentId: true },
          });
          currentParentId = currentParent?.parentId || null;
        }
      }
    }

    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.parentId !== undefined)
      updateData.parentId = validated.parentId;
    if (validated.order !== undefined) updateData.order = validated.order;

    const updatedCategory = await prisma.category.update({
      where: { id: id },
      data: updateData,
      include: {
        _count: {
          select: {
            courses: true,
            learningPlans: true,
          },
        },
      },
    });

    return NextResponse.json({
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        parentId: updatedCategory.parentId,
        order: updatedCategory.order,
        courseCount: updatedCategory._count.courses,
        learningPlanCount: updatedCategory._count.learningPlans,
        updatedAt: updatedCategory.updatedAt,
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

    console.error("Error updating category:", error);
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

    // Only admin can delete categories
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            courses: true,
            learningPlans: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has associated courses or learning plans
    if (
      category._count.courses > 0 ||
      category._count.learningPlans > 0
    ) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message:
            "Cannot delete category with associated courses or learning plans",
        },
        { status: 409 }
      );
    }

    // Check if category has children
    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "Cannot delete category with child categories",
        },
        { status: 409 }
      );
    }

    await prisma.category.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

