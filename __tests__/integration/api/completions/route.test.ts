import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/completions/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Completions API", () => {
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let testCourse: { id: string };
  let testLearningPlan: { id: string };

  beforeEach(async () => {
    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "completion-learner@test.com",
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

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "completion-admin@test.com",
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

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "completion-instructor@test.com",
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

    // Create test course (Course model doesn't have hasCertificate field)
    testCourse = await prisma.course.create({
      data: {
        title: "Completion Test Course",
        description: "A test course for completions",
        type: "E-LEARNING",
        status: "PUBLISHED",
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
        title: "Completion Test Plan",
        description: "A test learning plan for completions",
        status: "PUBLISHED",
        hasCertificate: true,
        createdById: instructorUser.id,
        instructorAssignments: {
          create: {
            userId: instructorUser.id,
            assignedById: instructorUser.id,
          },
        },
      },
    });

    // Create test completions
    await prisma.completion.createMany({
      data: [
        {
          userId: learnerUser.id,
          courseId: testCourse.id,
          completedAt: new Date(),
        },
        {
          userId: learnerUser.id,
          learningPlanId: testLearningPlan.id,
          completedAt: new Date(),
        },
      ],
    });
  });

  afterEach(async () => {
    if (learnerUser?.id) {
      await prisma.completion.deleteMany({
        where: {
          userId: learnerUser.id,
        },
      });
    }
    await prisma.course.deleteMany({
      where: {
        title: "Completion Test Course",
      },
    });
    await prisma.learningPlan.deleteMany({
      where: {
        title: "Completion Test Plan",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "completion-learner@test.com",
            "completion-admin@test.com",
            "completion-instructor@test.com",
          ],
        },
      },
    });
  });

  describe("GET /api/completions", () => {
    it("should list user's own completions", async () => {
      const request = new NextRequest("http://localhost:3000/api/completions", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.completions).toBeDefined();
      expect(Array.isArray(data.completions)).toBe(true);
      expect(data.completions.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by courseId", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/completions?courseId=${testCourse.id}`,
        {
          headers: {
            cookie: `accessToken=${learnerToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.completions.every((c: any) => c.courseId === testCourse.id)).toBe(true);
    });

    it("should filter by learningPlanId", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/completions?learningPlanId=${testLearningPlan.id}`,
        {
          headers: {
            cookie: `accessToken=${learnerToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.completions.every((c: any) => c.learningPlanId === testLearningPlan.id)
      ).toBe(true);
    });

    it("should allow admin to view other users' completions", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/completions?userId=${learnerUser.id}`,
        {
          headers: {
            cookie: `accessToken=${adminToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.completions).toBeDefined();
      expect(data.completions.length).toBeGreaterThanOrEqual(2);
    });

    it("should prevent non-admin from viewing other users' completions", async () => {
      // Create another user
      const otherUserPasswordHash = await hashPassword("OtherPass123");
      const otherUser = await prisma.user.create({
        data: {
          email: "other-completion@test.com",
          passwordHash: otherUserPasswordHash,
          firstName: "Other",
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
      const otherUserToken = generateToken({
        userId: otherUser.id,
        email: otherUser.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest(
        `http://localhost:3000/api/completions?userId=${learnerUser.id}`,
        {
          headers: {
            cookie: `accessToken=${otherUserToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(403); // FORBIDDEN

      // Cleanup
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });
  });
});

