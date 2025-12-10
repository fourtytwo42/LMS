import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/files/[id]/stream/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getFullFilePath } from "@/lib/storage/file-upload";

describe("File Stream API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testVideoFile: { id: string; filePath: string };
  let testCourse: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-stream@test.com", "instructor-stream@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-stream@test.com",
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
        email: "instructor-stream@test.com",
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
        title: "Test Stream Course",
        description: "Test course for file streaming",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create actual video file on disk (simulated with text content)
    const filePath = "repository/test-stream-course/test-video.mp4";
    const fullPath = getFullFilePath(filePath);
    const dir = join(fullPath, "..");
    
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    // Create a file with known content for range testing
    const fileContent = Buffer.from("This is test video content for streaming testing with range requests");
    await writeFile(fullPath, fileContent);

    // Create test file record
    testVideoFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test-video.mp4",
        filePath: filePath,
        fileSize: fileContent.length,
        mimeType: "video/mp4",
        uploadedById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    // Delete physical file
    if (testVideoFile?.filePath) {
      const fullPath = getFullFilePath(testVideoFile.filePath);
      if (existsSync(fullPath)) {
        await unlink(fullPath).catch(() => {});
      }
    }

    await prisma.repositoryFile.deleteMany({
      where: {
        id: testVideoFile?.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        title: "Test Stream Course",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-stream@test.com", "instructor-stream@test.com"] },
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

  describe("GET /api/files/:id/stream", () => {
    it("should stream video file without range", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testVideoFile.id}/stream`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: testVideoFile.id } });
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("video/mp4");
      expect(response.headers.get("Accept-Ranges")).toBe("bytes");

      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer.toString()).toBe("This is test video content for streaming testing with range requests");
    });

    it("should stream video file with range request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testVideoFile.id}/stream`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
          range: "bytes=0-9",
        },
      });

      const response = await GET(request, { params: { id: testVideoFile.id } });
      expect(response.status).toBe(206);
      expect(response.headers.get("Content-Range")).toBeTruthy();
      expect(response.headers.get("Content-Range")).toContain("bytes 0-9/");
      expect(response.headers.get("Accept-Ranges")).toBe("bytes");

      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer.toString()).toBe("This is te");
    });

    it("should stream video file with partial range", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testVideoFile.id}/stream`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
          range: "bytes=10-19",
        },
      });

      const response = await GET(request, { params: { id: testVideoFile.id } });
      expect(response.status).toBe(206);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer.toString()).toBe("st video c");
    });

    it("should reject streaming non-video files", async () => {
      // Create a PDF file
      const pdfPath = "repository/test-stream-course/test.pdf";
      const fullPdfPath = getFullFilePath(pdfPath);
      const dir = join(fullPdfPath, "..");
      
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      
      await writeFile(fullPdfPath, Buffer.from("PDF content"));

      const pdfFile = await prisma.repositoryFile.create({
        data: {
          courseId: testCourse.id,
          fileName: "test.pdf",
          filePath: pdfPath,
          fileSize: 10,
          mimeType: "application/pdf",
          uploadedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/files/${pdfFile.id}/stream`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: pdfFile.id } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Streaming is only available for video files");

      // Cleanup
      await unlink(fullPdfPath).catch(() => {});
      await prisma.repositoryFile.delete({ where: { id: pdfFile.id } });
    });

    it("should return 404 for non-existent file", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/non-existent/stream", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should deny streaming for unauthorized user", async () => {
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "learner-stream@test.com",
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

      const request = new NextRequest(`http://localhost:3000/api/files/${testVideoFile.id}/stream`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { id: testVideoFile.id } });
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });
  });
});

