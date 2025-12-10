import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/enrollments/[id]/approve/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Enrollment Approve API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let testCourse: any;
  let testEnrollment: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-approve@test.com", "instructor-approve@test.com", "other-instructor-approve@test.com", "learner-approve@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-approve@test.com",
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
        email: "instructor-approve@test.com",
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
        email: "other-instructor-approve@test.com",
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
        email: "learner-approve@test.com",
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
        title: "Test Course for Approve",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        requiresApproval: true,
        createdById: instructorUser.id,
      },
    });

    // Create pending enrollment
    testEnrollment = await prisma.enrollment.create({
      data: {
        userId: learnerUser.id,
        courseId: testCourse.id,
        status: "PENDING_APPROVAL",
      },
    });
  });

  afterEach(async () => {
    await prisma.enrollment.deleteMany({
      where: {
        id: testEnrollment.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: testCourse.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-approve@test.com", "instructor-approve@test.com", "other-instructor-approve@test.com", "learner-approve@test.com"] },
      },
    });
  });

  describe("POST /api/enrollments/[id]/approve", () => {
    it("should approve enrollment as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollment.status).toBe("ENROLLED");
      expect(data.enrollment.approvedAt).toBeDefined();

      // Verify in database
      const updated = await prisma.enrollment.findUnique({ where: { id: testEnrollment.id } });
      expect(updated?.status).toBe("ENROLLED");
      expect(updated?.approvedById).toBe(adminUser.id);
    });

    it("should approve enrollment as course creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollment.status).toBe("ENROLLED");
    });

    it("should approve enrollment as assigned instructor", async () => {
      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      // Delete existing enrollment first
      await prisma.enrollment.delete({ where: { id: testEnrollment.id } });

      // Create another pending enrollment
      const anotherEnrollment = await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "PENDING_APPROVAL",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/enrollments/${anotherEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: anotherEnrollment.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.enrollment.delete({ where: { id: anotherEnrollment.id } });
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 400 for non-pending enrollment", async () => {
      // Update enrollment to ENROLLED
      await prisma.enrollment.update({
        where: { id: testEnrollment.id },
        data: { status: "ENROLLED" },
      });

      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("BAD_REQUEST");
      expect(data.message).toContain("not pending approval");
    });

    it("should return 403 for enrollment limit reached", async () => {
      // Set course max enrollments
      await prisma.course.update({
        where: { id: testCourse.id },
        data: { maxEnrollments: 1 },
      });

      // Create another enrollment that's already ENROLLED
      await prisma.enrollment.create({
        data: {
          userId: adminUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("FORBIDDEN");
      expect(data.message).toContain("Enrollment limit reached");
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent enrollment", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/non-existent/approve", {
        method: "POST",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await POST(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      expect(response.status).toBe(401);
    });

    it("should approve learning plan enrollment", async () => {
      // Create learning plan
      const testLearningPlan = await prisma.learningPlan.create({
        data: {
          title: "Test Learning Plan",
          description: "Test plan",
          status: "PUBLISHED",
          requiresApproval: true,
          createdById: instructorUser.id,
        },
      });

      // Create pending learning plan enrollment
      const planEnrollment = await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          learningPlanId: testLearningPlan.id,
          status: "PENDING_APPROVAL",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/enrollments/${planEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: planEnrollment.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enrollment.status).toBe("ENROLLED");

      // Cleanup
      await prisma.enrollment.delete({ where: { id: planEnrollment.id } });
      await prisma.learningPlan.delete({ where: { id: testLearningPlan.id } });
    });

    it("should approve learning plan enrollment as assigned instructor", async () => {
      // Create learning plan
      const testLearningPlan = await prisma.learningPlan.create({
        data: {
          title: "Test Learning Plan",
          description: "Test plan",
          status: "PUBLISHED",
          requiresApproval: true,
          createdById: instructorUser.id,
        },
      });

      // Assign other instructor to learning plan
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: null,
          learningPlanId: testLearningPlan.id,
          assignedById: instructorUser.id,
        },
      });

      // Create pending learning plan enrollment
      const planEnrollment = await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          learningPlanId: testLearningPlan.id,
          status: "PENDING_APPROVAL",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/enrollments/${planEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: planEnrollment.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.enrollment.delete({ where: { id: planEnrollment.id } });
      await prisma.instructorAssignment.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
      await prisma.learningPlan.delete({ where: { id: testLearningPlan.id } });
    });

    it("should return 403 for learning plan enrollment limit reached", async () => {
      // Create learning plan with max enrollments
      const testLearningPlan = await prisma.learningPlan.create({
        data: {
          title: "Test Learning Plan",
          description: "Test plan",
          status: "PUBLISHED",
          requiresApproval: true,
          maxEnrollments: 1,
          createdById: instructorUser.id,
        },
      });

      // Create an already enrolled user
      await prisma.enrollment.create({
        data: {
          userId: adminUser.id,
          learningPlanId: testLearningPlan.id,
          status: "ENROLLED",
        },
      });

      // Create pending enrollment
      const planEnrollment = await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          learningPlanId: testLearningPlan.id,
          status: "PENDING_APPROVAL",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/enrollments/${planEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await POST(request, { params: { id: planEnrollment.id } });
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("FORBIDDEN");
      expect(data.message).toContain("Enrollment limit reached");

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
      await prisma.learningPlan.delete({ where: { id: testLearningPlan.id } });
    });

    it("should approve enrollment when course has no maxEnrollments", async () => {
      // Create course without maxEnrollments
      const unlimitedCourse = await prisma.course.create({
        data: {
          title: "Unlimited Course",
          description: "Course without enrollment limit",
          status: "PUBLISHED",
          type: "E-LEARNING",
          requiresApproval: true,
          maxEnrollments: null,
          createdById: instructorUser.id,
        },
      });

      // Create multiple pending enrollments
      const enrollment1 = await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: unlimitedCourse.id,
          status: "PENDING_APPROVAL",
        },
      });

      const enrollment2 = await prisma.enrollment.create({
        data: {
          userId: adminUser.id,
          courseId: unlimitedCourse.id,
          status: "PENDING_APPROVAL",
        },
      });

      // Approve first enrollment
      const request1 = new NextRequest(`http://localhost:3000/api/enrollments/${enrollment1.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response1 = await POST(request1, { params: { id: enrollment1.id } });
      expect(response1.status).toBe(200);

      // Approve second enrollment (should work even though first is approved)
      const request2 = new NextRequest(`http://localhost:3000/api/enrollments/${enrollment2.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response2 = await POST(request2, { params: { id: enrollment2.id } });
      expect(response2.status).toBe(200);

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { courseId: unlimitedCourse.id } });
      await prisma.course.delete({ where: { id: unlimitedCourse.id } });
    });

    it("should approve enrollment when learning plan has no maxEnrollments", async () => {
      // Create learning plan without maxEnrollments
      const unlimitedPlan = await prisma.learningPlan.create({
        data: {
          title: "Unlimited Plan",
          description: "Plan without enrollment limit",
          status: "PUBLISHED",
          requiresApproval: true,
          maxEnrollments: null,
          createdById: instructorUser.id,
        },
      });

      // Create multiple pending enrollments
      const enrollment1 = await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          learningPlanId: unlimitedPlan.id,
          status: "PENDING_APPROVAL",
        },
      });

      const enrollment2 = await prisma.enrollment.create({
        data: {
          userId: adminUser.id,
          learningPlanId: unlimitedPlan.id,
          status: "PENDING_APPROVAL",
        },
      });

      // Approve both enrollments
      const request1 = new NextRequest(`http://localhost:3000/api/enrollments/${enrollment1.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response1 = await POST(request1, { params: { id: enrollment1.id } });
      expect(response1.status).toBe(200);

      const request2 = new NextRequest(`http://localhost:3000/api/enrollments/${enrollment2.id}/approve`, {
        method: "POST",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response2 = await POST(request2, { params: { id: enrollment2.id } });
      expect(response2.status).toBe(200);

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { learningPlanId: unlimitedPlan.id } });
      await prisma.learningPlan.delete({ where: { id: unlimitedPlan.id } });
    });

    it("should handle authentication error with 403 status", async () => {
      // This tests the error handling branch for 403 status codes
      // The authenticate function may throw with statusCode 403
      const request = new NextRequest(`http://localhost:3000/api/enrollments/${testEnrollment.id}/approve`, {
        method: "POST",
        headers: {
          cookie: "accessToken=invalid-token",
        },
      });

      const response = await POST(request, { params: { id: testEnrollment.id } });
      // Should return 401 or 403 depending on how authenticate handles invalid tokens
      expect([401, 403]).toContain(response.status);
    });
  });
});
