import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { saveFile, validateFile, FileType } from "@/lib/storage/file-upload";
import { z } from "zod";

const bulkUploadSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
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

    // Only instructors and admins can bulk upload
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const courseId = formData.get("courseId") as string | null;
    const folderPath = formData.get("folderPath") as string | null;

    // Validate input
    const validated = bulkUploadSchema.parse({
      courseId: courseId || undefined,
      folderPath: folderPath || undefined,
    });

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

    // Get all files from form data
    const files: File[] = [];
    let index = 0;
    while (formData.get(`files[${index}]`)) {
      const file = formData.get(`files[${index}]`) as File;
      if (file) {
        files.push(file);
      }
      index++;
    }

    // Also try files[] array
    const filesArray = formData.getAll("files") as File[];
    if (filesArray.length > 0) {
      files.push(...filesArray);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "No files provided" },
        { status: 400 }
      );
    }

    // Upload files
    const uploadedFiles = [];
    let failed = 0;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate file
        const validation = validateFile(
          {
            size: buffer.length,
            mimetype: file.type || "application/octet-stream",
          },
          "REPOSITORY"
        );

        if (!validation.valid) {
          failed++;
          continue;
        }

        // Save file
        const uploadedFile = await saveFile(
          {
            buffer,
            originalFilename: file.name,
            mimetype: file.type || "application/octet-stream",
          },
          "REPOSITORY",
          {
            courseId: validated.courseId,
            folderPath: validated.folderPath,
          }
        );

        // Save to database
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

        uploadedFiles.push({
          id: repositoryFile.id,
          fileName: repositoryFile.fileName,
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        failed++;
      }
    }

    return NextResponse.json({
      uploaded: uploadedFiles.length,
      failed,
      files: uploadedFiles,
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

    console.error("Error bulk uploading files:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

