import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/analytics/overview/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics Overview API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "admin-analytics@test.com",
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics@test.com",
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
                  description: "Admin role",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      roles: ["ADMIN"],
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: "admin-analytics@test.com",
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: "ADMIN",
        users: {
          none: {},
        },
      },
    });
  });

  describe("GET /api/analytics/overview", () => {
    it("should get overview analytics as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/overview", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.users).toBeDefined();
      expect(data.courses).toBeDefined();
      expect(data.learningPlans).toBeDefined();
      expect(data.enrollments).toBeDefined();
    });

    it("should not allow non-admin access", async () => {
      // Create instructor user
      const instructorPasswordHash = await hashPassword("InstructorPass123");
      const instructorUser = await prisma.user.create({
        data: {
          email: "instructor-analytics@test.com",
          passwordHash: instructorPasswordHash,
          firstName: "Instructor",
          lastName: "User",
          roles: {
            create: {
              role: {
                connectOrCreate: {
                  where: { name: "INSTRUCTOR" },
                  create: {
                    name: "INSTRUCTOR",
                    description: "Instructor role",
                    permissions: [],
                  },
                },
              },
            },
          },
        },
      });
      const instructorToken = generateToken({
        userId: instructorUser.id,
        email: instructorUser.email,
        roles: ["INSTRUCTOR"],
      });

      const request = new NextRequest("http://localhost:3000/api/analytics/overview", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({
        where: { id: instructorUser.id },
      });
    });
  });
});

