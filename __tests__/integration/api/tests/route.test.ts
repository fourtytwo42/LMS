import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/tests/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Tests API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "instructor-tests@test.com",
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: "INSTRUCTOR",
        users: {
          none: {},
        },
      },
    });

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-tests@test.com",
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

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create test content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Content",
        type: "TEST",
        order: 1,
      },
    });
  });

  afterEach(async () => {
    await prisma.test.deleteMany({
      where: {
        contentItem: {
          courseId: testCourse.id,
        },
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
        email: "instructor-tests@test.com",
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: "INSTRUCTOR",
        users: {
          none: {},
        },
      },
    });
  });

  describe("GET /api/tests", () => {
    it("should list tests as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tests).toBeDefined();
      expect(Array.isArray(data.tests)).toBe(true);
    });
  });

  describe("POST /api/tests", () => {
    it("should create test as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Test Quiz",
          description: "A test quiz",
          passingScore: 0.7,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.test).toBeDefined();
      expect(data.test.title).toBe("Test Quiz");
    });

    it("should reject invalid content item type", async () => {
      // Create a non-TEST content item
      const videoContent = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Video Content",
          type: "VIDEO",
          order: 2,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: videoContent.id,
          title: "Test Quiz",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      // Cleanup
      await prisma.contentItem.delete({
        where: { id: videoContent.id },
      });
    });
  });
});

