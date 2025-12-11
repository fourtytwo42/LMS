import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

describe("Forgot Password API", () => {
  let testUser: { id: string; email: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: "forgot-password@test.com",
      },
    });

    // Create test user
    const passwordHash = await hashPassword("TestPassword123");
    testUser = await prisma.user.create({
      data: {
        email: "forgot-password@test.com",
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
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: "forgot-password@test.com",
      },
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("should return success message for existing user", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain("password reset link has been sent");
    });

    it("should return success message for non-existent user (security best practice)", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "non-existent@test.com",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain("password reset link has been sent");
    });

    it("should return 400 for invalid email format", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "invalid-email",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for missing email", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });
});

