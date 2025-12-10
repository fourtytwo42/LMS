import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
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

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            courses: true,
            learningPlans: true,
          },
        },
      },
      orderBy: [
        { order: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        parentId: cat.parentId,
        order: cat.order,
        courseCount: cat._count.courses,
        learningPlanCount: cat._count.learningPlans,
      })),
    });
  } catch (error) {
    console.error("Error listing categories:", error);
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

    // Only admin can create categories
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createCategorySchema.parse(body);

    // Check if name already exists
    const existing = await prisma.category.findFirst({
      where: { name: validated.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "CONFLICT", message: "Category with this name already exists" },
        { status: 409 }
      );
    }

    // If parentId is provided, verify it exists
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
    }

    const category = await prisma.category.create({
      data: {
        name: validated.name,
        description: validated.description,
        parentId: validated.parentId || null,
        order: validated.order ?? 0,
      },
    });

    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          parentId: category.parentId,
          order: category.order,
          createdAt: category.createdAt,
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

    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

