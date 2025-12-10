import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/repository/content/upload/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { getFullFilePath } from "@/lib/storage/file-upload";

describe("Repository Content Upload API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-repo-upload@test.com", "instructor-repo-upload@test.com", "learner-repo-upload@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-repo-upload@test.com",
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
        email: "instructor-repo-upload@test.com",
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

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-repo-upload@test.com",
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
  });

  afterEach(async () => {
    // Clean up uploaded files
    const uploadedItems = await prisma.contentRepository.findMany({
      where: {
        uploadedById: { in: [adminUser.id, instructorUser.id] },
      },
    });

    for (const item of uploadedItems) {
      try {
        const filePath = getFullFilePath(item.filePath);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (e) {
        // Ignore errors
      }
    }

    await prisma.contentRepository.deleteMany({
      where: {
        uploadedById: { in: [adminUser.id, instructorUser.id] },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-repo-upload@test.com", "instructor-repo-upload@test.com", "learner-repo-upload@test.com"] },
      },
    });
  });

  describe("POST /api/repository/content/upload", () => {
    it("should upload content to repository as admin", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("name", "Test Content");
      formData.append("description", "Test description");
      formData.append("type", "PDF");

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.contentItem).toBeDefined();
      expect(data.contentItem.name).toBe("Test Content");
    });

    it("should upload content to repository as instructor", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "video/mp4" });
      const file = new File([blob], "test.mp4", { type: "video/mp4" });
      formData.append("file", file);
      formData.append("name", "Test Video");
      formData.append("description", "Test video description");
      formData.append("type", "VIDEO");

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.contentItem).toBeDefined();
    });

    it("should return 403 for learner", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("name", "Test Content");
      formData.append("type", "PDF");

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 400 for missing file", async () => {
      const formData = new FormData();
      formData.append("name", "Test Content");
      formData.append("type", "PDF");

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for missing name", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("type", "PDF");
      // Missing name

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid file type", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "text/plain" });
      const file = new File([blob], "test.txt", { type: "text/plain" });
      formData.append("file", file);
      formData.append("name", "Test Content");
      formData.append("type", "PDF"); // Type is PDF but file is text

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should upload with folder path and tags", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("name", "Test Content with Tags");
      formData.append("description", "Test description");
      formData.append("type", "PDF");
      formData.append("folderPath", "/test/folder");
      formData.append("tags", "tag1, tag2, tag3");

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.contentItem).toBeDefined();
      expect(data.contentItem.folderPath).toBe("/test/folder");
      expect(data.contentItem.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should return 401 for unauthenticated request", async () => {
      const fileContent = Buffer.from("Test file content");
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: "application/pdf" });
      const file = new File([blob], "test.pdf", { type: "application/pdf" });
      formData.append("file", file);
      formData.append("name", "Test Content");
      formData.append("type", "PDF");

      const request = new NextRequest("http://localhost:3000/api/repository/content/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});

