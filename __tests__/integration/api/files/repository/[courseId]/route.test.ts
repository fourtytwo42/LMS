import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/files/repository/[courseId]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Files Repository [courseId] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: any;
  let testFile: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-repo@test.com", "instructor-repo@test.com", "learner-repo@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-repo@test.com",
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

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-repo@test.com",
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
                  description: "Instructor",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    instructorToken = generateToken({ userId: instructorUser.id, email: instructorUser.email, roles: ["INSTRUCTOR"] });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-repo@test.com",
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
                  description: "Learner",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    learnerToken = generateToken({ userId: learnerUser.id, email: learnerUser.email, roles: ["LEARNER"] });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course for Repository",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create test file
    testFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test-file.pdf",
        filePath: "repository/test-file.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.repositoryFile.deleteMany({
      where: {
        id: testFile.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: testCourse.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-repo@test.com", "instructor-repo@test.com", "learner-repo@test.com"] },
      },
    });
  });

  describe("GET /api/files/repository/[courseId]", () => {
    it("should list repository files as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/repository/${testCourse.id}`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.files).toBeDefined();
      expect(Array.isArray(data.files)).toBe(true);
      expect(data.folders).toBeDefined();
    });

    it("should list repository files as course creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/repository/${testCourse.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);
    });

    it("should list repository files as enrolled learner", async () => {
      // Enroll learner
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/files/repository/${testCourse.id}`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);
    });

    it("should filter by folderPath", async () => {
      // Create file in a folder
      const folderFile = await prisma.repositoryFile.create({
        data: {
          courseId: testCourse.id,
          fileName: "folder-file.pdf",
          filePath: "repository/folder1/folder-file.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
          folderPath: "folder1",
          uploadedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/files/repository/${testCourse.id}?folderPath=folder1`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.files.every((f: any) => f.folderPath === "folder1")).toBe(true);

      // Cleanup
      await prisma.repositoryFile.delete({ where: { id: folderFile.id } });
    });

    it("should return 403 for non-enrolled learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/repository/${testCourse.id}`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/repository/non-existent", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { courseId: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/repository/${testCourse.id}`);

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(401);
    });
  });
});

