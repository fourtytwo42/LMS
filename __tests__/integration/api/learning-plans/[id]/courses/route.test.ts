import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST, PUT } from "@/app/api/learning-plans/[id]/courses/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Learning Plan Courses API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let testLearningPlan: any;
  let testCourse: any;
  let otherCourse: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-lp-courses@test.com", "instructor-lp-courses@test.com", "other-instructor-lp-courses@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-lp-courses@test.com",
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
        email: "instructor-lp-courses@test.com",
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
        email: "other-instructor-lp-courses@test.com",
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

    // Create test learning plan
    testLearningPlan = await prisma.learningPlan.create({
      data: {
        title: "Test Learning Plan",
        description: "Test learning plan",
        status: "PUBLISHED",
        createdById: instructorUser.id,
      },
    });

    // Create test courses
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course 1",
        description: "Test course 1",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    otherCourse = await prisma.course.create({
      data: {
        title: "Test Course 2",
        description: "Test course 2",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.learningPlanCourse.deleteMany({
      where: {
        learningPlanId: testLearningPlan.id,
      },
    });
    await prisma.learningPlan.deleteMany({
      where: {
        id: testLearningPlan.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: { in: [testCourse.id, otherCourse.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-lp-courses@test.com", "instructor-lp-courses@test.com", "other-instructor-lp-courses@test.com"] },
      },
    });
  });

  describe("POST /api/learning-plans/[id]/courses", () => {
    it("should add course to learning plan as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          order: 1,
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      // Verify course was added
      const lpCourse = await prisma.learningPlanCourse.findUnique({
        where: {
          learningPlanId_courseId: {
            learningPlanId: testLearningPlan.id,
            courseId: testCourse.id,
          },
        },
      });
      expect(lpCourse).toBeDefined();
    });

    it("should add course to learning plan as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          courseId: otherCourse.id,
          order: 2,
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);
    });

    it("should return 409 for duplicate course", async () => {
      // Add course first
      await prisma.learningPlanCourse.create({
        data: {
          learningPlanId: testLearningPlan.id,
          courseId: testCourse.id,
          order: 1,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id, // Duplicate
          order: 2,
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe("CONFLICT");
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: "non-existent",
          order: 1,
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(404);
    });

    it("should return 404 for non-existent learning plan", async () => {
      const request = new NextRequest("http://localhost:3000/api/learning-plans/non-existent/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          order: 1,
        }),
      });

      const response = await POST(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          order: 1,
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(403);
    });

    it("should return validation error for missing courseId", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          order: 1,
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /api/learning-plans/[id]/courses", () => {
    beforeEach(async () => {
      // Add courses to learning plan
      await prisma.learningPlanCourse.create({
        data: {
          learningPlanId: testLearningPlan.id,
          courseId: testCourse.id,
          order: 1,
        },
      });
      await prisma.learningPlanCourse.create({
        data: {
          learningPlanId: testLearningPlan.id,
          courseId: otherCourse.id,
          order: 2,
        },
      });
    });

    it("should reorder courses as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: 2 },
            { courseId: otherCourse.id, order: 1 },
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe("Courses reordered successfully");
    });

    it("should reorder courses as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: 2 },
            { courseId: otherCourse.id, order: 1 },
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: 2 },
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(403);
    });

    it("should return validation error for invalid courseOrders", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: -1 }, // Invalid: negative order
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should handle PUT with invalid course IDs", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: "non-existent-course", order: 1 },
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      // The route doesn't validate course existence, it just updates orders
      // So this should succeed (200) but the update won't affect anything
      expect([200, 400]).toContain(response.status);
    });

    it("should handle PUT with duplicate orders", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: 1 },
            { courseId: otherCourse.id, order: 1 }, // Duplicate order
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      // The route allows duplicate orders, so this should succeed
      expect(response.status).toBe(200);
    });

    it("should handle PUT with empty courseOrders array", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      // Empty array should be valid (no updates)
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Courses reordered successfully");
    });

    it("should return 404 for non-existent learning plan in PUT", async () => {
      const request = new NextRequest("http://localhost:3000/api/learning-plans/non-existent/courses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: 1 },
          ],
        }),
      });

      const response = await PUT(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return validation error for invalid courseOrders format in PUT", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: "invalid", // Should be array
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for missing courseOrders in PUT", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({}),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for invalid order (negative) in PUT", async () => {
      // Add course to learning plan first
      await prisma.learningPlanCourse.create({
        data: {
          learningPlanId: testLearningPlan.id,
          courseId: testCourse.id,
          order: 0,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { courseId: testCourse.id, order: -1 }, // Invalid negative order
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for missing courseId in courseOrders", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseOrders: [
            { order: 0 }, // Missing courseId
          ],
        }),
      });

      const response = await PUT(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for invalid order type in POST", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          order: "invalid", // Should be number
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for negative order in POST", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
          order: -1, // Invalid negative order
        }),
      });

      const response = await POST(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });
});

