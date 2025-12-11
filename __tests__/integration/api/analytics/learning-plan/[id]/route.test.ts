import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/analytics/learning-plan/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics Learning Plan [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testLearningPlan: { id: string };
  let testCourse: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-lp@test.com", "instructor-analytics-lp@test.com", "other-instructor-analytics-lp@test.com", "learner-analytics-lp@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics-lp@test.com",
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
        email: "instructor-analytics-lp@test.com",
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
        email: "other-instructor-analytics-lp@test.com",
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
        email: "learner-analytics-lp@test.com",
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

    // Create learning plan
    testLearningPlan = await prisma.learningPlan.create({
      data: {
        title: "Analytics Test Plan",
        description: "Test plan",
        status: "PUBLISHED",
        createdById: instructorUser.id,
      },
    });

    // Create course
    testCourse = await prisma.course.create({
      data: {
        title: "Analytics Test Course",
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
    // Best practice: Safe cleanup with error handling
    try {
      if (testLearningPlan?.id) {
        await prisma.enrollment.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
        await prisma.completion.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
        await prisma.learningPlanCourse.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
        await prisma.learningPlan.deleteMany({ where: { id: testLearningPlan.id } });
      }
      if (testCourse?.id) {
        await prisma.course.deleteMany({ where: { id: testCourse.id } });
      }
    } catch (error) {
      console.error("Cleanup error in afterEach:", error);
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-lp@test.com", "instructor-analytics-lp@test.com", "other-instructor-analytics-lp@test.com", "learner-analytics-lp@test.com"] },
      },
    });
  });

  describe("GET /api/analytics/learning-plan/[id]", () => {
    it("should get learning plan analytics as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments).toBeDefined();
      expect(data.completionRate).toBeDefined();
      expect(data.courses).toBeDefined(); // Route returns 'courses', not 'courseAnalytics'
    });

    it("should get learning plan analytics as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments).toBeDefined();
    });

    it("should get learning plan analytics as assigned instructor", async () => {
      // Assign other instructor
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          learningPlanId: testLearningPlan.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent learning plan", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/learning-plan/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`);

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(401);
    });

    it("should calculate enrollment statistics correctly", async () => {
      // Create enrollments with different statuses
      await prisma.enrollment.createMany({
        data: [
          {
            userId: learnerUser.id,
            learningPlanId: testLearningPlan.id,
            status: "IN_PROGRESS",
          },
          {
            userId: adminUser.id,
            learningPlanId: testLearningPlan.id,
            status: "COMPLETED",
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.total).toBe(2);
      expect(data.enrollments.active).toBe(1);
      expect(data.enrollments.completed).toBe(1);
    });

    it("should handle learning plan with no enrollments", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/learning-plan/${testLearningPlan.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testLearningPlan.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.total).toBe(0);
      expect(data.completionRate).toBe(0);
    });
  });
});

