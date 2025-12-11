import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const createFolderSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  folderPath: z.string().min(1, "Folder path is required"),
});

const STORAGE_BASE = process.env.STORAGE_PATH || join(process.cwd(), "storage");

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

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only instructors and admins can create folders
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createFolderSchema.parse(body);

    // Check course access
    const course = await prisma.course.findUnique({
      where: { id: validated.courseId },
      include: {
        instructorAssignments: {
          where: { userId: user.id },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    const hasPermission =
      course.createdById === user.id ||
      course.instructorAssignments.length > 0 ||
      user.roles.includes("ADMIN");

    if (!hasPermission) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Create folder in storage
    const folderPath = join(STORAGE_BASE, "repository", validated.courseId, validated.folderPath);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }

    return NextResponse.json(
      {
        message: "Folder created successfully",
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

    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

