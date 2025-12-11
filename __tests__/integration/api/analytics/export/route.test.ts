import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/analytics/export/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics Export API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };
  let testLearningPlan: { id: string };
  let testTest: { id: string };
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-export@test.com", "instructor-analytics-export@test.com", "other-instructor-analytics-export@test.com", "learner-analytics-export@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics-export@test.com",
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
        email: "instructor-analytics-export@test.com",
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
        email: "other-instructor-analytics-export@test.com",
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
        email: "learner-analytics-export@test.com",
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
        title: "Analytics Export Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create learning plan
    testLearningPlan = await prisma.learningPlan.create({
      data: {
        title: "Analytics Export Plan",
        description: "Test plan",
        status: "PUBLISHED",
        createdById: instructorUser.id,
      },
    });

    // Create content item and test
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Content",
        type: "TEST",
        order: 1,
      },
    });

    testTest = await prisma.test.create({
      data: {
        contentItemId: testContentItem.id,
        title: "Test Quiz",
        passingScore: 0.7,
      },
    });
  });

  afterEach(async () => {
    await prisma.testAttempt.deleteMany({ where: { testId: testTest.id } });
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.enrollment.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.learningPlan.deleteMany({ where: { id: testLearningPlan.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-export@test.com", "instructor-analytics-export@test.com", "other-instructor-analytics-export@test.com", "learner-analytics-export@test.com"] },
      },
    });
  });

  describe("POST /api/analytics/export", () => {
    it("should export course analytics as admin", async () => {
      // Create enrollment
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "COURSE",
          entityId: testCourse.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Export returns CSV text, not JSON
      const csvText = await response.text();
      expect(csvText).toBeDefined();
      expect(csvText).toContain("User ID");
      expect(csvText).toContain("First Name");
      expect(response.headers.get("Content-Type")).toBe("text/csv");
    });

    it("should export course analytics as creator", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "COURSE",
          entityId: testCourse.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          type: "COURSE",
          entityId: testCourse.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          type: "COURSE",
          entityId: testCourse.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "COURSE",
          entityId: "non-existent",
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid type", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "INVALID_TYPE",
          entityId: testCourse.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for missing entityId", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "COURSE",
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "COURSE",
          entityId: testCourse.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for unimplemented learning plan export", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "LEARNING_PLAN",
          entityId: testLearningPlan.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.message).toContain("not yet implemented");
    });

    it("should return 400 for unimplemented test export", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "TEST",
          entityId: testTest.id,
          format: "CSV",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.message).toContain("not yet implemented");
    });
  });
});

