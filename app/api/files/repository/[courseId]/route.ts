import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
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

    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get("folderPath");

    // Check course access
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
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

    const hasAccess =
      course.createdById === user.id ||
      course.instructorAssignments.length > 0 ||
      user.roles.includes("ADMIN") ||
      (await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          courseId: params.courseId,
          status: { in: ["ENROLLED", "IN_PROGRESS"] },
        },
      }));

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get repository files
    const where: any = {
      courseId: params.courseId,
    };

    if (folderPath) {
      where.folderPath = folderPath;
    }

    const files = await prisma.repositoryFile.findMany({
      where,
      orderBy: [
        { folderPath: "asc" },
        { order: "asc" },
        { fileName: "asc" },
      ],
    });

    // Get unique folders
    const folderSet = new Set<string>();
    files.forEach((file) => {
      if (file.folderPath) {
        folderSet.add(file.folderPath);
      }
    });

    const folders = Array.from(folderSet).map((path) => ({
      path,
      fileCount: files.filter((f) => f.folderPath === path).length,
    }));

    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        folderPath: file.folderPath,
        downloadCount: file.downloadCount,
        createdAt: file.createdAt,
      })),
      folders,
    });
  } catch (error) {
    console.error("Error fetching repository files:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

