import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { serveFile } from "@/lib/storage/file-serve";

/**
 * Serve files by path for content items (VIDEO, PDF, PPT)
 * This endpoint handles files that are stored but don't have RepositoryFile records
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "File path is required" },
        { status: 400 }
      );
    }

    // Validate path to prevent directory traversal
    if (filePath.includes("..") || filePath.includes("//")) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid file path" },
        { status: 400 }
      );
    }

    // Normalize path (remove leading slash if present)
    const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

    // Extract course ID from path
    // Path format: videos/{courseId}/file.mp4
    // or: videos/course-{id}/content-{id}/file.mp4 (new format)
    // or: pdfs/{courseId}/file.pdf
    // or: ppts/{courseId}/file.pptx
    const pathParts = normalizedPath.split("/");
    if (pathParts.length < 2) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid file path format" },
        { status: 400 }
      );
    }

    // Find course ID from path
    // Support both formats: {courseId} or course-{id}
    const courseIdPart = pathParts[1];
    let courseId: string;
    
    if (courseIdPart.startsWith("course-")) {
      // New format: course-{id}
      courseId = courseIdPart.replace("course-", "");
    } else {
      // Old format: direct course ID
      courseId = courseIdPart;
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
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

    // Check access permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructorAssignments.length > 0;
    const isCreator = course.createdById === user.id;
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        courseId: courseId,
        userId: user.id,
        status: { in: ["ENROLLED", "IN_PROGRESS", "COMPLETED"] },
      },
    });

    const hasAccess =
      isAdmin ||
      isAssignedInstructor ||
      isCreator ||
      course.publicAccess ||
      !!isEnrolled;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions to access this file" },
        { status: 403 }
      );
    }

    // Determine content type from file extension
    const fileExtension = normalizedPath.split(".").pop()?.toLowerCase() || "";
    const contentTypeMap: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      pdf: "application/pdf",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };

    const contentType = contentTypeMap[fileExtension] || "application/octet-stream";

    // Serve file with range request support for videos
    // serveFile expects relative path (it calls getFullFilePath internally)
    const range = request.headers.get("range");
    return serveFile(normalizedPath, {
      filename: pathParts[pathParts.length - 1],
      contentType,
      range,
      download: false,
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

