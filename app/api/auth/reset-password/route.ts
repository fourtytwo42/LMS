import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { resetTokens } from "../forgot-password/route";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = resetPasswordSchema.parse(body);

    // Get token from storage
    const tokenData = resetTokens.get(validated.token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Invalid or expired reset token" },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      resetTokens.delete(validated.token);
      return NextResponse.json(
        { error: "EXPIRED_TOKEN", message: "Reset token has expired" },
        { status: 401 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(validated.password);

    // Update user password
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: {
        passwordHash,
      },
    });

    // Delete used token
    resetTokens.delete(validated.token);

    return NextResponse.json({
      message: "Password reset successful",
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

    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

