import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
});

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  roles: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can delete users
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkDeleteSchema.parse(body);

    const results = {
      deleted: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const userId of validated.userIds) {
      try {
        // Check if user has active enrollments
        const enrollments = await prisma.enrollment.findMany({
          where: { userId, status: "IN_PROGRESS" },
        });

        if (enrollments.length > 0) {
          results.failed++;
          results.errors.push({
            userId,
            error: "User has active enrollments",
          });
          continue;
        }

        await prisma.user.delete({
          where: { id: userId },
        });

        results.deleted++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message || "Failed to delete user",
        });
      }
    }

    return NextResponse.json(results);
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

    console.error("Error in bulk delete users:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can update users in bulk
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkUpdateSchema.parse(body);

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    // Get all roles if roles are being updated
    let roleRecords: any[] = [];
    if (validated.roles && validated.roles.length > 0) {
      roleRecords = await prisma.role.findMany({
        where: { name: { in: validated.roles } },
      });

      if (roleRecords.length !== validated.roles.length) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Invalid role(s) specified" },
          { status: 400 }
        );
      }
    }

    for (const userId of validated.userIds) {
      try {
        // Update roles if provided
        if (validated.roles && roleRecords.length > 0) {
          await prisma.userRole.deleteMany({
            where: { userId },
          });

          await prisma.userRole.createMany({
            data: roleRecords.map((role) => ({
              userId,
              roleId: role.id,
            })),
          });
        }

        // Update groups if provided
        if (validated.groupIds !== undefined) {
          await prisma.groupMember.deleteMany({
            where: { userId },
          });

          if (validated.groupIds.length > 0) {
            await prisma.groupMember.createMany({
              data: validated.groupIds.map((groupId) => ({
                userId,
                groupId,
              })),
              skipDuplicates: true,
            });
          }
        }

        results.updated++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message || "Failed to update user",
        });
      }
    }

    return NextResponse.json(results);
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

    console.error("Error in bulk update users:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

