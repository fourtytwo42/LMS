import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/courses/[id]/archive/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Course Archive API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-archive@test.com", "instructor-archive@test.com", "other-instructor-archive@test.com", "learner-archive@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-archive@test.com",
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
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roles: ["ADMIN"] });

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-archive@test.com",
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
    instructorToken = generateToken({ userId: instructorUser.id, email: instructorUser.email, roles: ["INSTRUCTOR"] });

    // Create other instructor user
    const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
    otherInstructorUser = await prisma.user.create({
      data: {
        email: "other-instructor-archive@test.com",
        passwordHash: otherInstructorPasswordHash,
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
    otherInstructorToken = generateToken({ userId: otherInstructorUser.id, email: otherInstructorUser.email, roles: ["INSTRUCTOR"] });

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-archive@test.com",
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
    learnerToken = generateToken({ userId: learnerUser.id, email: learnerUser.email, roles: ["LEARNER"] });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        title: "Test Course for Archive",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.course.deleteMany({
      where: {
        id: testCourse.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-archive@test.com", "instructor-archive@test.com", "other-instructor-archive@test.com", "learner-archive@test.com"] },
      },
    });
  });

  describe("POST /api/courses/[id]/archive", () => {
    it("should archive course as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/courses/${testCourse.id}/archive`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await POST(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.course.status).toBe("ARCHIVED");

      // Verify in database
      const updated = await prisma.course.findUnique({ where: { id: testCourse.id } });
      expect(updated?.status).toBe("ARCHIVED");
    });

    it("should archive course as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/courses/${testCourse.id}/archive`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.course.status).toBe("ARCHIVED");
    });

    it("should archive course as assigned instructor", async () => {
      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/courses/${testCourse.id}/archive`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/courses/${testCourse.id}/archive`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/courses/${testCourse.id}/archive`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await POST(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses/non-existent/archive", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await POST(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/courses/${testCourse.id}/archive`, {
        method: "POST",
      });

      const response = await POST(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(401);
    });
  });
});

