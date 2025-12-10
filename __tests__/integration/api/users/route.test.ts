import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/users/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Users API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let regularUser: { id: string; email: string };

  beforeEach(async () => {
    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin@test.com",
        passwordHash: adminPasswordHash,
        firstName: "Admin",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "ADMIN" },
                create: {
                  name: "ADMIN",
                  description: "Administrator",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roles: ["ADMIN"] });

    // Create regular user
    const userPasswordHash = await hashPassword("UserPass123");
    regularUser = await prisma.user.create({
      data: {
        email: "user@test.com",
        passwordHash: userPasswordHash,
        firstName: "Regular",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "LEARNER" },
                create: {
                  name: "LEARNER",
                  description: "Learner",
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
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin@test.com", "user@test.com", "newuser@test.com"] },
      },
    });
  });

  describe("GET /api/users", () => {
    it("should list users for admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/users", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it("should support pagination", async () => {
      const request = new NextRequest("http://localhost:3000/api/users?page=1&limit=1", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.users.length).toBeLessThanOrEqual(1);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(1);
    });

    it("should filter by role", async () => {
      const request = new NextRequest("http://localhost:3000/api/users?role=LEARNER", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.users.every((u: any) => u.roles.includes("LEARNER"))).toBe(true);
    });
  });

  describe("POST /api/users", () => {
    it("should create user as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          email: "newuser@test.com",
          password: "NewPass123",
          firstName: "New",
          lastName: "User",
          roles: ["LEARNER"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("newuser@test.com");
    });

    it("should reject duplicate email", async () => {
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          email: "user@test.com",
          password: "NewPass123",
          firstName: "New",
          lastName: "User",
          roles: ["LEARNER"],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409); // CONFLICT for duplicate email
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          email: "incomplete@test.com",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});

