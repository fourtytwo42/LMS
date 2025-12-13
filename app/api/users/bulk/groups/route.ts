import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkAssignGroupsSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  groupIds: z.array(z.string()).min(1, "At least one group ID is required"),
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

    // Only admin can assign users to groups in bulk
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkAssignGroupsSchema.parse(body);

    // Verify all groups exist
    const groups = await prisma.group.findMany({
      where: { id: { in: validated.groupIds } },
    });

    if (groups.length !== validated.groupIds.length) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "One or more groups not found" },
        { status: 400 }
      );
    }

    const results = {
      assigned: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const userId of validated.userIds) {
      try {
        // Check if user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!targetUser) {
          results.failed++;
          results.errors.push({
            userId,
            error: "User not found",
          });
          continue;
        }

        // Add user to groups (additive - doesn't remove existing groups)
        for (const groupId of validated.groupIds) {
          await prisma.groupMember.upsert({
            where: {
              userId_groupId: {
                userId: userId,
                groupId: groupId,
              },
            },
            create: {
              userId: userId,
              groupId: groupId,
            },
            update: {},
          });
        }

        results.assigned++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message || "Failed to assign user to groups",
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

    console.error("Error in bulk assign users to groups:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

