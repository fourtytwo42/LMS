import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/files/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Files API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testFile: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-files@test.com", "instructor-files@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-files@test.com",
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

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-files@test.com",
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

    // Create test course
    const testCourse = await prisma.course.create({
      data: {
        title: "Test Course",
        description: "Test course for files",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create test file
    testFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test.pdf",
        filePath: "repository/test-course/test.pdf",
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
        title: "Test Course",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-files@test.com", "instructor-files@test.com"] },
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["ADMIN", "INSTRUCTOR"] },
        users: {
          none: {},
        },
      },
    });
  });

  describe("GET /api/files/:id", () => {
    it("should get file metadata as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(testFile.id);
      expect(data.fileName).toBe("test.pdf");
    });

    it("should get file metadata as uploader", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(testFile.id);
    });

    it("should return 404 for non-existent file", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/non-existent", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });
  });
});

