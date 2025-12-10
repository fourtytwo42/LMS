import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/enrollments/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Enrollments API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCourse: { id: string };
  let testLearningPlan: { id: string };

  beforeEach(async () => {
    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-enroll@test.com",
        passwordHash: adminPasswordHash,
        firstName: "Admin",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "ADMIN" },
                create: {
                  name: "ADMIN",
                  description: "Administrator",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      roles: ["ADMIN"],
    });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-enroll@test.com",
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
                  description: "Learner",
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

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-enroll@test.com",
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

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Enrollment Course",
        description: "A test course for enrollment",
        type: "E-LEARNING",
        status: "PUBLISHED",
        selfEnrollment: true,
        createdById: instructorUser.id,
        instructorAssignments: {
          create: {
            userId: instructorUser.id,
            assignedById: instructorUser.id,
          },
        },
      },
    });

    // Create test learning plan
    testLearningPlan = await prisma.learningPlan.create({
      data: {
        title: "Test Enrollment Plan",
        description: "A test learning plan for enrollment",
        status: "PUBLISHED",
        selfEnrollment: true,
        createdById: instructorUser.id,
        instructorAssignments: {
          create: {
            userId: instructorUser.id,
            assignedById: instructorUser.id,
          },
        },
      },
    });
  });

  afterEach(async () => {
    await prisma.enrollment.deleteMany({
      where: {
        userId: { in: [learnerUser.id, adminUser.id] },
      },
    });
    await prisma.course.deleteMany({
      where: {
        title: "Test Enrollment Course",
      },
    });
    await prisma.learningPlan.deleteMany({
      where: {
        title: "Test Enrollment Plan",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin-enroll@test.com",
            "learner-enroll@test.com",
            "instructor-enroll@test.com",
          ],
        },
      },
    });
  });

  describe("GET /api/enrollments", () => {
    it("should list enrollments for admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments).toBeDefined();
      expect(Array.isArray(data.enrollments)).toBe(true);
    });

    it("should filter by courseId", async () => {
      // Create enrollment first
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/enrollments?courseId=${testCourse.id}`,
        {
          headers: {
            cookie: `accessToken=${adminToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.every((e: any) => e.courseId === testCourse.id)).toBe(true);
    });

    it("should filter by status", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/enrollments?status=ENROLLED",
        {
          headers: {
            cookie: `accessToken=${adminToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.every((e: any) => e.status === "ENROLLED")).toBe(true);
    });
  });

  describe("POST /api/enrollments", () => {
    it("should create enrollment as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userId: learnerUser.id,
          courseId: testCourse.id,
          enrollmentType: "MANUAL",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.userId).toBe(learnerUser.id);
      expect(data.enrollment.courseId).toBe(testCourse.id);
    });

    it("should create learning plan enrollment", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userId: learnerUser.id,
          learningPlanId: testLearningPlan.id,
          enrollmentType: "MANUAL",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.learningPlanId).toBe(testLearningPlan.id);
    });

    it("should reject duplicate enrollment", async () => {
      // Create first enrollment
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userId: learnerUser.id,
          courseId: testCourse.id,
          enrollmentType: "MANUAL",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409); // CONFLICT
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userId: learnerUser.id,
          // Missing courseId or learningPlanId
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});

