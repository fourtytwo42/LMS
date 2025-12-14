import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const addGroupsSchema = z.object({
  groupIds: z.array(z.string()).min(1, "At least one group ID is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: learningPlanId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // First check if learning plan exists
    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: learningPlanId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check if user has access (admin, creator, or instructor)
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = learningPlan.createdById === user.id;
    
    if (!isAdmin && !isCreator) {
      // Check if user is an instructor for this learning plan
      const instructorAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          learningPlanId,
          userId: user.id,
        },
      });

      if (!instructorAssignment) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const groupAccesses = await prisma.learningPlanGroupAccess.findMany({
      where: { learningPlanId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`[GET /api/learning-plans/${learningPlanId}/groups] User: ${user.id}, isAdmin: ${isAdmin}, isCreator: ${isCreator}`);
    console.log(`[GET /api/learning-plans/${learningPlanId}/groups] Found ${groupAccesses.length} group access records`);
    console.log(`[GET /api/learning-plans/${learningPlanId}/groups] Group accesses:`, JSON.stringify(groupAccesses.map(a => ({ 
      id: a.id, 
      groupId: a.groupId, 
      learningPlanId: a.learningPlanId, 
      groupName: a.group?.name,
      groupExists: a.group !== null 
    })), null, 2));

    // Check if any groups are null (orphaned records)
    const validGroupAccesses = groupAccesses.filter((access) => access.group !== null);
    if (validGroupAccesses.length !== groupAccesses.length) {
      console.warn(`[GET /api/learning-plans/${learningPlanId}/groups] Found ${groupAccesses.length - validGroupAccesses.length} orphaned group access records`);
    }

    const responseData = {
      groups: validGroupAccesses.map((access) => ({
        id: access.group!.id,
        name: access.group!.name,
        type: access.group!.type,
        description: access.group!.description,
        addedAt: access.createdAt,
      })),
    };

    console.log(`[GET /api/learning-plans/${learningPlanId}/groups] Returning ${responseData.groups.length} groups:`, JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching learning plan groups:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: learningPlanId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // First check if learning plan exists
    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: learningPlanId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check if user has access (admin, creator, or instructor)
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = learningPlan.createdById === user.id;
    
    if (!isAdmin && !isCreator) {
      // Check if user is an instructor for this learning plan
      const instructorAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          learningPlanId,
          userId: user.id,
        },
      });

      if (!instructorAssignment) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validated = addGroupsSchema.parse(body);

    const results = {
      added: 0,
      failed: 0,
      errors: [] as Array<{ groupId: string; error: string }>,
    };

    for (const groupId of validated.groupIds) {
      try {
        // Check if group exists
        const group = await prisma.group.findUnique({
          where: { id: groupId },
        });

        if (!group) {
          results.failed++;
          results.errors.push({
            groupId,
            error: "Group not found",
          });
          continue;
        }

        // Check if access already exists
        const existingAccess = await prisma.learningPlanGroupAccess.findUnique({
          where: {
            learningPlanId_groupId: {
              learningPlanId,
              groupId,
            },
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (existingAccess) {
          console.log(`[POST /api/learning-plans/${learningPlanId}/groups] Group ${groupId} (${existingAccess.group?.name || 'unknown'}) already has access`);
          results.failed++;
          results.errors.push({
            groupId,
            error: "Group already has access",
          });
          continue;
        }

        // Create access
        await prisma.learningPlanGroupAccess.create({
          data: {
            learningPlanId,
            groupId,
          },
        });

        results.added++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          groupId,
          error: error.message || "Failed to add group",
        });
      }
    }

    return NextResponse.json({
      message: `Added ${results.added} group(s) to learning plan`,
      results,
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

    console.error("Error adding groups to learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: learningPlanId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // First check if learning plan exists
    const learningPlan = await prisma.learningPlan.findUnique({
      where: { id: learningPlanId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!learningPlan) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Check if user has access (admin, creator, or instructor)
    const isAdmin = user.roles.includes("ADMIN");
    const isCreator = learningPlan.createdById === user.id;
    
    if (!isAdmin && !isCreator) {
      // Check if user is an instructor for this learning plan
      const instructorAssignment = await prisma.instructorAssignment.findFirst({
        where: {
          learningPlanId,
          userId: user.id,
        },
      });

      if (!instructorAssignment) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "groupId is required" },
        { status: 400 }
      );
    }

    await prisma.learningPlanGroupAccess.delete({
      where: {
        learningPlanId_groupId: {
          learningPlanId,
          groupId,
        },
      },
    });

    return NextResponse.json({ message: "Group removed from learning plan" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Group access not found" },
        { status: 404 }
      );
    }

    console.error("Error removing group from learning plan:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

