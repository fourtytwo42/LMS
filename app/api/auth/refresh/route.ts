import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { generateToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Refresh token required" },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Get user to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User not found" },
        { status: 401 }
      );
    }

    // Generate new access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    };

    const accessToken = generateToken(tokenPayload);

    // Set new access token cookie
    const response = NextResponse.json(
      { message: "Token refreshed" },
      { status: 200 }
    );

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 3, // 3 days
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

