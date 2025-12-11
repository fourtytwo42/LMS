import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Store reset tokens in memory (in production, use Redis or database)
const resetTokens = new Map<
  string,
  { userId: string; expiresAt: Date }
>();

export async function POST(request: NextRequest) {
  try {
    // Check if password reset is enabled (could be from system settings)
    // For now, we'll allow it by default

    const body = await request.json();
    const validated = forgotPasswordSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    // Always return success message (security best practice - don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Store token (in production, store in database or Redis)
    resetTokens.set(resetToken, {
      userId: user.id,
      expiresAt,
    });

    // TODO: Send email with reset link
    // For now, we'll log it (in production, use nodemailer or similar)
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    console.log(`Password reset link for ${user.email}: ${resetLink}`);

    // In production, send email:
    // await sendEmail({
    //   to: user.email,
    //   subject: "Password Reset Request",
    //   html: `Click here to reset your password: ${resetLink}`,
    // });

    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent.",
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

    console.error("Error processing forgot password:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Export resetTokens for use in reset-password route
export { resetTokens };

