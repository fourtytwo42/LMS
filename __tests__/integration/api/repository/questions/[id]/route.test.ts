import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/repository/questions/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Question Repository [id] API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testRepository: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["instructor-repo-id@test.com", "other-instructor-repo-id@test.com", "learner-repo-id@test.com"] },
      },
    });

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-repo-id@test.com",
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

    // Create other instructor
    const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
    otherInstructorUser = await prisma.user.create({
      data: {
        email: "other-instructor-repo-id@test.com",
        passwordHash: otherInstructorPasswordHash,
        firstName: "Other",
        lastName: "Instructor",
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
    otherInstructorToken = generateToken({
      userId: otherInstructorUser.id,
      email: otherInstructorUser.email,
      roles: ["INSTRUCTOR"],
    });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-repo-id@test.com",
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

    // Create test repository
    testRepository = await prisma.questionRepository.create({
      data: {
        name: "Test Repository",
        description: "Test description",
        category: "Math",
        createdById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.questionRepository.deleteMany({
      where: {
        createdBy: {
          email: { in: ["instructor-repo-id@test.com", "other-instructor-repo-id@test.com"] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["instructor-repo-id@test.com", "other-instructor-repo-id@test.com", "learner-repo-id@test.com"] },
      },
    });
  });

  describe("GET /api/repository/questions/[id]", () => {
    it("should get repository as instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repository.id).toBe(testRepository.id);
      expect(data.repository.name).toBe("Test Repository");
    });

    it("should return 404 for non-existent repository", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions/non-existent", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`);

      const response = await GET(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/repository/questions/[id]", () => {
    it("should update repository as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Updated Repository",
          description: "Updated description",
        }),
      });

      const response = await PUT(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.repository.name).toBe("Updated Repository");
    });

    it("should return validation error for invalid data", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "", // Invalid: empty name
        }),
      });

      const response = await PUT(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized Update",
        }),
      });

      const response = await PUT(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          name: "Learner Update",
        }),
      });

      const response = await PUT(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent repository", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions/non-existent", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Update",
        }),
      });

      const response = await PUT(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/repository/questions/[id]", () => {
    it("should delete repository as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(200);

      // Verify deleted
      const deleted = await prisma.questionRepository.findUnique({
        where: { id: testRepository.id },
      });
      expect(deleted).toBeNull();
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/questions/${testRepository.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testRepository.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent repository", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/questions/non-existent", {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });
  });
});

