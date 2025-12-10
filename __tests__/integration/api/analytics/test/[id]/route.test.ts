import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/analytics/test/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics Test [id] API", () => {
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
  let testTest: { id: string };
  let testQuestion: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-test@test.com", "instructor-analytics-test@test.com", "other-instructor-analytics-test@test.com", "learner-analytics-test@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics-test@test.com",
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
        email: "instructor-analytics-test@test.com",
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
        email: "other-instructor-analytics-test@test.com",
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
        email: "learner-analytics-test@test.com",
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
        title: "Test Course for Analytics",
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
        type: "TEST",
        order: 1,
      },
    });

    // Create test
    testTest = await prisma.test.create({
      data: {
        contentItemId: testContentItem.id,
        title: "Test Quiz",
        passingScore: 0.7,
      },
    });

    // Create question
    testQuestion = await prisma.question.create({
      data: {
        testId: testTest.id,
        type: "SINGLE_CHOICE",
        questionText: "What is 2+2?",
        points: 1.0,
        order: 1,
        options: [
          { text: "3", correct: false },
          { text: "4", correct: true },
          { text: "5", correct: false },
        ],
        correctAnswer: null,
      },
    });
  });

  afterEach(async () => {
    await prisma.testAnswer.deleteMany({ where: { attempt: { testId: testTest.id } } });
    await prisma.testAttempt.deleteMany({ where: { testId: testTest.id } });
    await prisma.question.deleteMany({ where: { testId: testTest.id } });
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-test@test.com", "instructor-analytics-test@test.com", "other-instructor-analytics-test@test.com", "learner-analytics-test@test.com"] },
      },
    });
  });

  describe("GET /api/analytics/test/:id", () => {
    it("should get test analytics as admin", async () => {
      // Create some attempts
      const attempt1 = await prisma.testAttempt.create({
        data: {
          testId: testTest.id,
          userId: learnerUser.id,
          attemptNumber: 1,
          score: 0.8,
          pointsEarned: 0.8,
          totalPoints: 1.0,
          passed: true,
          timeSpent: 120,
          submittedAt: new Date(),
        },
      });

      const attempt2 = await prisma.testAttempt.create({
        data: {
          testId: testTest.id,
          userId: learnerUser.id,
          attemptNumber: 2,
          score: 0.6,
          pointsEarned: 0.6,
          totalPoints: 1.0,
          passed: false,
          timeSpent: 100,
          submittedAt: new Date(),
        },
      });

      // Create answers
      await prisma.testAnswer.create({
        data: {
          attemptId: attempt1.id,
          questionId: testQuestion.id,
          isCorrect: true,
        },
      });

      await prisma.testAnswer.create({
        data: {
          attemptId: attempt2.id,
          questionId: testQuestion.id,
          isCorrect: false,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.testId).toBe(testTest.id);
      expect(data.totalAttempts).toBe(2);
      expect(data.passedAttempts).toBe(1);
      expect(data.passRate).toBe(50);
      expect(data.averageScore).toBeGreaterThan(0);
      expect(data.questionPerformance).toBeDefined();
      expect(data.scoreDistribution).toBeDefined();
    });

    it("should get test analytics as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
    });

    it("should return 0 values when no attempts", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalAttempts).toBe(0);
      expect(data.passedAttempts).toBe(0);
      expect(data.passRate).toBe(0);
      expect(data.averageScore).toBeDefined(); // May be 0 or undefined
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent test", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/test/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 when unauthenticated", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/test/${testTest.id}`);

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(401);
    });
  });
});

