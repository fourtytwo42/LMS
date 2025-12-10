import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/repository/content/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Content Repository API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["instructor@test.com", "learner@test.com"] },
      },
    });
    
    // Clean up roles if no users have them
    const instructorRole = await prisma.role.findUnique({ where: { name: "INSTRUCTOR" } });
    const learnerRole = await prisma.role.findUnique({ where: { name: "LEARNER" } });
    
    if (instructorRole) {
      const instructorUsers = await prisma.userRole.count({ where: { roleId: instructorRole.id } });
      if (instructorUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "INSTRUCTOR" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }
    
    if (learnerRole) {
      const learnerUsers = await prisma.userRole.count({ where: { roleId: learnerRole.id } });
      if (learnerUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "LEARNER" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor@test.com",
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
    instructorToken = generateToken({
      userId: instructorUser.id,
      email: instructorUser.email,
      roles: ["INSTRUCTOR"],
    });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner@test.com",
        passwordHash: learnerPasswordHash,
        firstName: "Learner",
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
    learnerToken = generateToken({
      userId: learnerUser.id,
      email: learnerUser.email,
      roles: ["LEARNER"],
    });
  });

  afterEach(async () => {
    await prisma.contentRepository.deleteMany({
      where: {
        uploadedBy: {
          email: { in: ["instructor@test.com", "learner@test.com"] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["instructor@test.com", "learner@test.com"] },
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["INSTRUCTOR", "LEARNER"] },
      },
    });
  });

  describe("GET /api/repository/content", () => {
    it("should list content items as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems).toBeDefined();
      expect(Array.isArray(data.contentItems)).toBe(true);
    });

    it("should not list content as learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });
});

