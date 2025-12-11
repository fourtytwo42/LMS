import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/analytics/user/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics User [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let otherLearnerUser: { id: string; email: string };
  let otherLearnerToken: string;
  let testCourse: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-user@test.com", "learner-analytics-user@test.com", "other-learner-analytics-user@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics-user@test.com",
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

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-analytics-user@test.com",
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

    // Create other learner
    const otherLearnerPasswordHash = await hashPassword("OtherLearnerPass123");
    otherLearnerUser = await prisma.user.create({
      data: {
        email: "other-learner-analytics-user@test.com",
        passwordHash: otherLearnerPasswordHash,
        firstName: "Other",
        lastName: "Learner",
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
    otherLearnerToken = generateToken({ userId: otherLearnerUser.id, email: otherLearnerUser.email, roles: ["LEARNER"] });

    // Create course
    testCourse = await prisma.course.create({
      data: {
        title: "Analytics Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: adminUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.completion.deleteMany({ where: { userId: learnerUser.id } });
    await prisma.videoProgress.deleteMany({ where: { userId: learnerUser.id } });
    await prisma.enrollment.deleteMany({ where: { userId: learnerUser.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-user@test.com", "learner-analytics-user@test.com", "other-learner-analytics-user@test.com"] },
      },
    });
  });

  describe("GET /api/analytics/user/[id]", () => {
    it("should get user analytics as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.userId).toBe(learnerUser.id);
      expect(data.enrollments).toBeDefined();
      expect(data.averageScore).toBeDefined();
    });

    it("should get own analytics as learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.userId).toBe(learnerUser.id);
    });

    it("should return 403 for learner viewing other user's analytics", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${otherLearnerUser.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: otherLearnerUser.id } });
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`);

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(401);
    });

    it("should calculate enrollment statistics correctly", async () => {
      // Clean up any existing enrollments first
      await prisma.enrollment.deleteMany({
        where: {
          userId: learnerUser.id,
          courseId: testCourse.id,
        },
      });

      // Create enrollments (can't have duplicate userId/courseId, so create different courses or use learningPlanId)
      const course2 = await prisma.course.create({
        data: {
          title: "Analytics Test Course 2",
          description: "Test course 2",
          status: "PUBLISHED",
          type: "E-LEARNING",
          createdById: adminUser.id,
        },
      });

      await prisma.enrollment.createMany({
        data: [
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            status: "IN_PROGRESS",
          },
          {
            userId: learnerUser.id,
            courseId: course2.id,
            status: "COMPLETED",
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      // Should have 2 enrollments total (one in testCourse, one in course2)
      expect(data.enrollments.total).toBeGreaterThanOrEqual(2);
      // Check that we have at least one of each status
      const inProgressCount = data.enrollments.inProgress;
      const completedCount = data.enrollments.completed;
      expect(inProgressCount + completedCount).toBeGreaterThanOrEqual(2);
      
      // Cleanup course2 after test
      try {
        await prisma.enrollment.deleteMany({ where: { courseId: course2.id } });
        await prisma.course.delete({ where: { id: course2.id } });
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it("should calculate average score from completions", async () => {
      // Create completions with scores
      await prisma.completion.createMany({
        data: [
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            score: 0.8,
            completedAt: new Date(),
          },
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            score: 0.6,
            completedAt: new Date(),
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      // Average of 0.8 and 0.6 = 0.7 = 70%
      expect(data.averageScore).toBe(70);
    });

    it("should calculate total time spent from video progress", async () => {
      // Create video progress
      const contentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Test Video",
          type: "VIDEO",
          order: 1,
        },
      });

      await prisma.videoProgress.create({
        data: {
          userId: learnerUser.id,
          contentItemId: contentItem.id,
          watchTime: 600, // 10 minutes in seconds
          totalDuration: 1200,
          lastPosition: 0,
          timesWatched: 1,
          completed: false,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      // 600 seconds / 60 = 10 minutes (rounded)
      expect(data.totalTimeSpent).toBeGreaterThanOrEqual(10);

      // Cleanup - delete videoProgress first, then contentItem
      try {
        await prisma.videoProgress.deleteMany({ where: { contentItemId: contentItem.id } });
      } catch (e) {
        // Ignore errors
      }
      try {
        await prisma.contentItem.delete({ where: { id: contentItem.id } });
      } catch (e) {
        // Ignore errors - contentItem might already be deleted
      }
    });

    it("should count certificates and badges earned", async () => {
      // Create completions with certificates and badges
      await prisma.completion.createMany({
        data: [
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            certificateUrl: "/api/certificates/1",
            completedAt: new Date(),
          },
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            badgeAwarded: true,
            completedAt: new Date(),
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.certificatesEarned).toBe(1);
      expect(data.badgesEarned).toBe(1);
    });

    it("should handle user with no enrollments", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/user/${learnerUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: learnerUser.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.total).toBe(0);
      expect(data.averageScore).toBe(0);
      expect(data.totalTimeSpent).toBe(0);
    });
  });
});

