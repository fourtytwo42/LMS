import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/utils/validation";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { generateToken, generateRefreshToken } from "@/lib/auth/jwt";
import { handleApiError } from "@/lib/utils/errors";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
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
        { error: "UNAUTHORIZED", message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set cookies
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles.map((ur) => ur.role.name),
          avatar: user.avatar,
        },
        message: "Login successful",
      },
      { status: 200 }
    );

    // For development/testing, never use Secure flag (requires HTTPS)
    // Force secure to false for localhost/development
    const useSecure = false; // Always false for E2E tests and localhost
    
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: useSecure,
      sameSite: "lax", // Changed from strict to lax for better compatibility with localhost
      maxAge: 60 * 60 * 24 * 3, // 3 days
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: useSecure,
      sameSite: "lax", // Changed from strict to lax for better compatibility with localhost
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
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
    return handleApiError(error);
  }
}

