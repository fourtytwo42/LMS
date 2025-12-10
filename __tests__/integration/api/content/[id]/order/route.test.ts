import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PUT } from "@/app/api/content/[id]/order/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Content Order API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let testCourse: any;
  let testContentItem: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-order@test.com", "instructor-order@test.com", "other-instructor-order@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-order@test.com",
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
        email: "instructor-order@test.com",
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

    // Create other instructor user
    const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
    otherInstructorUser = await prisma.user.create({
      data: {
        email: "other-instructor-order@test.com",
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
                  description: "Instructor",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    otherInstructorToken = generateToken({ userId: otherInstructorUser.id, email: otherInstructorUser.email, roles: ["INSTRUCTOR"] });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course for Order",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create test content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Content",
        type: "VIDEO",
        order: 1,
      },
    });
  });

  afterEach(async () => {
    await prisma.contentItem.deleteMany({
      where: {
        id: testContentItem.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: testCourse.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-order@test.com", "instructor-order@test.com", "other-instructor-order@test.com"] },
      },
    });
  });

  describe("PUT /api/content/[id]/order", () => {
    it("should update order as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          order: 2,
          priority: 1,
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItem.order).toBe(2);
      expect(data.contentItem.priority).toBe(1);
    });

    it("should update order as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          order: 3,
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);
    });

    it("should update order as assigned instructor", async () => {
      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          order: 4,
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return validation error for negative order", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          order: -1, // Invalid: negative order
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          order: 2,
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent content item", async () => {
      const request = new NextRequest("http://localhost:3000/api/content/non-existent/order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          order: 1,
        }),
      });

      const response = await PUT(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/content/${testContentItem.id}/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: 1,
        }),
      });

      const response = await PUT(request, { params: { id: testContentItem.id } });
      expect(response.status).toBe(401);
    });
  });
});

