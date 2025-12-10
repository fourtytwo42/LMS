import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(
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

    const completion = await prisma.completion.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        learningPlan: true,
      },
    });

    if (!completion) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Completion not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    if (!isAdmin && completion.userId !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if this is a valid completion (existence of record means completed)
    if (!completion.completedAt) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Course/plan not yet completed" },
        { status: 400 }
      );
    }

    // Check if certificate is enabled
    const hasCertificate = completion.course?.hasCertificate || completion.learningPlan?.hasCertificate;
    if (!hasCertificate) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Certificate not enabled for this course/plan" },
        { status: 400 }
      );
    }

    // Generate certificate URL (in production, this would generate and store the PDF)
    const certificateUrl = `/api/certificates/${params.id}`;

    // Update completion with certificate info
    const updatedCompletion = await prisma.completion.update({
      where: { id: params.id },
      data: {
        certificateUrl,
        certificateGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      completion: {
        id: updatedCompletion.id,
        certificateUrl: updatedCompletion.certificateUrl,
        certificateGeneratedAt: updatedCompletion.certificateGeneratedAt,
      },
    });
  } catch (error) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

