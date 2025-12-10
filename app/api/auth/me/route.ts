import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: fullUser.id,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      avatar: fullUser.avatar,
      bio: fullUser.bio,
      emailVerified: fullUser.emailVerified,
      roles: fullUser.roles.map((ur) => ur.role.name),
      createdAt: fullUser.createdAt,
      lastLoginAt: fullUser.lastLoginAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

