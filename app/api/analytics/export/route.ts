import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { createObjectCsvStringifier } from "csv-writer";
import { z } from "zod";

const exportSchema = z.object({
  type: z.enum(["COURSE", "LEARNING_PLAN", "TEST", "USER", "VIDEO"]),
  entityId: z.string().min(1),
  format: z.enum(["CSV"]).default("CSV"),
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

    // Only instructor and admin can export
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = exportSchema.parse(body);

    if (validated.type === "COURSE") {
      const course = await prisma.course.findUnique({
        where: { id: validated.entityId },
        include: {
          enrollments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
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
      const isCreator = course.createdById === user.id;
      const isAssigned = await prisma.instructorAssignment.findFirst({
        where: {
          courseId: validated.entityId,
          userId: user.id,
        },
      });

      if (!isAdmin && !isCreator && !isAssigned) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }

      // Calculate progress for each enrollment
      const records = await Promise.all(
        course.enrollments.map(async (enrollment) => {
          const completions = await prisma.completion.count({
            where: {
              userId: enrollment.userId,
              courseId: validated.entityId,
            },
          });

          const totalContent = course.contentItems.length;
          const progress = totalContent > 0 ? (completions / totalContent) * 100 : 0;

          return {
            userId: enrollment.user.id,
            firstName: enrollment.user.firstName,
            lastName: enrollment.user.lastName,
            email: enrollment.user.email,
            status: enrollment.status,
            progress: Math.round(progress),
            enrolledAt: enrollment.enrolledAt.toISOString(),
            startedAt: enrollment.startedAt?.toISOString() || "",
            completedAt: enrollment.completedAt?.toISOString() || "",
          };
        })
      );

      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: "userId", title: "User ID" },
          { id: "firstName", title: "First Name" },
          { id: "lastName", title: "Last Name" },
          { id: "email", title: "Email" },
          { id: "status", title: "Status" },
          { id: "progress", title: "Progress %" },
          { id: "enrolledAt", title: "Enrolled At" },
          { id: "startedAt", title: "Started At" },
          { id: "completedAt", title: "Completed At" },
        ],
      });

      const csvString =
        csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="course-${validated.entityId}-export-${Date.now()}.csv"`,
        },
      });
    }

    // Add other export types as needed
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Export type not yet implemented" },
      { status: 400 }
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

    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

