import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { saveFile, validateFile, FileType } from "@/lib/storage/file-upload";
import { parse } from "formidable";
import { z } from "zod";

const uploadSchema = z.object({
  type: z.enum(["VIDEO", "PDF", "PPT", "REPOSITORY", "AVATAR", "THUMBNAIL", "COVER"]),
  courseId: z.string().optional(),
  contentItemId: z.string().optional(),
  folderPath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;
    const courseId = formData.get("courseId") as string | null;
    const contentItemId = formData.get("contentItemId") as string | null;
    const folderPath = formData.get("folderPath") as string | null;

    // Validate input
    const validated = uploadSchema.parse({
      type,
      courseId: courseId || undefined,
      contentItemId: contentItemId || undefined,
      folderPath: folderPath || undefined,
    });

    if (!file) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "File is required" },
        { status: 400 }
      );
    }

    // Check permissions
    if (validated.type === "REPOSITORY" && validated.courseId) {
      // Check if user has access to course
      const course = await prisma.course.findUnique({
        where: { id: validated.courseId },
        include: {
          instructorAssignments: {
            where: { userId: user.id },
          },
        },
      });

      if (
        !course ||
        (course.createdById !== user.id &&
          !course.instructorAssignments.length &&
          !user.roles.includes("ADMIN"))
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Convert File to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file
    const validation = validateFile(
      {
        size: buffer.length,
        mimetype: file.type || "application/octet-stream",
      },
      validated.type as FileType
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: validation.error },
        { status: 400 }
      );
    }

    // Save file
    const uploadedFile = await saveFile(
      {
        buffer,
        originalFilename: file.name,
        mimetype: file.type || "application/octet-stream",
      },
      validated.type as FileType,
      {
        courseId: validated.courseId,
        contentItemId: validated.contentItemId,
        folderPath: validated.folderPath,
      }
    );

    // Save to database if repository file
    if (validated.type === "REPOSITORY" && validated.courseId) {
      const repositoryFile = await prisma.repositoryFile.create({
        data: {
          courseId: validated.courseId,
          fileName: uploadedFile.fileName,
          filePath: uploadedFile.filePath,
          fileSize: uploadedFile.fileSize,
          mimeType: uploadedFile.mimeType,
          folderPath: validated.folderPath || null,
          uploadedById: user.id,
        },
      });

      return NextResponse.json({
        file: {
          id: repositoryFile.id,
          fileName: repositoryFile.fileName,
          filePath: repositoryFile.filePath,
          fileSize: repositoryFile.fileSize,
          mimeType: repositoryFile.mimeType,
          url: `/api/files/${repositoryFile.id}/download`,
        },
      });
    }

    // For other file types, return uploaded file info
    return NextResponse.json({
      file: uploadedFile,
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

    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

