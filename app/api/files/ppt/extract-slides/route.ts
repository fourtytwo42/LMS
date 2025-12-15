import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { mkdir, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Extract slides from PPTX file as images
 * This endpoint extracts all slides from a PPTX file and saves them as PNG images
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pptPath } = body;

    if (!pptPath) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "pptPath is required" },
        { status: 400 }
      );
    }

    // Resolve the full path to the PPTX file
    const storagePath = process.env.STORAGE_PATH || "./storage";
    const fullPptPath = join(process.cwd(), storagePath, pptPath.replace(/^\//, ""));

    if (!existsSync(fullPptPath)) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "PPTX file not found" },
        { status: 404 }
      );
    }

    // Create output directory for slide images
    const outputDir = join(
      process.cwd(),
      storagePath,
      "ppt-slides",
      pptPath.replace(/^\//, "").replace(/\.pptx?$/i, "")
    );
    await mkdir(outputDir, { recursive: true });

    // Check if slides already exist
    const existingSlides = await readdir(outputDir).catch(() => []);
    const slideImages = existingSlides
      .filter((f) => f.endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/slide-(\d+)\.png/i, "$1")) || 0;
        const numB = parseInt(b.replace(/slide-(\d+)\.png/i, "$1")) || 0;
        return numA - numB;
      });

        if (slideImages.length > 0) {
          // Return existing slides - extraction should have happened at upload
          const slideUrls = slideImages.map((img) => {
            const relativePath = join(
              "ppt-slides",
              pptPath.replace(/^\//, "").replace(/\.pptx?$/i, ""),
              img
            ).replace(/\\/g, "/"); // Normalize path separators
            // Ensure path starts with /
            const normalizedPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
            return `/api/files/serve?path=${encodeURIComponent(normalizedPath)}`;
          });

          return NextResponse.json({
            slides: slideUrls,
            count: slideUrls.length,
            cached: true,
          });
        }

    // If slides don't exist, return error - extraction should have happened at upload
    // Don't extract on-demand as this makes learners wait
    return NextResponse.json(
      {
        error: "SLIDES_NOT_READY",
        message: "Slides are still being extracted. Please wait a moment and refresh the page. Extraction happens automatically when the file is uploaded.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error extracting PPT slides:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to extract slides",
      },
      { status: 500 }
    );
  }
}

