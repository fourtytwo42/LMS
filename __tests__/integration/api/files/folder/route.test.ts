import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/files/folder/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";
import { existsSync, rmdir } from "fs";
import { join } from "path";

const STORAGE_BASE = process.env.STORAGE_PATH || join(process.cwd(), "storage");

describe("Files Folder API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-folder@test.com", "instructor-folder@test.com", "other-instructor-folder@test.com", "learner-folder@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-folder@test.com",
        passwordHash: adminPasswordHash,
        firstName: "Admin",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "ADMIN" },
                create: { name: "ADMIN", description: "Admin", permissions: [] },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roles: ["ADMIN"] });

    // Create instructor
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-folder@test.com",
        passwordHash: instructorPasswordHash,
        firstName: "Instructor",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "INSTRUCTOR" },
                create: { name: "INSTRUCTOR", description: "Instructor", permissions: [] },
              },
            },
          },
        },
      },
    });
    instructorToken = generateToken({ userId: instructorUser.id, email: instructorUser.email, roles: ["INSTRUCTOR"] });

    // Create other instructor
    const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
    otherInstructorUser = await prisma.user.create({
      data: {
        email: "other-instructor-folder@test.com",
        passwordHash: otherInstructorPasswordHash,
        firstName: "Other",
        lastName: "Instructor",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "INSTRUCTOR" },
                create: { name: "INSTRUCTOR", description: "Instructor", permissions: [] },
              },
            },
          },
        },
      },
    });
    otherInstructorToken = generateToken({ userId: otherInstructorUser.id, email: otherInstructorUser.email, roles: ["INSTRUCTOR"] });

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-folder@test.com",
        passwordHash: learnerPasswordHash,
        firstName: "Learner",
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
    learnerToken = generateToken({ userId: learnerUser.id, email: learnerUser.email, roles: ["LEARNER"] });

    // Create course
    testCourse = await prisma.course.create({
      data: {
        title: "Folder Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up created folders
    const folderPath = join(STORAGE_BASE, "repository", testCourse.id, "test-folder");
    if (existsSync(folderPath)) {
      try {
        await rmdir(folderPath, { recursive: true });
      } catch (e) {
        // Ignore errors
      }
    }

    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-folder@test.com", "instructor-folder@test.com", "other-instructor-folder@test.com", "learner-folder@test.com"] },
      },
    });
  });

  describe("POST /api/files/folder", () => {
    it("should create folder as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.message).toBe("Folder created successfully");
    });

    it("should create folder as creator", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it("should create folder as assigned instructor", async () => {
      // Assign other instructor
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: "non-existent",
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should return 400 for missing courseId", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for missing folderPath", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "test-folder",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should handle nested folder paths", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          folderPath: "nested/folder/path",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.message).toBe("Folder created successfully");
    });
  });
});

