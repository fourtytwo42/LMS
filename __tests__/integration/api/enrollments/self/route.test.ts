import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/enrollments/self/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Self Enrollment API", () => {
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let instructorUser: { id: string; email: string };
  let testCourse: { id: string };
  let testCourseRequiresApproval: { id: string };

  beforeEach(async () => {
    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "self-enroll@test.com",
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
        email: "instructor-self@test.com",
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

    // Create test course with self-enrollment enabled
    testCourse = await prisma.course.create({
      data: {
        title: "Self Enrollment Course",
        description: "A course with self-enrollment",
        type: "E-LEARNING",
        status: "PUBLISHED",
        selfEnrollment: true,
        publicAccess: true, // Required for self-enrollment
        createdById: instructorUser.id,
        instructorAssignments: {
          create: {
            userId: instructorUser.id,
            assignedById: instructorUser.id,
          },
        },
      },
    });

    // Create test course requiring approval
    testCourseRequiresApproval = await prisma.course.create({
      data: {
        title: "Approval Required Course",
        description: "A course requiring approval",
        type: "E-LEARNING",
        status: "PUBLISHED",
        selfEnrollment: true,
        publicAccess: true, // Required for self-enrollment
        requiresApproval: true,
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
    // Clean up in reverse order to avoid foreign key constraints
    if (learnerUser?.id) {
      await prisma.enrollment.deleteMany({
        where: {
          userId: learnerUser.id,
        },
      });
    }
    await prisma.course.deleteMany({
      where: {
        title: { in: ["Self Enrollment Course", "Approval Required Course", "Restricted Course"] },
      },
    });
    // Delete users last
    await prisma.user.deleteMany({
      where: {
        email: { in: ["self-enroll@test.com", "instructor-self@test.com"] },
      },
    });
    // Clean up roles if they exist and have no users
    try {
      await prisma.role.deleteMany({
        where: {
          name: { in: ["LEARNER", "INSTRUCTOR"] },
          users: {
            none: {},
          },
        },
      });
    } catch (error) {
      // Ignore errors - roles might be in use by other tests
    }
  });

  describe("POST /api/enrollments/self", () => {
    it("should allow self-enrollment in course with self-enrollment enabled", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.status).toBe("ENROLLED");
      expect(data.enrollment.requiresApproval).toBe(false);
    });

    it("should create pending enrollment when approval required", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          courseId: testCourseRequiresApproval.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.status).toBe("PENDING_APPROVAL");
      expect(data.enrollment.requiresApproval).toBe(true);
    });

    it("should reject self-enrollment in course with self-enrollment disabled", async () => {
      // Create course with self-enrollment disabled
      const restrictedCourse = await prisma.course.create({
        data: {
          title: "Restricted Course",
          description: "A course without self-enrollment",
          type: "E-LEARNING",
          status: "PUBLISHED",
          selfEnrollment: false,
          createdById: instructorUser.id,
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/enrollments/self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          courseId: restrictedCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400); // BAD_REQUEST - self-enrollment not available

      // Cleanup
      await prisma.course.delete({
        where: { id: restrictedCourse.id },
      });
    });

    it("should reject duplicate enrollment", async () => {
      // Create enrollment first
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/enrollments/self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          courseId: testCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409); // CONFLICT
    });
  });
});

