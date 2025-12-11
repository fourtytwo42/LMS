import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { serveFile } from "@/lib/storage/file-serve";

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

    const repositoryFile = await prisma.repositoryFile.findUnique({
      where: { id: id },
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

    // Check if it's a video
    if (!repositoryFile.mimeType.startsWith("video/")) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Streaming is only available for video files" },
        { status: 400 }
      );
    }

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

    // Serve file with range support
    const range = request.headers.get("range");
    return serveFile(repositoryFile.filePath, {
      filename: repositoryFile.fileName,
      contentType: repositoryFile.mimeType,
      range,
      download: false,
    });
  } catch (error) {
    console.error("Error streaming file:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

