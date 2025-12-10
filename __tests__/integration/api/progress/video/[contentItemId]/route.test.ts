import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/progress/video/[contentItemId]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Progress Video [contentItemId] API", () => {
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: "learner-progress-video-id@test.com",
      },
    });

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-progress-video-id@test.com",
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
        title: "Test Course for Video Progress",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: learnerUser.id,
      },
    });

    // Create content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Video",
        type: "VIDEO",
        order: 1,
        videoUrl: "https://example.com/video.mp4",
        videoDuration: 600, // 10 minutes
      },
    });
  });

  afterEach(async () => {
    await prisma.videoProgress.deleteMany({ where: { contentItemId: testContentItem.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: "learner-progress-video-id@test.com",
      },
    });
  });

  describe("GET /api/progress/video/:contentItemId", () => {
    it("should get video progress for user", async () => {
      // Create video progress
      await prisma.videoProgress.create({
        data: {
          userId: learnerUser.id,
          contentItemId: testContentItem.id,
          watchTime: 300,
          totalDuration: 600,
          lastPosition: 300,
          timesWatched: 1,
          completed: false,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/progress/video/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { contentItemId: testContentItem.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contentItemId).toBe(testContentItem.id);
      expect(data.watchTime).toBe(300);
      expect(data.totalDuration).toBe(600);
      expect(data.lastPosition).toBe(300);
      expect(data.timesWatched).toBe(1);
    });

    it("should return default values when no progress exists", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/video/${testContentItem.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { contentItemId: testContentItem.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contentItemId).toBe(testContentItem.id);
      expect(data.watchTime).toBe(0);
      expect(data.totalDuration).toBe(0);
      expect(data.lastPosition).toBe(0);
      expect(data.timesWatched).toBe(0);
      expect(data.completed).toBe(false);
    });

    it("should return 401 when unauthenticated", async () => {
      const request = new NextRequest(`http://localhost:3000/api/progress/video/${testContentItem.id}`);

      const response = await GET(request, { params: { contentItemId: testContentItem.id } });
      expect(response.status).toBe(401);
    });
  });
});

