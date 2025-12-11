import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DELETE } from "@/app/api/learning-plans/[id]/courses/[courseId]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Learning Plan Course Delete API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let testLearningPlan: any;
  let testCourse: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-lp-del@test.com", "instructor-lp-del@test.com", "other-instructor-lp-del@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-lp-del@test.com",
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
        email: "instructor-lp-del@test.com",
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
        email: "other-instructor-lp-del@test.com",
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

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Add course to learning plan
    await prisma.learningPlanCourse.create({
      data: {
        learningPlanId: testLearningPlan.id,
        courseId: testCourse.id,
        order: 1,
      },
    });
  });

  afterEach(async () => {
    // Use optional chaining and nullish coalescing for safe cleanup
    // Best practice: Always check if variables exist before using them
    try {
      if (testLearningPlan?.id) {
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
      }
      if (testCourse?.id) {
        await prisma.course.deleteMany({
          where: {
            id: testCourse.id,
          },
        });
      }
    } catch (error) {
      // Log but don't throw - cleanup errors shouldn't fail tests
      console.error("Cleanup error in afterEach:", error);
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-lp-del@test.com", "instructor-lp-del@test.com", "other-instructor-lp-del@test.com"] },
      },
    });
  });

  describe("DELETE /api/learning-plans/[id]/courses/[courseId]", () => {
    it("should remove course from learning plan as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses/${testCourse.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testLearningPlan.id, courseId: testCourse.id } });
      expect(response.status).toBe(200);

      // Verify course was removed
      const lpCourse = await prisma.learningPlanCourse.findUnique({
        where: {
          learningPlanId_courseId: {
            learningPlanId: testLearningPlan.id,
            courseId: testCourse.id,
          },
        },
      });
      expect(lpCourse).toBeNull();
    });

    it("should remove course from learning plan as creator", async () => {
      // Course is already added in beforeEach, so we can just test deletion

      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses/${testCourse.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testLearningPlan.id, courseId: testCourse.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses/${testCourse.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testLearningPlan.id, courseId: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent learning plan", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/non-existent/courses/${testCourse.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "non-existent", courseId: testCourse.id } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/learning-plans/${testLearningPlan.id}/courses/${testCourse.id}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: testLearningPlan.id, courseId: testCourse.id } });
      expect(response.status).toBe(401);
    });
  });
});

