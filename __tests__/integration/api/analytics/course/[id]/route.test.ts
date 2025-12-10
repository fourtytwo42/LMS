import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/analytics/course/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics Course [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };
  let testTest: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-course@test.com", "instructor-analytics-course@test.com", "other-instructor-analytics-course@test.com", "learner-analytics-course@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics-course@test.com",
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
        email: "instructor-analytics-course@test.com",
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

    // Create other instructor
    const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
    otherInstructorUser = await prisma.user.create({
      data: {
        email: "other-instructor-analytics-course@test.com",
        passwordHash: otherInstructorPasswordHash,
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
    otherInstructorToken = generateToken({ userId: otherInstructorUser.id, email: otherInstructorUser.email, roles: ["INSTRUCTOR"] });

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-analytics-course@test.com",
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
        title: "Analytics Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Content",
        type: "TEST",
        order: 1,
      },
    });

    // Create test
    testTest = await prisma.test.create({
      data: {
        contentItemId: testContentItem.id,
        title: "Test Quiz",
        passingScore: 0.7,
      },
    });
  });

  afterEach(async () => {
    await prisma.testAttempt.deleteMany({ where: { testId: testTest.id } });
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-course@test.com", "instructor-analytics-course@test.com", "other-instructor-analytics-course@test.com", "learner-analytics-course@test.com"] },
      },
    });
  });

  describe("GET /api/analytics/course/[id]", () => {
    it("should get course analytics as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments).toBeDefined();
      expect(data.completionRate).toBeDefined();
      expect(data.averageScore).toBeDefined();
    });

    it("should get course analytics as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments).toBeDefined();
    });

    it("should get course analytics as assigned instructor", async () => {
      // Assign other instructor
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent course", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/course/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`);

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(401);
    });

    it("should calculate enrollment statistics correctly", async () => {
      // Create enrollments with different statuses
      await prisma.enrollment.createMany({
        data: [
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            status: "IN_PROGRESS",
          },
          {
            userId: adminUser.id,
            courseId: testCourse.id,
            status: "COMPLETED",
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.total).toBe(2);
      expect(data.enrollments.active).toBe(1);
      expect(data.enrollments.completed).toBe(1);
    });

    it("should calculate average score from test attempts", async () => {
      // Create test attempts
      await prisma.testAttempt.createMany({
        data: [
          {
            testId: testTest.id,
            userId: learnerUser.id,
            attemptNumber: 1,
            score: 0.8,
            pointsEarned: 8,
            totalPoints: 10,
            passed: true,
            timeSpent: 300,
          },
          {
            testId: testTest.id,
            userId: adminUser.id,
            attemptNumber: 1,
            score: 0.6,
            pointsEarned: 6,
            totalPoints: 10,
            passed: false,
            timeSpent: 250,
          },
        ],
      });

      // Create enrollments
      await prisma.enrollment.createMany({
        data: [
          {
            userId: learnerUser.id,
            courseId: testCourse.id,
            status: "ENROLLED",
          },
          {
            userId: adminUser.id,
            courseId: testCourse.id,
            status: "ENROLLED",
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      // Average of 0.8 and 0.6 = 0.7 = 70%
      expect(data.averageScore).toBe(70);
    });

    it("should handle course with no enrollments", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${testCourse.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollments.total).toBe(0);
      expect(data.completionRate).toBe(0);
      expect(data.averageScore).toBe(0);
    });

    it("should handle course with no test content items", async () => {
      // Create course with only video content
      const videoCourse = await prisma.course.create({
        data: {
          title: "Video Only Course",
          description: "Course with no tests",
          status: "PUBLISHED",
          type: "E-LEARNING",
          createdById: instructorUser.id,
        },
      });

      await prisma.contentItem.create({
        data: {
          courseId: videoCourse.id,
          title: "Video Content",
          type: "VIDEO",
          order: 1,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/course/${videoCourse.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: videoCourse.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.averageScore).toBe(0); // No tests, so no scores

      // Cleanup
      await prisma.contentItem.deleteMany({ where: { courseId: videoCourse.id } });
      await prisma.course.delete({ where: { id: videoCourse.id } });
    });
  });
});

