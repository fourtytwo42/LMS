import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/files/[id]/download/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getFullFilePath } from "@/lib/storage/file-upload";

describe("File Download API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testFile: { id: string; filePath: string };
  let testCourse: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-download@test.com", "instructor-download@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-download@test.com",
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
        email: "instructor-download@test.com",
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
        title: "Test Download Course",
        description: "Test course for file downloads",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create actual file on disk
    const filePath = "repository/test-download-course/test-file.pdf";
    const fullPath = getFullFilePath(filePath);
    const dir = join(fullPath, "..");
    
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    const fileContent = Buffer.from("This is test file content for download testing");
    await writeFile(fullPath, fileContent);

    // Create test file record
    testFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test-file.pdf",
        filePath: filePath,
        fileSize: fileContent.length,
        mimeType: "application/pdf",
        uploadedById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    // Delete physical file
    if (testFile?.filePath) {
      const fullPath = getFullFilePath(testFile.filePath);
      if (existsSync(fullPath)) {
        await unlink(fullPath).catch(() => {});
      }
    }

    await prisma.repositoryFile.deleteMany({
      where: {
        id: testFile?.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        title: "Test Download Course",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-download@test.com", "instructor-download@test.com"] },
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

  describe("GET /api/files/:id/download", () => {
    it("should download file as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}/download`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Disposition")).toContain("attachment");

      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer.toString()).toBe("This is test file content for download testing");
    });

    it("should download file as uploader", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}/download`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer.toString()).toBe("This is test file content for download testing");
    });

    it("should increment download count", async () => {
      const initialCount = (await prisma.repositoryFile.findUnique({
        where: { id: testFile.id },
      }))!.downloadCount;

      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}/download`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      await GET(request, { params: { id: testFile.id } });

      const updated = await prisma.repositoryFile.findUnique({
        where: { id: testFile.id },
      });
      expect(updated!.downloadCount).toBe(initialCount + 1);
    });

    it("should create file download record", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}/download`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      await GET(request, { params: { id: testFile.id } });

      const download = await prisma.fileDownload.findFirst({
        where: {
          fileId: testFile.id,
          userId: adminUser.id,
        },
      });
      expect(download).toBeTruthy();
    });

    it("should return 404 for non-existent file", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/non-existent/download", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should deny download for unauthorized user", async () => {
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "learner-download@test.com",
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

      const learnerToken = generateToken({
        userId: learnerUser.id,
        email: learnerUser.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}/download`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });
  });
});

