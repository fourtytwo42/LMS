import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  roles: z.array(z.enum(["LEARNER", "INSTRUCTOR", "ADMIN"])).optional(),
  groupIds: z.array(z.string()).optional(),
});

export async function GET(
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

    const userId = id;

    // Users can view their own profile, admins and instructors can view any
    const canView =
      user.id === userId ||
      user.roles.includes("ADMIN") ||
      user.roles.includes("INSTRUCTOR");

    if (!canView) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        groupMembers: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          take: 10,
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: targetUser.id,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      avatar: targetUser.avatar,
      bio: targetUser.bio,
      emailVerified: targetUser.emailVerified,
      roles: targetUser.roles.map((r) => r.role.name),
      groups: targetUser.groupMembers.map((gm) => ({
        id: gm.group.id,
        name: gm.group.name,
      })),
      createdAt: targetUser.createdAt,
      lastLoginAt: targetUser.lastLoginAt,
      enrollments: targetUser.enrollments
        .filter((e) => e.course !== null)
        .map((e) => ({
          id: e.id,
          courseId: e.course!.id,
          courseTitle: e.course!.title,
          status: e.status,
          enrolledAt: e.enrolledAt,
        })),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const userId = id;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    // Users can update their own profile (except roles), admins can update anyone
    const canUpdate = user.id === userId || user.roles.includes("ADMIN");

    if (!canUpdate) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Non-admins cannot update roles
    if (validated.roles && !user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Cannot update roles" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (validated.firstName) updateData.firstName = validated.firstName;
    if (validated.lastName) updateData.lastName = validated.lastName;
    if (validated.bio !== undefined) updateData.bio = validated.bio;
    if (validated.avatar !== undefined) {
      updateData.avatar = validated.avatar || null;
    }

    // Update roles if provided and user is admin
    if (validated.roles && user.roles.includes("ADMIN")) {
      const roleRecords = await prisma.role.findMany({
        where: { name: { in: validated.roles } },
      });

      if (roleRecords.length !== validated.roles.length) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Invalid role(s) specified" },
          { status: 400 }
        );
      }

      // Delete existing roles and create new ones
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
      // Delete existing group memberships
      await prisma.groupMember.deleteMany({
        where: { userId },
      });

      // Create new group memberships
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        groupMembers: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        roles: updatedUser.roles.map((r) => r.role.name),
        groups: updatedUser.groupMembers.map((gm) => ({
          id: gm.group.id,
          name: gm.group.name,
        })),
        updatedAt: updatedUser.updatedAt,
      },
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

    console.error("Error updating user:", error);
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
    const { id } = await params;
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

    const userId = id;

    // Check if user has active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, status: "IN_PROGRESS" },
    });

    if (enrollments.length > 0) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "Cannot delete user with active enrollments",
        },
        { status: 409 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

