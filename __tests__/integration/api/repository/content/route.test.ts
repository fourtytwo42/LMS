import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/repository/content/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Content Repository API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    // Clean up in proper order (child records first)
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: ["instructor@test.com", "learner@test.com"] } },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      // Delete content repositories
      await prisma.contentRepository.deleteMany({
        where: { uploadedById: { in: userIds } },
      });
      // Delete courses
      const courses = await prisma.course.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length > 0) {
        const contentItems = await prisma.contentItem.findMany({
          where: { courseId: { in: courseIds } },
          select: { id: true },
        });
        const contentItemIds = contentItems.map((ci) => ci.id);
        if (contentItemIds.length > 0) {
          const tests = await prisma.test.findMany({
            where: { contentItemId: { in: contentItemIds } },
            select: { id: true },
          });
          const testIds = tests.map((t) => t.id);
          if (testIds.length > 0) {
            await prisma.testAnswer.deleteMany({
              where: { attempt: { testId: { in: testIds } } },
            });
            await prisma.testAttempt.deleteMany({
              where: { testId: { in: testIds } },
            });
            await prisma.question.deleteMany({
              where: { testId: { in: testIds } },
            });
            await prisma.test.deleteMany({
              where: { id: { in: testIds } },
            });
          }
          await prisma.videoProgress.deleteMany({
            where: { contentItemId: { in: contentItemIds } },
          });
          await prisma.completion.deleteMany({
            where: { contentItemId: { in: contentItemIds } },
          });
          await prisma.contentItem.deleteMany({
            where: { id: { in: contentItemIds } },
          });
        }
        await prisma.completion.deleteMany({
          where: { courseId: { in: courseIds } },
        });
        await prisma.enrollment.deleteMany({
          where: { courseId: { in: courseIds } },
        });
        await prisma.course.deleteMany({
          where: { id: { in: courseIds } },
        });
      }
      await prisma.user.deleteMany({
        where: { email: { in: ["instructor@test.com", "learner@test.com"] } },
      });
    }
    
    // Clean up roles if no users have them
    const instructorRole = await prisma.role.findUnique({ where: { name: "INSTRUCTOR" } });
    const learnerRole = await prisma.role.findUnique({ where: { name: "LEARNER" } });
    
    if (instructorRole) {
      const instructorUsers = await prisma.userRole.count({ where: { roleId: instructorRole.id } });
      if (instructorUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "INSTRUCTOR" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }
    
    if (learnerRole) {
      const learnerUsers = await prisma.userRole.count({ where: { roleId: learnerRole.id } });
      if (learnerUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "LEARNER" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor@test.com",
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
                  description: "Instructor role",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    instructorToken = generateToken({
      userId: instructorUser.id,
      email: instructorUser.email,
      roles: ["INSTRUCTOR"],
    });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner@test.com",
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
  });

  afterEach(async () => {
    // Clean up in proper order (child records first)
    await prisma.contentRepository.deleteMany({
      where: {
        uploadedBy: {
          email: { in: ["instructor@test.com", "learner@test.com"] },
        },
      },
    });

    // Delete users last, but first check for courses
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: ["instructor@test.com", "learner@test.com"] } },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      // Check for any courses created by these users
      const courses = await prisma.course.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });

      if (courses.length === 0) {
        await prisma.user.deleteMany({
          where: {
            email: { in: ["instructor@test.com", "learner@test.com"] },
          },
        });
      }
    }

    await prisma.role.deleteMany({
      where: {
        name: { in: ["INSTRUCTOR", "LEARNER"] },
        users: {
          none: {},
        },
      },
    });
  });

  describe("GET /api/repository/content", () => {
    let testContentItem: any;

    beforeEach(async () => {
      testContentItem = await prisma.contentRepository.create({
        data: {
          name: "Test Content",
          description: "Test description",
          type: "VIDEO",
          filePath: "videos/test.mp4",
          fileSize: 1024,
          mimeType: "video/mp4",
          folderPath: "videos/course1",
          tags: ["math", "algebra"],
          uploadedById: instructorUser.id,
        },
      });
    });

    it("should list content items as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems).toBeDefined();
      expect(Array.isArray(data.contentItems)).toBe(true);
    });

    it("should filter by type", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content?type=VIDEO", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems.every((item: any) => item.type === "VIDEO")).toBe(true);
    });

    it("should filter by folderPath", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content?folderPath=videos/course1", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems.every((item: any) => item.folderPath === "videos/course1")).toBe(true);
    });

    it("should filter by tags", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content?tags=math,algebra", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems.length).toBeGreaterThan(0);
    });

    it("should search by name", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content?search=Test", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems.length).toBeGreaterThan(0);
    });

    it("should search by description", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content?search=description", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems.length).toBeGreaterThan(0);
    });

    it("should paginate results", async () => {
      // Create multiple content items
      for (let i = 0; i < 5; i++) {
        await prisma.contentRepository.create({
          data: {
            name: `Content ${i}`,
            type: "VIDEO",
            filePath: `videos/test${i}.mp4`,
            fileSize: 1024,
            mimeType: "video/mp4",
            uploadedById: instructorUser.id,
          },
        });
      }

      const request = new NextRequest("http://localhost:3000/api/repository/content?page=1&limit=2", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contentItems.length).toBeLessThanOrEqual(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
    });

    it("should not list content as learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/repository/content");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});

