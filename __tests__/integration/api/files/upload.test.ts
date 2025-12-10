import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/files/upload/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { getFullFilePath } from "@/lib/storage/file-upload";

describe("File Upload API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCourse: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-upload@test.com", "instructor-upload@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-upload@test.com",
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
        email: "instructor-upload@test.com",
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
    testCourse = await prisma.course.create({
      data: {
        title: "Test Upload Course",
        description: "Test course for file uploads",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
        instructorAssignments: {
          create: {
            userId: instructorUser.id,
            assignedById: instructorUser.id,
          },
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up uploaded files
    const files = await prisma.repositoryFile.findMany({
      where: {
        courseId: testCourse.id,
      },
    });

    for (const file of files) {
      const fullPath = getFullFilePath(file.filePath);
      if (existsSync(fullPath)) {
        await unlink(fullPath).catch(() => {});
      }
    }

    await prisma.repositoryFile.deleteMany({
      where: {
        courseId: testCourse.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        title: "Test Upload Course",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-upload@test.com", "instructor-upload@test.com"] },
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

  describe("POST /api/files/upload", () => {
    it("should upload repository file as instructor", async () => {
      const fileContent = Buffer.from("Test PDF content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("type", "REPOSITORY");
      formData.append("courseId", testCourse.id);

      const request = new NextRequest("http://localhost:3000/api/files/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.file).toBeDefined();
      expect(data.file.mimeType).toBe("application/pdf");
      expect(data.file.fileSize).toBe(fileContent.length);

      // Verify file was saved to database
      const dbFile = await prisma.repositoryFile.findFirst({
        where: {
          courseId: testCourse.id,
          mimeType: "application/pdf",
        },
      });
      expect(dbFile).toBeTruthy();
      expect(dbFile!.fileSize).toBe(fileContent.length);
      expect(dbFile!.uploadedById).toBe(instructorUser.id);
    });

    it("should upload file with folder path", async () => {
      const fileContent = Buffer.from("Test document content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "document.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("type", "REPOSITORY");
      formData.append("courseId", testCourse.id);
      formData.append("folderPath", "materials/week1");

      const request = new NextRequest("http://localhost:3000/api/files/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.file).toBeDefined();

      // Verify file was saved to database
      const dbFile = await prisma.repositoryFile.findFirst({
        where: {
          courseId: testCourse.id,
          folderPath: "materials/week1",
        },
      });
      expect(dbFile).toBeTruthy();
      if (dbFile) {
        expect(dbFile.folderPath).toBe("materials/week1");
      }
    });

    it("should reject upload without file", async () => {
      const formData = new FormData();
      formData.append("type", "REPOSITORY");
      formData.append("courseId", testCourse.id);

      const request = new NextRequest("http://localhost:3000/api/files/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("File is required");
    });

    it("should reject invalid file type", async () => {
      const fileContent = Buffer.from("Invalid content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/x-executable" });
      const file = new File([blob], "malware.exe", { type: "application/x-executable" });
      formData.append("file", file);
      formData.append("type", "REPOSITORY");
      formData.append("courseId", testCourse.id);

      const request = new NextRequest("http://localhost:3000/api/files/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Invalid file type");
    });

    it("should reject upload for unauthorized course", async () => {
      // Create another course not owned by instructor
      const otherCourse = await prisma.course.create({
        data: {
          title: "Other Course",
          description: "Another course",
          status: "PUBLISHED",
          type: "E-LEARNING",
          createdById: adminUser.id,
        },
      });

      const fileContent = Buffer.from("Test content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("type", "REPOSITORY");
      formData.append("courseId", otherCourse.id);

      const request = new NextRequest("http://localhost:3000/api/files/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.course.delete({ where: { id: otherCourse.id } });
    });

    it("should allow admin to upload to any course", async () => {
      const fileContent = Buffer.from("Admin upload content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "admin-file.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("type", "REPOSITORY");
      formData.append("courseId", testCourse.id);

      const request = new NextRequest("http://localhost:3000/api/files/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});

