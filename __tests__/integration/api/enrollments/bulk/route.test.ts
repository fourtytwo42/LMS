import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/enrollments/bulk/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Enrollments Bulk API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser1: { id: string; email: string };
  let learnerUser2: { id: string; email: string };
  let learnerUser3: { id: string; email: string };
  let testCourse: { id: string };
  let testLearningPlan: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-bulk@test.com", "instructor-bulk@test.com", "learner1-bulk@test.com", "learner2-bulk@test.com", "learner3-bulk@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-bulk@test.com",
        passwordHash: adminPasswordHash,
        firstName: "Admin",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "ADMIN" },
                create: { name: "ADMIN", description: "Admin", permissions: [] },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roles: ["ADMIN"] });

    // Create instructor
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-bulk@test.com",
        passwordHash: instructorPasswordHash,
        firstName: "Instructor",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "INSTRUCTOR" },
                create: { name: "INSTRUCTOR", description: "Instructor", permissions: [] },
              },
            },
          },
        },
      },
    });
    instructorToken = generateToken({ userId: instructorUser.id, email: instructorUser.email, roles: ["INSTRUCTOR"] });

    // Create learners
    const learner1PasswordHash = await hashPassword("LearnerPass123");
    learnerUser1 = await prisma.user.create({
      data: {
        email: "learner1-bulk@test.com",
        passwordHash: learner1PasswordHash,
        firstName: "Learner",
        lastName: "One",
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

    const learner2PasswordHash = await hashPassword("LearnerPass123");
    learnerUser2 = await prisma.user.create({
      data: {
        email: "learner2-bulk@test.com",
        passwordHash: learner2PasswordHash,
        firstName: "Learner",
        lastName: "Two",
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

    const learner3PasswordHash = await hashPassword("LearnerPass123");
    learnerUser3 = await prisma.user.create({
      data: {
        email: "learner3-bulk@test.com",
        passwordHash: learner3PasswordHash,
        firstName: "Learner",
        lastName: "Three",
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

    // Create course
    testCourse = await prisma.course.create({
      data: {
        title: "Bulk Enrollment Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create learning plan
    testLearningPlan = await prisma.learningPlan.create({
      data: {
        title: "Bulk Enrollment Plan",
        description: "Test plan",
        status: "PUBLISHED",
        createdById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.enrollment.deleteMany({
      where: {
        userId: { in: [learnerUser1.id, learnerUser2.id, learnerUser3.id] },
      },
    });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.learningPlan.deleteMany({ where: { id: testLearningPlan.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-bulk@test.com", "instructor-bulk@test.com", "learner1-bulk@test.com", "learner2-bulk@test.com", "learner3-bulk@test.com"] },
      },
    });
  });

  describe("POST /api/enrollments/bulk", () => {
    it("should bulk enroll users in course as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id, learnerUser2.id, learnerUser3.id],
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrolled).toBe(3);
      expect(data.failed).toBe(0);
      expect(data.enrollments.length).toBe(3);
    });

    it("should bulk enroll users in learning plan", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id, learnerUser2.id],
          learningPlanId: testLearningPlan.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrolled).toBe(2);
    });

    it("should handle partial failures in bulk enrollment", async () => {
      // Enroll one user first
      await prisma.enrollment.create({
        data: {
          userId: learnerUser1.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id, learnerUser2.id, learnerUser3.id], // learnerUser1 already enrolled
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrolled).toBe(2); // learnerUser2 and learnerUser3
      expect(data.failed).toBe(1); // learnerUser1 already enrolled
      expect(data.errors.length).toBe(1);
    });

    it("should return 400 for missing courseId and learningPlanId", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id],
          // Missing both courseId and learningPlanId
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for empty userIds array", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [],
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 403 for learner", async () => {
      const learnerToken = generateToken({
        userId: learnerUser1.id,
        email: learnerUser1.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser2.id],
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for non-assigned instructor", async () => {
      // Create another instructor
      const otherInstructor = await prisma.user.create({
        data: {
          email: "other-instructor-bulk@test.com",
          passwordHash: await hashPassword("Pass123"),
          firstName: "Other",
          lastName: "Instructor",
          roles: {
            create: {
              role: {
                connectOrCreate: {
                  where: { name: "INSTRUCTOR" },
                  create: { name: "INSTRUCTOR", description: "Instructor", permissions: [] },
                },
              },
            },
          },
        },
      });
      const otherInstructorToken = generateToken({
        userId: otherInstructor.id,
        email: otherInstructor.email,
        roles: ["INSTRUCTOR"],
      });

      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id],
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id],
          courseId: "non-existent",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should return 404 for non-existent learning plan", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id],
          learningPlanId: "non-existent",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should handle bulk enrollment with dueDate", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const request = new NextRequest("http://localhost:3000/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          userIds: [learnerUser1.id, learnerUser2.id],
          courseId: testCourse.id,
          dueDate: dueDate.toISOString(),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrolled).toBe(2);

      // Verify enrollments have dueDate
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: { in: [learnerUser1.id, learnerUser2.id] },
          courseId: testCourse.id,
        },
      });
      expect(enrollments.every(e => e.dueDate)).toBe(true);
    });
  });
});

