import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/repository/questions/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Question Repository API", () => {
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
    await prisma.role.deleteMany({
      where: {
        name: { in: ["INSTRUCTOR", "LEARNER"] },
        users: {
          none: {},
        },
      },
    });

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
    await prisma.questionRepository.deleteMany({
      where: {
        createdBy: {
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

  describe("GET /api/repository/questions", () => {
    it("should list question repositories as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repositories).toBeDefined();
      expect(Array.isArray(data.repositories)).toBe(true);
    });

    it("should not list repositories as learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/repository/questions", () => {
    it("should create question repository as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Test Repository",
          description: "Test description",
          category: "Math",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.repository).toBeDefined();
      expect(data.repository.name).toBe("Test Repository");
    });

    it("should not create repository as learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          name: "Test Repository",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});

