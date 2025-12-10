import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

describe("POST /api/auth/login", () => {
  let testUser: { id: string; email: string; passwordHash: string };

  beforeEach(async () => {
    // Create test user
    const passwordHash = await hashPassword("TestPassword123");
    testUser = await prisma.user.create({
      data: {
        email: "test@example.com",
        passwordHash,
        firstName: "Test",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "LEARNER" },
                create: {
                  name: "LEARNER",
                  description: "Learner role",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: "test@example.com" },
    });
  });

  it("should login with valid credentials", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "TestPassword123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("test@example.com");

    // Check cookies are set
    const cookies = response.cookies.getAll();
    expect(cookies.some((c) => c.name === "accessToken")).toBe(true);
    expect(cookies.some((c) => c.name === "refreshToken")).toBe(true);
  });

  it("should reject invalid email", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "wrong@example.com",
        password: "TestPassword123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("UNAUTHORIZED");
  });

  it("should reject invalid password", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "WrongPassword",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("UNAUTHORIZED");
  });
});

