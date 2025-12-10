import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/content/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Content [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-content-id@test.com", "instructor-content-id@test.com", "other-instructor-content-id@test.com", "learner-content-id@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-content-id@test.com",
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
        email: "instructor-content-id@test.com",
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
        email: "other-instructor-content-id@test.com",
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
        email: "learner-content-id@test.com",
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
        title: "Test Course for Content ID",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Content",
        type: "VIDEO",
        order: 1,
        videoUrl: "https://example.com/video.mp4",
      },
    });
  });

  afterEach(async () => {
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-content-id@test.com", "instructor-content-id@test.com", "other-instructor-content-id@test.com", "learner-content-id@test.com"] },
      },
    });
  });

  describe("GET /api/content/:id", () => {
    it("should get content item as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testContentItem.id);
    });

    it("should get content item as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
    });

    it("should get content item as enrolled learner", async () => {
      // Enroll learner
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
    });

    it("should return 404 for non-existent content item", async () => {
      const request = new NextRequest("http://localhost:3000/api/content/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 403 for unenrolled learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should get content item from public course", async () => {
      // Create public course
      const publicCourse = await prisma.course.create({
        data: {
          title: "Public Course",
          description: "Public course",
          status: "PUBLISHED",
          type: "E-LEARNING",
          publicAccess: true,
          createdById: instructorUser.id,
        },
      });

      const publicContentItem = await prisma.contentItem.create({
        data: {
          courseId: publicCourse.id,
          title: "Public Content",
          type: "VIDEO",
          order: 1,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${publicContentItem.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: publicContentItem.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.contentItem.delete({ where: { id: publicContentItem.id } });
      await prisma.course.delete({ where: { id: publicCourse.id } });
    });

    it("should get content item as assigned instructor", async () => {
      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`);

      const response = await GET(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(401);
    });

    it("should return content item without test", async () => {
      // Create content item without test
      const contentWithoutTest = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Content Without Test",
          type: "VIDEO",
          order: 2,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${contentWithoutTest.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: contentWithoutTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.test).toBeNull();

      // Cleanup
      await prisma.contentItem.delete({ where: { id: contentWithoutTest.id } });
    });

    it("should return content item with test", async () => {
      // Create content item with test
      const testContent = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Test Content",
          type: "TEST",
          order: 3,
        },
      });

      const test = await prisma.test.create({
        data: {
          contentItemId: testContent.id,
          title: "Test Quiz",
          passingScore: 0.7,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${testContent.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testContent.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.test).toBeDefined();
      expect(data.test.id).toBe(test.id);

      // Cleanup
      await prisma.test.delete({ where: { id: test.id } });
      await prisma.contentItem.delete({ where: { id: testContent.id } });
    });
  });

  describe("PUT /api/content/:id", () => {
    it("should update content item as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contentItem.title).toBe("Updated Title");
    });

    it("should update content item as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({ description: "Updated description" }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({ title: "Unauthorized" }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({ title: "Learner update" }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should update content item as assigned instructor", async () => {
      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({ title: "Updated by assigned instructor" }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should handle empty string URLs", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          videoUrl: "",
          pdfUrl: "",
          pptUrl: "",
          externalUrl: "",
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contentItem).toBeDefined();
    });

    it("should handle partial updates", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          order: 5,
          priority: 2,
          required: true,
          completionThreshold: 0.9,
          allowSeeking: false,
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contentItem.order).toBe(5);
    });

    it("should return 400 for validation errors", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          title: "", // Empty title should fail validation
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/content/:id", () => {
    it("should delete content item as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await DELETE(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      // Verify deleted
      const deleted = await prisma.contentItem.findUnique({ where: { id: testContentItem.id } });
      expect(deleted).toBeNull();
    });

    it("should delete content item as creator", async () => {
      // Create another content item
      const anotherContentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Another Content",
          type: "PDF",
          order: 2,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${anotherContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await DELETE(request, { params: { id: anotherContentItem.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await DELETE(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await DELETE(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should delete content item as assigned instructor", async () => {
      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      // Create another content item
      const anotherContentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Content to Delete",
          type: "PDF",
          order: 3,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${anotherContentItem.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await DELETE(request, { params: { id: anotherContentItem.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });
  });
});

