import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/progress/video/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Video Progress API", () => {
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "learner-progress@test.com",
      },
    });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-progress@test.com",
        passwordHash: learnerPasswordHash,
        firstName: "Learner",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "LEARNER" },
                create: {
                  name: "LEARNER",
                  description: "Learner role",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    learnerToken = generateToken({
      userId: learnerUser.id,
      email: learnerUser.email,
      roles: ["LEARNER"],
    });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course Progress",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: learnerUser.id,
      },
    });

    // Enroll learner in course
    await prisma.enrollment.create({
      data: {
        userId: learnerUser.id,
        courseId: testCourse.id,
        status: "ENROLLED",
      },
    });

    // Create test content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Video",
        type: "VIDEO",
        order: 1,
        videoUrl: "videos/test.mp4",
      },
    });
  });

  afterEach(async () => {
    await prisma.videoProgress.deleteMany({
      where: {
        userId: learnerUser.id,
      },
    });
    await prisma.enrollment.deleteMany({
      where: {
        userId: learnerUser.id,
        courseId: testCourse.id,
      },
    });
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
        email: "learner-progress@test.com",
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: "LEARNER",
        users: {
          none: {},
        },
      },
    });
  });

  describe("POST /api/progress/video", () => {
    it("should update video progress", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          watchTime: 30,
          totalDuration: 120,
          lastPosition: 0.25,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.progress).toBeDefined();
      expect(data.progress.watchTime).toBe(30);
    });

    it("should mark video as completed when watchTime >= totalDuration", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          watchTime: 120,
          totalDuration: 120,
          lastPosition: 1.0,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.progress.completed).toBe(true);
    });
  });
});

