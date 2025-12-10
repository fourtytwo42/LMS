import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["STAFF", "EXTERNAL", "CUSTOM"]),
  description: z.string().optional(),
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

    // Only admin can list groups
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        description: group.description,
        memberCount: group._count.members,
        createdAt: group.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing groups:", error);
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

    // Only admin can create groups
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createGroupSchema.parse(body);

    // Check if group with same name exists
    const existingGroup = await prisma.group.findFirst({
      where: { name: validated.name },
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: "CONFLICT", message: "Group with this name already exists" },
        { status: 409 }
      );
    }

    const newGroup = await prisma.group.create({
      data: {
        name: validated.name,
        type: validated.type,
        description: validated.description,
      },
    });

    return NextResponse.json(
      {
        group: {
          id: newGroup.id,
          name: newGroup.name,
          type: newGroup.type,
          description: newGroup.description,
          createdAt: newGroup.createdAt,
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

    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

