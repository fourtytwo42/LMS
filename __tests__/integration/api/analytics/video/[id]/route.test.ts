import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/analytics/video/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Analytics Video [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: { id: string };
  let testVideoContent: { id: string };
  let testNonVideoContent: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-video@test.com", "instructor-analytics-video@test.com", "other-instructor-analytics-video@test.com", "learner-analytics-video@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-analytics-video@test.com",
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
        email: "instructor-analytics-video@test.com",
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
        email: "other-instructor-analytics-video@test.com",
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
        email: "learner-analytics-video@test.com",
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

    // Create video content
    testVideoContent = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Video",
        type: "VIDEO",
        order: 1,
      },
    });

    // Create non-video content
    testNonVideoContent = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test PDF",
        type: "PDF",
        order: 2,
      },
    });
  });

  afterEach(async () => {
    await prisma.videoProgress.deleteMany({ where: { contentItemId: testVideoContent.id } });
    await prisma.contentItem.deleteMany({ where: { id: { in: [testVideoContent.id, testNonVideoContent.id] } } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-analytics-video@test.com", "instructor-analytics-video@test.com", "other-instructor-analytics-video@test.com", "learner-analytics-video@test.com"] },
      },
    });
  });

  describe("GET /api/analytics/video/[id]", () => {
    it("should get video analytics as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalViews).toBeDefined();
      expect(data.uniqueViewers).toBeDefined();
      expect(data.averageWatchTime).toBeDefined();
      expect(data.completionRate).toBeDefined();
    });

    it("should get video analytics as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalViews).toBeDefined();
    });

    it("should get video analytics as assigned instructor", async () => {
      // Assign other instructor
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent content item", async () => {
      const request = new NextRequest("http://localhost:3000/api/analytics/video/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 400 for non-video content item", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testNonVideoContent.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testNonVideoContent.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("BAD_REQUEST");
      expect(data.message).toContain("not a video");
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`);

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(401);
    });

    it("should calculate video statistics correctly", async () => {
      // Create video progress records
      await prisma.videoProgress.createMany({
        data: [
          {
            userId: learnerUser.id,
            contentItemId: testVideoContent.id,
            watchTime: 300,
            totalDuration: 600,
            lastPosition: 0,
            timesWatched: 1,
            completed: false,
          },
          {
            userId: adminUser.id,
            contentItemId: testVideoContent.id,
            watchTime: 600,
            totalDuration: 600,
            lastPosition: 600,
            timesWatched: 1,
            completed: true,
          },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalViews).toBe(2);
      expect(data.uniqueViewers).toBe(2);
      expect(data.completionRate).toBe(50); // 1 of 2 completed
    });

    it("should handle video with no progress", async () => {
      const request = new NextRequest(`http://localhost:3000/api/analytics/video/${testVideoContent.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testVideoContent.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalViews).toBe(0);
      expect(data.uniqueViewers).toBe(0);
      expect(data.averageWatchTime).toBe(0);
      expect(data.completionRate).toBe(0);
    });
  });
});

