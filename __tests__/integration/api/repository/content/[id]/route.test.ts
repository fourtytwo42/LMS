import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, DELETE } from "@/app/api/repository/content/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Repository Content [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-repo-content@test.com", "instructor-repo-content@test.com", "learner-repo-content@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-repo-content@test.com",
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
        email: "instructor-repo-content@test.com",
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
        email: "learner-repo-content@test.com",
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

    // Create content repository item
    testContentItem = await prisma.contentRepository.create({
      data: {
        name: "Test Content",
        description: "Test content item",
        type: "VIDEO",
        filePath: "/test/path/video.mp4",
        fileSize: 1024,
        mimeType: "video/mp4",
        uploadedById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.contentRepository.deleteMany({ where: { id: testContentItem.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-repo-content@test.com", "instructor-repo-content@test.com", "learner-repo-content@test.com"] },
      },
    });
  });

  describe("GET /api/repository/content/[id]", () => {
    it("should get content item as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItem).toBeDefined();
      expect(data.contentItem.id).toBe(testContentItem.id);
      expect(data.contentItem.name).toBe("Test Content");
    });

    it("should get content item as instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItem).toBeDefined();
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent content item", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`);

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/repository/content/[id]", () => {
    it("should delete content item as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await DELETE(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      // Verify deleted
      const deleted = await prisma.contentRepository.findUnique({ where: { id: testContentItem.id } });
      expect(deleted).toBeNull();
    });

    it("should delete content item as instructor", async () => {
      // Create another content item for this test
      const anotherItem = await prisma.contentRepository.create({
        data: {
          name: "Another Content",
          description: "Another content item",
          type: "PDF",
          filePath: "/test/path/doc.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
          uploadedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/repository/content/${anotherItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await DELETE(request, { params: { id: anotherItem.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await DELETE(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent content item", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content/non-existent", {
        method: "DELETE",
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await DELETE(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/repository/content/${testContentItem.id}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(401);
    });
  });
});

