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
    let testRepository: any;

    beforeEach(async () => {
      testRepository = await prisma.questionRepository.create({
        data: {
          name: "Test Repository",
          description: "Test description",
          category: "Math",
          createdById: instructorUser.id,
        },
      });
    });

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

    it("should filter by category", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions?category=Math", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repositories.length).toBeGreaterThan(0);
      expect(data.repositories.every((r: any) => r.category === "Math")).toBe(true);
    });

    it("should search repositories by name", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions?search=Test", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repositories.length).toBeGreaterThan(0);
    });

    it("should search repositories by description", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions?search=description", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repositories.length).toBeGreaterThan(0);
    });

    it("should paginate results", async () => {
      // Create multiple repositories
      for (let i = 0; i < 5; i++) {
        await prisma.questionRepository.create({
          data: {
            name: `Repository ${i}`,
            createdById: instructorUser.id,
          },
        });
      }

      const request = new NextRequest("http://localhost:3000/api/repository/questions?page=1&limit=2", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repositories.length).toBeLessThanOrEqual(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
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

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions");

      const response = await GET(request);
      expect(response.status).toBe(401);
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

    it("should create repository without optional fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Minimal Repository",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.repository.name).toBe("Minimal Repository");
    });

    it("should return validation error for missing name", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          description: "No name provided",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for empty name", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
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

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Repository",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});

