import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/progress/test/[testId]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Progress Test [testId] API", () => {
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };
  let testTest: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["learner-progress-testid@test.com", "instructor-progress-testid@test.com"] },
      },
    });

    // Create instructor
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-progress-testid@test.com",
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
        email: "learner-progress-testid@test.com",
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
        title: "Test Course for Progress TestId",
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
        maxAttempts: 3,
      },
    });
  });

  afterEach(async () => {
    await prisma.testAttempt.deleteMany({ where: { testId: testTest.id } });
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["learner-progress-testid@test.com", "instructor-progress-testid@test.com"] },
      },
    });
  });

  describe("GET /api/progress/test/:testId", () => {
    it("should get test progress for learner", async () => {
      // Create some attempts
      await prisma.testAttempt.create({
        data: {
          testId: testTest.id,
          userId: learnerUser.id,
          attemptNumber: 1,
          score: 0.8,
          pointsEarned: 1.6,
          totalPoints: 2.0,
          passed: true,
          timeSpent: 120,
          submittedAt: new Date(),
        },
      });

      await prisma.testAttempt.create({
        data: {
          testId: testTest.id,
          userId: learnerUser.id,
          attemptNumber: 2,
          score: 0.6,
          pointsEarned: 1.2,
          totalPoints: 2.0,
          passed: false,
          timeSpent: 100,
          submittedAt: new Date(),
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { testId: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.testId).toBe(testTest.id);
      expect(data.attempts).toBeDefined();
      expect(data.attempts.length).toBe(2);
      expect(data.bestScore).toBe(0.8);
      expect(data.canRetake).toBe(true);
      expect(data.remainingAttempts).toBe(1); // maxAttempts is 3, 2 attempts made
    });

    it("should show no remaining attempts when max reached", async () => {
      // Create max attempts
      for (let i = 0; i < 3; i++) {
        await prisma.testAttempt.create({
          data: {
            testId: testTest.id,
            userId: learnerUser.id,
            attemptNumber: i + 1,
            score: 0.5,
            pointsEarned: 1.0,
            totalPoints: 2.0,
            passed: false,
            timeSpent: 120,
            submittedAt: new Date(),
          },
        });
      }

      const request = new NextRequest(`http://localhost:3000/api/progress/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { testId: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.canRetake).toBe(false);
      expect(data.remainingAttempts).toBe(0);
    });

    it("should handle test with no max attempts", async () => {
      // Update test to have no max attempts
      await prisma.test.update({
        where: { id: testTest.id },
        data: { maxAttempts: null },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { testId: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.canRetake).toBe(true);
      expect(data.remainingAttempts).toBeNull();
    });

    it("should return empty attempts array when no attempts", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/test/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { testId: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.attempts).toEqual([]);
      expect(data.bestScore).toBe(0);
    });

    it("should return 404 for non-existent test", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/test/non-existent", {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { testId: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 when unauthenticated", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/test/${testTest.id}`);

      const response = await GET(request, { params: { testId: testTest.id } });
      expect(response.status).toBe(401);
    });
  });
});

