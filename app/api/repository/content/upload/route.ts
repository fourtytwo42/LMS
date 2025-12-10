import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { saveFile, validateFile, FileType } from "@/lib/storage/file-upload";
import { z } from "zod";

const uploadContentSchema = z.object({
  type: z.enum(["VIDEO", "PDF", "PPT", "FILE"]),
  folderPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

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

    // Only instructors and admins can upload to content repository
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const type = formData.get("type") as string | null;
    const folderPath = formData.get("folderPath") as string | null;
    const tags = formData.get("tags") as string | null;

    if (!file || !name || !type) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "File, name, and type are required" },
        { status: 400 }
      );
    }

    // Validate input
    const validated = uploadContentSchema.parse({
      type: type as "VIDEO" | "PDF" | "PPT" | "FILE",
      folderPath: folderPath || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
    });

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
        folderPath: validated.folderPath,
      }
    );

    // Save to content repository
    const contentItem = await prisma.contentRepository.create({
      data: {
        name: name,
        description: description || null,
        type: validated.type,
        filePath: uploadedFile.filePath,
        fileSize: uploadedFile.fileSize,
        mimeType: uploadedFile.mimeType,
        folderPath: validated.folderPath || null,
        tags: validated.tags || [],
        uploadedById: user.id,
      },
    });

    return NextResponse.json(
      {
        contentItem: {
          id: contentItem.id,
          name: contentItem.name,
          description: contentItem.description,
          type: contentItem.type,
          filePath: contentItem.filePath,
          fileSize: contentItem.fileSize,
          mimeType: contentItem.mimeType,
          folderPath: contentItem.folderPath,
          tags: contentItem.tags,
          url: `/api/files/${contentItem.id}/download`,
          createdAt: contentItem.createdAt,
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

    console.error("Error uploading content to repository:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

