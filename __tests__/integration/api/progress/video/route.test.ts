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

    it("should require authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          watchTime: 10,
          totalDuration: 20,
          lastPosition: 0.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent content item", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: "non-existent-id",
          watchTime: 10,
          totalDuration: 20,
          lastPosition: 0.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 400 for non-video content item", async () => {
      const pdfContentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Test PDF",
          type: "PDF",
          order: 2,
          pdfUrl: "pdfs/test.pdf",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: pdfContentItem.id,
          watchTime: 10,
          totalDuration: 20,
          lastPosition: 0.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("BAD_REQUEST");
      expect(data.message).toContain("not a video");

      await prisma.contentItem.delete({ where: { id: pdfContentItem.id } });
    });

    it("should return 403 for non-enrolled user", async () => {
      const otherLearnerPasswordHash = await hashPassword("OtherPass123");
      const otherLearner = await prisma.user.create({
        data: {
          email: "other-learner-progress@test.com",
          passwordHash: otherLearnerPasswordHash,
          firstName: "Other",
          lastName: "Learner",
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
      const otherLearnerToken = generateToken({
        userId: otherLearner.id,
        email: otherLearner.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherLearnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          watchTime: 10,
          totalDuration: 20,
          lastPosition: 0.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("FORBIDDEN");
      expect(data.message).toContain("not enrolled");

      await prisma.user.delete({ where: { id: otherLearner.id } });
    });

    it("should return 400 for validation error", async () => {
      const request = new NextRequest("http://localhost:3000/api/progress/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          watchTime: -1, // Invalid
          totalDuration: 20,
          lastPosition: 0.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });
  });
});

