import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructors: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Course not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    const isAssignedInstructor = course.instructors.some(
      (inst) => inst.userId === user.id
    );
    const isCreator = course.createdById === user.id;

    if (!isAdmin && !isAssignedInstructor && !isCreator) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: { status: "PUBLISHED" },
    });

    return NextResponse.json({
      course: {
        id: updatedCourse.id,
        status: updatedCourse.status,
        updatedAt: updatedCourse.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error publishing course:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

