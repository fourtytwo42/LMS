import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { saveFile, validateFile, FileType, getFullFilePath } from "@/lib/storage/file-upload";
import { z } from "zod";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
        fileName: file.name,
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

    // For PPT files, convert to PDF asynchronously for display (don't wait for completion)
    // The original PPTX file is kept for downloads
    if (validated.type === "PPT" && validated.courseId) {
      // Convert PPT to PDF in the background - don't block the response
      convertPptToPdfAsync(uploadedFile.filePath).catch((error) => {
        console.error("Error converting PPT to PDF in background:", error);
        // Don't throw - conversion failure shouldn't break the upload
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

/**
 * Convert PPTX file to PDF asynchronously (non-blocking)
 * This runs in the background after file upload completes
 */
async function convertPptToPdfAsync(pptFilePath: string): Promise<void> {
  try {
    console.log(`PPT to PDF: Starting conversion for ${pptFilePath}`);
    
    // Get full path to the PPTX file
    const fullPptPath = getFullFilePath(pptFilePath);
    
    // Get the directory where the PPT file is located
    const pptDir = join(fullPptPath, "..");
    const pptFileName = require("path").basename(fullPptPath, require("path").extname(fullPptPath));
    const pdfFileName = `${pptFileName}.pdf`;
    const fullPdfPath = join(pptDir, pdfFileName);
    
    // Use Python script with LibreOffice UNO API for better PDF conversion
    // This gives us more control over PDF export options to preserve layout
    const scriptPath = join(process.cwd(), "scripts", "convert-pptx-to-pdf.py");
    const command = `python3 "${scriptPath}" "${fullPptPath}" "${fullPdfPath}"`;
    
    const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 minute timeout
    
    if (stdout) {
      console.log(`PPT to PDF: ${stdout}`);
    }
    if (stderr) {
      console.log(`PPT to PDF: ${stderr}`);
    }
    
    // Verify PDF was created
    const fs = require("fs");
    if (fs.existsSync(fullPdfPath)) {
      console.log(`PPT to PDF: Successfully converted ${pptFilePath} to ${pdfFileName}`);
    } else {
      // Sometimes LibreOffice creates the PDF with a slightly different name
      // Check for any PDF file in the directory
      const files = fs.readdirSync(pptDir);
      const pdfFile = files.find((f: string) => f.endsWith(".pdf") && f.startsWith(pptFileName));
      if (pdfFile) {
        console.log(`PPT to PDF: PDF created as ${pdfFile} (name variation)`);
      } else {
        throw new Error(`PDF file was not created. Expected: ${fullPdfPath}`);
      }
    }
  } catch (error) {
    console.error(`PPT to PDF: Failed to convert ${pptFilePath}:`, error);
    // Don't throw - this is a background process, failures shouldn't break anything
  }
}

