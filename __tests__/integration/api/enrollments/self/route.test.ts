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
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["self-enroll@test.com", "instructor-self@test.com"] },
      },
    });
    
    // Clean up roles if no users have them
    const learnerRole = await prisma.role.findUnique({ where: { name: "LEARNER" } });
    const instructorRole = await prisma.role.findUnique({ where: { name: "INSTRUCTOR" } });
    
    if (learnerRole) {
      const learnerUsers = await prisma.userRole.count({ where: { roleId: learnerRole.id } });
      if (learnerUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "LEARNER" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }
    
    if (instructorRole) {
      const instructorUsers = await prisma.userRole.count({ where: { roleId: instructorRole.id } });
      if (instructorUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "INSTRUCTOR" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }

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

    it("should reject enrollment when course is not published", async () => {
      const draftCourse = await prisma.course.create({
        data: {
          title: "Draft Course",
          description: "A draft course",
          type: "E-LEARNING",
          status: "DRAFT",
          selfEnrollment: true,
          publicAccess: true,
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
          courseId: draftCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("not available for enrollment");

      await prisma.course.delete({ where: { id: draftCourse.id } });
    });

    it("should reject enrollment when enrollment limit is reached", async () => {
      const limitedCourse = await prisma.course.create({
        data: {
          title: "Limited Course",
          description: "A course with enrollment limit",
          type: "E-LEARNING",
          status: "PUBLISHED",
          selfEnrollment: true,
          publicAccess: true,
          maxEnrollments: 1,
          createdById: instructorUser.id,
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      // Create another learner and enroll them
      const otherLearnerPasswordHash = await hashPassword("OtherPass123");
      const otherLearner = await prisma.user.create({
        data: {
          email: "other-learner@test.com",
          passwordHash: otherLearnerPasswordHash,
          firstName: "Other",
          lastName: "Learner",
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

      await prisma.enrollment.create({
        data: {
          userId: otherLearner.id,
          courseId: limitedCourse.id,
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
          courseId: limitedCourse.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toContain("Enrollment limit reached");

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { courseId: limitedCourse.id } });
      await prisma.course.delete({ where: { id: limitedCourse.id } });
      await prisma.user.delete({ where: { id: otherLearner.id } });
    });

    it("should reject enrollment when course not found", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          courseId: "non-existent-course-id",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toContain("Course not found");
    });

    it("should validate that either courseId or learningPlanId is required", async () => {
      const request = new NextRequest("http://localhost:3000/api/enrollments/self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should allow self-enrollment in learning plan", async () => {
      const testLearningPlan = await prisma.learningPlan.create({
        data: {
          title: "Self Enrollment Plan",
          description: "A learning plan with self-enrollment",
          status: "PUBLISHED",
          selfEnrollment: true,
          publicAccess: true,
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
          learningPlanId: testLearningPlan.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.status).toBe("ENROLLED");

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { learningPlanId: testLearningPlan.id } });
      await prisma.learningPlan.delete({ where: { id: testLearningPlan.id } });
    });
  });
});

