import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Try to find as repository file first
    const repositoryFile = await prisma.repositoryFile.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (repositoryFile) {
      // Check access
      const hasAccess =
        repositoryFile.course.createdById === user.id ||
        repositoryFile.course.instructorAssignments.length > 0 ||
        user.roles.includes("ADMIN") ||
        (await prisma.enrollment.findFirst({
          where: {
            userId: user.id,
            courseId: repositoryFile.courseId,
            status: { in: ["ENROLLED", "IN_PROGRESS"] },
          },
        }));

      if (!hasAccess) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        id: repositoryFile.id,
        fileName: repositoryFile.fileName,
        filePath: repositoryFile.filePath,
        fileSize: repositoryFile.fileSize,
        mimeType: repositoryFile.mimeType,
        url: `/api/files/${repositoryFile.id}/download`,
        createdAt: repositoryFile.createdAt,
      });
    }

    // If not found, return 404
    return NextResponse.json(
      { error: "NOT_FOUND", message: "File not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only instructors and admins can delete files
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const repositoryFile = await prisma.repositoryFile.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructorAssignments: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!repositoryFile) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "File not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to delete
    const hasPermission =
      repositoryFile.course.createdById === user.id ||
      repositoryFile.course.instructorAssignments.length > 0 ||
      user.roles.includes("ADMIN");

    if (!hasPermission) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Delete file from database (cascade will handle downloads)
    await prisma.repositoryFile.delete({
      where: { id: params.id },
    });

    // TODO: Delete physical file from storage

    return NextResponse.json({
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

