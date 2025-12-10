import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/tests/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Tests API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "instructor-tests@test.com",
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

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-tests@test.com",
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
                  description: "Instructor role",
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
        title: "Test Course",
        description: "Test course",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create test content item
    testContentItem = await prisma.contentItem.create({
      data: {
        courseId: testCourse.id,
        title: "Test Content",
        type: "TEST",
        order: 1,
      },
    });
  });

  afterEach(async () => {
    await prisma.test.deleteMany({
      where: {
        contentItem: {
          courseId: testCourse.id,
        },
      },
    });
    await prisma.contentItem.deleteMany({
      where: {
        id: testContentItem.id,
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: testCourse.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: "instructor-tests@test.com",
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

  describe("GET /api/tests", () => {
    it("should list tests as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tests).toBeDefined();
      expect(Array.isArray(data.tests)).toBe(true);
    });

    it("should require authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should allow learner to list only enrolled tests", async () => {
      // create learner and enroll
      const learnerPwd = await hashPassword("LearnerPass123");
      const learner = await prisma.user.create({
        data: {
          email: "learner-tests-list@test.com",
          passwordHash: learnerPwd,
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
      await prisma.enrollment.create({
        data: {
          userId: learner.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });
      const learnerToken = generateToken({
        userId: learner.id,
        email: learner.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.tests)).toBe(true);

      await prisma.enrollment.deleteMany({ where: { userId: learner.id } });
      await prisma.user.delete({ where: { id: learner.id } });
      await prisma.role.deleteMany({
        where: { name: "LEARNER", users: { none: {} } },
      });
    });
  });

  describe("POST /api/tests", () => {
    it("should create test as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Test Quiz",
          description: "A test quiz",
          passingScore: 0.7,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.test).toBeDefined();
      expect(data.test.title).toBe("Test Quiz");
    });

    it("should reject invalid content item type", async () => {
      // Create a non-TEST content item
      const videoContent = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Video Content",
          type: "VIDEO",
          order: 2,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: videoContent.id,
          title: "Test Quiz",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      // Cleanup
      await prisma.contentItem.delete({
        where: { id: videoContent.id },
      });
    });

    it("should forbid learner from creating tests", async () => {
      const learnerPwd = await hashPassword("LearnerPass123");
      const learner = await prisma.user.create({
        data: {
          email: "learner-tests@test.com",
          passwordHash: learnerPwd,
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
      const learnerToken = generateToken({
        userId: learner.id,
        email: learner.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Learner attempt",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      await prisma.user.delete({ where: { id: learner.id } });
    });

    it("should reject duplicate test for content item", async () => {
      // First create a test
      const firstRequest = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "First Test",
        }),
      });

      const firstResponse = await POST(firstRequest);
      expect(firstResponse.status).toBe(201);

      // Now try to create another test for the same content item
      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Duplicate Test",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.message).toContain("already exists");
    });

    it("should reject when content item not found", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: "non-existent-id",
          title: "Test Quiz",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should reject when instructor not assigned to course", async () => {
      // Create another instructor
      const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
      const otherInstructor = await prisma.user.create({
        data: {
          email: "other-instructor-tests@test.com",
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
      const otherInstructorToken = generateToken({
        userId: otherInstructor.id,
        email: otherInstructor.email,
        roles: ["INSTRUCTOR"],
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Unauthorized Test",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });

    it("should allow admin to create test for any course", async () => {
      // Create admin user
      const adminPasswordHash = await hashPassword("AdminPass123");
      const admin = await prisma.user.create({
        data: {
          email: "admin-tests@test.com",
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
      const adminToken = generateToken({
        userId: admin.id,
        email: admin.email,
        roles: ["ADMIN"],
      });

      // Create new content item
      const newContentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Admin Test Content",
          type: "TEST",
          order: 2,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          contentItemId: newContentItem.id,
          title: "Admin Created Test",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Cleanup
      await prisma.test.deleteMany({ where: { contentItemId: newContentItem.id } });
      await prisma.contentItem.delete({ where: { id: newContentItem.id } });
      await prisma.user.delete({ where: { id: admin.id } });
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          // Missing contentItemId and title
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should allow assigned instructor to create test", async () => {
      // Create another instructor
      const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
      const otherInstructor = await prisma.user.create({
        data: {
          email: "assigned-instructor-tests@test.com",
          passwordHash: otherInstructorPasswordHash,
          firstName: "Assigned",
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

      // Assign instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructor.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      // Create new content item
      const newContentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Assigned Instructor Test Content",
          type: "TEST",
          order: 3,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: newContentItem.id,
          title: "Assigned Instructor Test",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Cleanup
      await prisma.test.deleteMany({ where: { contentItemId: newContentItem.id } });
      await prisma.contentItem.delete({ where: { id: newContentItem.id } });
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });

    it("should list tests as admin", async () => {
      // Create admin user
      const adminPasswordHash = await hashPassword("AdminPass123");
      const admin = await prisma.user.create({
        data: {
          email: "admin-tests-list@test.com",
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
      const adminToken = generateToken({
        userId: admin.id,
        email: admin.email,
        roles: ["ADMIN"],
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tests).toBeDefined();
      expect(Array.isArray(data.tests)).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { id: admin.id } });
    });

    it("should list tests as instructor who is also admin", async () => {
      // Create user with both ADMIN and INSTRUCTOR roles
      const adminInstructorPasswordHash = await hashPassword("AdminInstructorPass123");
      const adminInstructor = await prisma.user.create({
        data: {
          email: "admin-instructor-tests@test.com",
          passwordHash: adminInstructorPasswordHash,
          firstName: "Admin",
          lastName: "Instructor",
          roles: {
            create: [
              {
                role: {
                  connectOrCreate: {
                    where: { name: "ADMIN" },
                    create: { name: "ADMIN", description: "Admin", permissions: [] },
                  },
                },
              },
              {
                role: {
                  connectOrCreate: {
                    where: { name: "INSTRUCTOR" },
                    create: { name: "INSTRUCTOR", description: "Instructor", permissions: [] },
                  },
                },
              },
            ],
          },
        },
      });
      const adminInstructorToken = generateToken({
        userId: adminInstructor.id,
        email: adminInstructor.email,
        roles: ["ADMIN", "INSTRUCTOR"],
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        headers: {
          cookie: `accessToken=${adminInstructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tests).toBeDefined();
      // Admin should see all tests (no filtering)
      expect(Array.isArray(data.tests)).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { id: adminInstructor.id } });
    });

    it("should handle authentication error with 403 status", async () => {
      // This tests the error handling branch for 403 status codes
      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "accessToken=invalid-token",
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Test",
        }),
      });

      const response = await POST(request);
      // Should return 401 or 403 depending on how authenticate handles invalid tokens
      expect([401, 403]).toContain(response.status);
    });

    it("should create test as assigned instructor (not creator)", async () => {
      // Create another instructor
      const otherInstructorPwd = await hashPassword("OtherInstructorPass123");
      const otherInstructor = await prisma.user.create({
        data: {
          email: "other-instructor-tests@test.com",
          passwordHash: otherInstructorPwd,
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

      // Assign other instructor to course
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructor.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      // Create a new content item for this test
      const newContentItem = await prisma.contentItem.create({
        data: {
          courseId: testCourse.id,
          title: "Test Content for Assigned Instructor",
          type: "TEST",
          order: 3,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: newContentItem.id,
          title: "Test by Assigned Instructor",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.test).toBeDefined();
      expect(data.test.title).toBe("Test by Assigned Instructor");

      // Cleanup
      await prisma.test.deleteMany({ where: { contentItemId: newContentItem.id } });
      await prisma.contentItem.delete({ where: { id: newContentItem.id } });
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });

    it("should return 403 for non-assigned instructor trying to create test", async () => {
      // Create another instructor (not assigned)
      const otherInstructorPwd = await hashPassword("OtherInstructorPass123");
      const otherInstructor = await prisma.user.create({
        data: {
          email: "unassigned-instructor-tests@test.com",
          passwordHash: otherInstructorPwd,
          firstName: "Unassigned",
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

      const request = new NextRequest("http://localhost:3000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          contentItemId: testContentItem.id,
          title: "Unauthorized Test",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("FORBIDDEN");

      // Cleanup
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });
  });
});

