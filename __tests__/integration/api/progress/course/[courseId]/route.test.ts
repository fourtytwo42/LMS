import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/progress/course/[courseId]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Progress Course [courseId] API", () => {
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let otherLearnerUser: { id: string; email: string };
  let otherLearnerToken: string;
  let testCourse: { id: string };
  let testContentItem1: { id: string };
  let testContentItem2: { id: string };
  let testEnrollment: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["learner-progress-course@test.com", "other-learner-progress-course@test.com"] },
      },
    });

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-progress-course@test.com",
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
        email: "other-learner-progress-course@test.com",
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
        title: "Progress Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: learnerUser.id,
      },
    });

    // Create content items
    testContentItem1 = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Content 1",
        type: "VIDEO",
        order: 1,
      },
    });

    testContentItem2 = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Content 2",
        type: "PDF",
        order: 2,
      },
    });

    // Create enrollment
    testEnrollment = await prisma.enrollment.create({
      data: {
        userId: learnerUser.id,
        courseId: testCourse.id,
        status: "ENROLLED",
      },
    });
  });

  afterEach(async () => {
    await prisma.completion.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.videoProgress.deleteMany({ where: { contentItemId: { in: [testContentItem1.id, testContentItem2.id] } } });
    await prisma.enrollment.deleteMany({ where: { id: testEnrollment.id } });
    await prisma.contentItem.deleteMany({ where: { id: { in: [testContentItem1.id, testContentItem2.id] } } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["learner-progress-course@test.com", "other-learner-progress-course@test.com"] },
      },
    });
  });

  describe("GET /api/progress/course/[courseId]", () => {
    it("should get course progress for enrolled learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courseId).toBe(testCourse.id);
      expect(data.enrollmentId).toBe(testEnrollment.id);
      expect(data.progress).toBeDefined();
      expect(data.contentItems).toBeDefined();
      expect(Array.isArray(data.contentItems)).toBe(true);
    });

    it("should return 403 for non-enrolled learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${otherLearnerToken}` },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/course/non-existent", {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`);

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(401);
    });

    it("should calculate progress with completed content items", async () => {
      // Complete one content item
      await prisma.completion.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          contentItemId: testContentItem1.id,
          completedAt: new Date(),
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.progress).toBe(50); // 1 of 2 items completed
      expect(data.contentItems[0].completed).toBe(true);
      expect(data.contentItems[1].completed).toBe(false);
    });

    it("should calculate progress with video progress", async () => {
      // Create video progress (partial watch)
      await prisma.videoProgress.create({
        data: {
          userId: learnerUser.id,
          contentItemId: testContentItem1.id,
          watchTime: 300, // 5 minutes
          totalDuration: 600, // 10 minutes
          lastWatchedAt: new Date(),
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      const videoItem = data.contentItems.find((item: any) => item.id === testContentItem1.id);
      expect(videoItem.progress).toBe(0.5); // 50% watched
      expect(videoItem.completed).toBe(false);
    });

    it("should handle course with no content items", async () => {
      // Create empty course
      const emptyCourse = await prisma.course.create({
        data: {
          title: "Empty Course",
          description: "Course with no content",
          status: "PUBLISHED",
          type: "E-LEARNING",
          createdById: learnerUser.id,
        },
      });

      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: emptyCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/course/${emptyCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: emptyCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.progress).toBe(0);
      expect(data.contentItems.length).toBe(0);

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { courseId: emptyCourse.id } });
      await prisma.course.delete({ where: { id: emptyCourse.id } });
    });

    it("should handle sequential content unlocking", async () => {
      // Complete first item
      await prisma.completion.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          contentItemId: testContentItem1.id,
          completedAt: new Date(),
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      // First item should be unlocked (order 0 or first item)
      expect(data.contentItems[0].unlocked).toBe(true);
      // Second item should be unlocked if first is completed
      expect(data.contentItems[1].unlocked).toBe(true);
    });

    it("should include test best score for test content items", async () => {
      // Create test content item
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

      const request = new NextRequest(`http://localhost:3000/api/progress/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { courseId: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      const testItem = data.contentItems.find((item: any) => item.id === testContent.id);
      expect(testItem).toBeDefined();
      expect(testItem.bestScore).toBeDefined();

      // Cleanup
      await prisma.test.delete({ where: { id: test.id } });
      await prisma.contentItem.delete({ where: { id: testContent.id } });
    });
  });
});

