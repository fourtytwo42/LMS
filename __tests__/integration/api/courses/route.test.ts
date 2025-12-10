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
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "instructor@test.com",
      },
    });

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
    await prisma.role.deleteMany({
      where: {
        name: "INSTRUCTOR",
        users: {
          none: {},
        },
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

    it("should filter by categoryId", async () => {
      // Create a test course with category
      await prisma.course.create({
        data: {
          title: "Test Course Category",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          categoryId: testCategory.id,
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/courses?categoryId=${testCategory.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.category?.id === testCategory.id)).toBe(true);
    });

    it("should filter by difficultyLevel", async () => {
      // Create a test course with difficulty level
      await prisma.course.create({
        data: {
          title: "Test Course Advanced",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          difficultyLevel: "ADVANCED",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?difficultyLevel=ADVANCED", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.difficultyLevel === "ADVANCED")).toBe(true);
    });

    it("should filter by type", async () => {
      // Create a test course with type
      await prisma.course.create({
        data: {
          title: "Test Course Blended",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "BLENDED",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?type=BLENDED", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.type === "BLENDED")).toBe(true);
    });

    it("should filter by status", async () => {
      // Create a test course with DRAFT status
      await prisma.course.create({
        data: {
          title: "Test Course Draft",
          description: "A test course",
          status: "DRAFT",
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

      const request = new NextRequest("http://localhost:3000/api/courses?status=DRAFT", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.status === "DRAFT")).toBe(true);
    });

    it("should filter by status and categoryId combination", async () => {
      // Create a test course with both filters
      await prisma.course.create({
        data: {
          title: "Test Course Combined",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          categoryId: testCategory.id,
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/courses?status=PUBLISHED&categoryId=${testCategory.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => 
        c.status === "PUBLISHED" && c.category?.id === testCategory.id
      )).toBe(true);
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

    it("should create course with all optional fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          code: "TEST-001",
          title: "Test Course Full",
          shortDescription: "Short description",
          description: "Full description",
          type: "BLENDED",
          categoryId: testCategory.id,
          tags: ["tag1", "tag2", "tag3"],
          estimatedTime: 120,
          difficultyLevel: "INTERMEDIATE",
          publicAccess: true,
          selfEnrollment: true,
          sequentialRequired: false,
          allowSkipping: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.course).toBeDefined();
      expect(data.course.title).toBe("Test Course Full");
      expect(data.course.code).toBe("TEST-001");

      // Verify all fields were saved
      const course = await prisma.course.findUnique({
        where: { id: data.course.id },
      });
      expect(course?.categoryId).toBe(testCategory.id);
      expect(course?.tags).toEqual(["tag1", "tag2", "tag3"]);
      expect(course?.estimatedTime).toBe(120);
      expect(course?.difficultyLevel).toBe("INTERMEDIATE");
      expect(course?.publicAccess).toBe(true);
      expect(course?.selfEnrollment).toBe(true);
      expect(course?.sequentialRequired).toBe(false);
      expect(course?.allowSkipping).toBe(true);
    });

    it("should create course with instructor assignments", async () => {
      // Create another instructor
      const otherInstructor = await prisma.user.create({
        data: {
          email: "other-instructor@test.com",
          passwordHash: await hashPassword("Pass123"),
          firstName: "Other",
          lastName: "Instructor",
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

      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          title: "Test Course With Instructors",
          description: "A test course",
          type: "E-LEARNING",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      
      // Verify instructor assignment was created
      const assignments = await prisma.instructorAssignment.findMany({
        where: { courseId: data.course.id },
      });
      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments.some(a => a.userId === instructorUser.id)).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });

    it("should reject duplicate course code", async () => {
      // Create first course with code
      await prisma.course.create({
        data: {
          code: "DUPLICATE-001",
          title: "First Course",
          description: "First course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
        },
      });

      // Try to create second course with same code
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          code: "DUPLICATE-001",
          title: "Second Course",
          description: "Second course",
          type: "E-LEARNING",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe("CONFLICT");
      expect(data.message).toContain("Course code already exists");
    });
  });
});

