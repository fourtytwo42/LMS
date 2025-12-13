import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function DELETE(
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

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: id },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Only allow users to unenroll themselves
    if (enrollment.userId !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You can only unenroll yourself" },
        { status: 403 }
      );
    }

    await prisma.enrollment.delete({
      where: { id: id },
    });

    return NextResponse.json({
      message: "Successfully unenrolled",
    });
  } catch (error) {
    console.error("Error unenrolling:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

