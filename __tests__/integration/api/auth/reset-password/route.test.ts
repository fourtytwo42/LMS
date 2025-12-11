import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/auth/reset-password/route";
import { resetTokens } from "@/app/api/auth/forgot-password/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

describe("Reset Password API", () => {
  let testUser: { id: string; email: string };
  let validToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: "reset-password@test.com",
      },
    });

    // Clear reset tokens
    resetTokens.clear();

    // Create test user
    const passwordHash = await hashPassword("OldPassword123");
    testUser = await prisma.user.create({
      data: {
        email: "reset-password@test.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "LEARNER" },
                create: { name: "LEARNER", description: "Learner", permissions: [] },
              },
            },
          },
        },
      },
    });

    // Create a valid reset token
    validToken = "test-reset-token-123";
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
    resetTokens.set(validToken, {
      userId: testUser.id,
      expiresAt,
    });
  });

  afterEach(async () => {
    resetTokens.clear();
    await prisma.user.deleteMany({
      where: {
        email: "reset-password@test.com",
      },
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: validToken,
          password: "NewPassword123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe("Password reset successful");

      // Verify token was deleted
      expect(resetTokens.has(validToken)).toBe(false);

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.passwordHash).not.toBe(testUser.passwordHash);
    });

    it("should return 401 for invalid token", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "invalid-token",
          password: "NewPassword123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("INVALID_TOKEN");
    });

    it("should return 401 for expired token", async () => {
      // Create expired token
      const expiredToken = "expired-token";
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 1); // Expired 1 hour ago
      resetTokens.set(expiredToken, {
        userId: testUser.id,
        expiresAt,
      });

      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: expiredToken,
          password: "NewPassword123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("EXPIRED_TOKEN");

      // Verify expired token was deleted
      expect(resetTokens.has(expiredToken)).toBe(false);
    });

    it("should return 400 for missing token", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: "NewPassword123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for missing password", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: validToken,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for password too short", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: validToken,
          password: "Short1", // Less than 8 characters
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for password without uppercase", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: validToken,
          password: "lowercase123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for password without lowercase", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: validToken,
          password: "UPPERCASE123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for password without number", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: validToken,
          password: "NoNumbers",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });
});

