import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/courses/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Courses API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCategory: { id: string };

  beforeEach(async () => {
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
                  description: "Instructor",
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

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: "Test Category",
        description: "Test category for courses",
      },
    });
  });

  afterEach(async () => {
    await prisma.course.deleteMany({
      where: {
        title: { contains: "Test Course" },
      },
    });
    await prisma.category.deleteMany({
      where: {
        name: "Test Category",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: "instructor@test.com",
      },
    });
  });

  describe("GET /api/courses", () => {
    it("should list courses", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      expect(Array.isArray(data.courses)).toBe(true);
    });

    it("should support search", async () => {
      // Create a test course
      await prisma.course.create({
        data: {
          title: "Test Course Search",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?search=Search", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.some((c: any) => c.title.includes("Search"))).toBe(true);
    });
  });

  describe("POST /api/courses", () => {
    it("should create course as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          title: "Test Course",
          description: "A test course description",
          type: "E-LEARNING",
          categoryId: testCategory.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.course).toBeDefined();
      expect(data.course.title).toBe("Test Course");
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          description: "Missing title",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});

