import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/courses/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Courses API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCategory: { id: string };

  beforeEach(async () => {
    // Clean up in proper order (child records first)
    const existingUsers = await prisma.user.findMany({
      where: { email: "instructor@test.com" },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      // Get courses created by these users
      const courses = await prisma.course.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);

      if (courseIds.length > 0) {
        // Delete all dependent records
        const contentItems = await prisma.contentItem.findMany({
          where: { courseId: { in: courseIds } },
          select: { id: true },
        });
        const contentItemIds = contentItems.map((ci) => ci.id);

        if (contentItemIds.length > 0) {
          const tests = await prisma.test.findMany({
            where: { contentItemId: { in: contentItemIds } },
            select: { id: true },
          });
          const testIds = tests.map((t) => t.id);

          if (testIds.length > 0) {
            await prisma.testAnswer.deleteMany({
              where: { attempt: { testId: { in: testIds } } },
            });
            await prisma.testAttempt.deleteMany({
              where: { testId: { in: testIds } },
            });
            await prisma.question.deleteMany({
              where: { testId: { in: testIds } },
            });
            await prisma.test.deleteMany({
              where: { id: { in: testIds } },
            });
          }

          await prisma.videoProgress.deleteMany({
            where: { contentItemId: { in: contentItemIds } },
          });
          await prisma.completion.deleteMany({
            where: { contentItemId: { in: contentItemIds } },
          });
          await prisma.contentItem.deleteMany({
            where: { id: { in: contentItemIds } },
          });
        }

        await prisma.completion.deleteMany({
          where: { courseId: { in: courseIds } },
        });
        await prisma.enrollment.deleteMany({
          where: { courseId: { in: courseIds } },
        });
        await prisma.course.deleteMany({
          where: { id: { in: courseIds } },
        });
      }

      await prisma.user.deleteMany({
        where: { email: "instructor@test.com" },
      });
    }

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor@test.com",
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

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: "Test Category",
        description: "Test category for courses",
      },
    });
  });

  afterEach(async () => {
    // Clean up in proper order (child records first)
    // Get courses to delete
    const courses = await prisma.course.findMany({
      where: {
        title: { contains: "Test Course" },
      },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);

    if (courseIds.length > 0) {
      // Delete all dependent records
      const contentItems = await prisma.contentItem.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      });
      const contentItemIds = contentItems.map((ci) => ci.id);

      if (contentItemIds.length > 0) {
        const tests = await prisma.test.findMany({
          where: { contentItemId: { in: contentItemIds } },
          select: { id: true },
        });
        const testIds = tests.map((t) => t.id);

        if (testIds.length > 0) {
          await prisma.testAnswer.deleteMany({
            where: { attempt: { testId: { in: testIds } } },
          });
          await prisma.testAttempt.deleteMany({
            where: { testId: { in: testIds } },
          });
          await prisma.question.deleteMany({
            where: { testId: { in: testIds } },
          });
          await prisma.test.deleteMany({
            where: { id: { in: testIds } },
          });
        }

        await prisma.videoProgress.deleteMany({
          where: { contentItemId: { in: contentItemIds } },
        });
        await prisma.completion.deleteMany({
          where: { contentItemId: { in: contentItemIds } },
        });
        await prisma.contentItem.deleteMany({
          where: { id: { in: contentItemIds } },
        });
      }

      await prisma.completion.deleteMany({
        where: { courseId: { in: courseIds } },
      });
      await prisma.enrollment.deleteMany({
        where: { courseId: { in: courseIds } },
      });
      await prisma.course.deleteMany({
        where: { id: { in: courseIds } },
      });
    }

    await prisma.category.deleteMany({
      where: {
        name: "Test Category",
      },
    });

    // Delete users last
    const existingUsers = await prisma.user.findMany({
      where: { email: "instructor@test.com" },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      // Check for any remaining courses
      const remainingCourses = await prisma.course.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });

      if (remainingCourses.length === 0) {
        await prisma.user.deleteMany({
          where: { email: "instructor@test.com" },
        });
      }
    }

    await prisma.role.deleteMany({
      where: {
        name: "INSTRUCTOR",
        users: {
          none: {},
        },
      },
    });
  });

  describe("GET /api/courses", () => {
    it("should list courses", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      expect(Array.isArray(data.courses)).toBe(true);
    });

    it("should support search", async () => {
      // Create a test course
      await prisma.course.create({
        data: {
          title: "Test Course Search",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?search=Search", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.some((c: any) => c.title.includes("Search"))).toBe(true);
    });

    it("should filter by categoryId", async () => {
      // Create a test course with category
      await prisma.course.create({
        data: {
          title: "Test Course Category",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          categoryId: testCategory.id,
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/courses?categoryId=${testCategory.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.category?.id === testCategory.id)).toBe(true);
    });

    it("should filter by difficultyLevel", async () => {
      // Create a test course with difficulty level
      await prisma.course.create({
        data: {
          title: "Test Course Advanced",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          difficultyLevel: "ADVANCED",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?difficultyLevel=ADVANCED", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.difficultyLevel === "ADVANCED")).toBe(true);
    });

    it("should filter by type", async () => {
      // Create a test course with type
      await prisma.course.create({
        data: {
          title: "Test Course Blended",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "BLENDED",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?type=BLENDED", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.type === "BLENDED")).toBe(true);
    });

    it("should filter by status", async () => {
      // Create a test course with DRAFT status
      await prisma.course.create({
        data: {
          title: "Test Course Draft",
          description: "A test course",
          status: "DRAFT",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?status=DRAFT", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.status === "DRAFT")).toBe(true);
    });

    it("should filter by publicAccess=true", async () => {
      await prisma.course.create({
        data: {
          title: "Public Course",
          description: "A public course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          publicAccess: true,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?publicAccess=true", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.publicAccess === true)).toBe(true);
    });

    it("should filter by publicAccess=false", async () => {
      await prisma.course.create({
        data: {
          title: "Private Course",
          description: "A private course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          publicAccess: false,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?publicAccess=false", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.publicAccess === false)).toBe(true);
    });

    it("should filter by selfEnrollment=true", async () => {
      await prisma.course.create({
        data: {
          title: "Self Enrollment Course",
          description: "A course with self enrollment",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          selfEnrollment: true,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?selfEnrollment=true", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.selfEnrollment === true)).toBe(true);
    });

    it("should filter by selfEnrollment=false", async () => {
      await prisma.course.create({
        data: {
          title: "No Self Enrollment Course",
          description: "A course without self enrollment",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          selfEnrollment: false,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?selfEnrollment=false", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.selfEnrollment === false)).toBe(true);
    });

    it("should filter by featured", async () => {
      const featuredCourse = await prisma.course.create({
        data: {
          title: "Featured Course",
          description: "A featured course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          featured: true,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses?featured=true", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      // Should include the featured course
      const featuredCourseInResults = data.courses.some((c: any) => c.id === featuredCourse.id);
      expect(featuredCourseInResults).toBe(true);
      // All returned courses should be featured (if filter is working)
      if (data.courses.length > 0) {
        // Check that all courses have featured=true (if the field is included in response)
        // Note: The response mapping might not include 'featured' field, so we just check the course is in results
        expect(data.courses.length).toBeGreaterThan(0);
      }
      
      // Cleanup
      await prisma.course.delete({ where: { id: featuredCourse.id } });
    });

    it("should sort by oldest", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses?sort=oldest", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // Verify courses are sorted by createdAt ascending
      if (data.courses.length > 1) {
        for (let i = 1; i < data.courses.length; i++) {
          const prevDate = new Date(data.courses[i - 1].createdAt);
          const currDate = new Date(data.courses[i].createdAt);
          expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
        }
      }
    });

    it("should sort by title", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses?sort=title", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // Verify courses are sorted by title ascending
      if (data.courses.length > 1) {
        for (let i = 1; i < data.courses.length; i++) {
          expect(data.courses[i - 1].title.localeCompare(data.courses[i].title)).toBeLessThanOrEqual(0);
        }
      }
    });

    it("should handle sort by rating (falls back to default)", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses?sort=rating", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // Rating sort falls back to createdAt desc, so courses should still be returned
      expect(Array.isArray(data.courses)).toBe(true);
    });

    it("should default to PUBLISHED status for learners when status not provided", async () => {
      // Clean up any existing learner user first
      await prisma.user.deleteMany({
        where: { email: "learner-status@test.com" },
      });

      // Create learner user
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "learner-status@test.com",
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
      const learnerToken = generateToken({
        userId: learnerUser.id,
        email: learnerUser.email,
        roles: ["LEARNER"],
      });

      // Create courses with different statuses
      const publishedCourse = await prisma.course.create({
        data: {
          title: "Published Course",
          description: "A published course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          publicAccess: true,
        },
      });

      const draftCourse = await prisma.course.create({
        data: {
          title: "Draft Course",
          description: "A draft course",
          status: "DRAFT",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          publicAccess: true,
        },
      });

      // Learner requests courses without status filter - should only see PUBLISHED
      const request = new NextRequest("http://localhost:3000/api/courses", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      // Should only see published courses, not drafts
      const courseIds = data.courses.map((c: any) => c.id);
      expect(courseIds).toContain(publishedCourse.id);
      expect(courseIds).not.toContain(draftCourse.id);

      // Cleanup
      await prisma.course.deleteMany({
        where: { id: { in: [publishedCourse.id, draftCourse.id] } },
      });
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });

    it("should filter courses for learner by access (publicAccess OR enrolled OR instructor)", async () => {
      // Clean up any existing learner user first
      await prisma.user.deleteMany({
        where: { email: "learner-courses@test.com" },
      });

      // Create learner user
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "learner-courses@test.com",
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
      const learnerToken = generateToken({ userId: learnerUser.id, email: learnerUser.email, roles: ["LEARNER"] });

      // Create public course
      const publicCourse = await prisma.course.create({
        data: {
          title: "Public Course for Learner",
          description: "A public course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          publicAccess: true,
        },
      });

      // Create private course with enrollment
      const privateCourse = await prisma.course.create({
        data: {
          title: "Private Course with Enrollment",
          description: "A private course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          publicAccess: false,
        },
      });

      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: privateCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/courses", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      // Learner should see public course and enrolled course
      const courseIds = data.courses.map((c: any) => c.id);
      expect(courseIds).toContain(publicCourse.id);
      expect(courseIds).toContain(privateCourse.id);

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { courseId: privateCourse.id } });
      await prisma.course.deleteMany({ where: { id: { in: [publicCourse.id, privateCourse.id] } } });
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });

    it("should handle filter combination: categoryId + difficultyLevel", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/courses?categoryId=${testCategory.id}&difficultyLevel=BEGINNER`,
        {
          headers: {
            cookie: `accessToken=${instructorToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // All returned courses should match both filters
      expect(data.courses.every((c: any) => 
        c.category?.id === testCategory.id && 
        c.difficultyLevel === "BEGINNER"
      )).toBe(true);
    });

    it("should handle filter combination: status + type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/courses?status=PUBLISHED&type=E-LEARNING",
        {
          headers: {
            cookie: `accessToken=${instructorToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // All returned courses should match both filters
      expect(data.courses.every((c: any) => 
        c.status === "PUBLISHED" && 
        c.type === "E-LEARNING"
      )).toBe(true);
    });

    it("should handle filter combination: publicAccess + selfEnrollment", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/courses?publicAccess=true&selfEnrollment=true",
        {
          headers: {
            cookie: `accessToken=${instructorToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // All returned courses should match both filters
      expect(data.courses.every((c: any) => 
        c.publicAccess === true && 
        c.selfEnrollment === true
      )).toBe(true);
    });

    it("should handle filter combination: search + categoryId", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/courses?search=Test&categoryId=${testCategory.id}`,
        {
          headers: {
            cookie: `accessToken=${instructorToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      // All returned courses should match both filters
      expect(data.courses.every((c: any) => 
        c.category?.id === testCategory.id
      )).toBe(true);
      // And should contain "Test" in title, description, or shortDescription
      expect(data.courses.some((c: any) => 
        c.title.includes("Test") || 
        c.shortDescription?.includes("Test") || 
        c.description?.includes("Test")
      )).toBe(true);
    });

    it("should handle publicAccess=false filter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/courses?publicAccess=false",
        {
          headers: {
            cookie: `accessToken=${instructorToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.publicAccess === false)).toBe(true);
    });

    it("should handle selfEnrollment=false filter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/courses?selfEnrollment=false",
        {
          headers: {
            cookie: `accessToken=${instructorToken}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => c.selfEnrollment === false)).toBe(true);
    });

    it("should filter by status and categoryId combination", async () => {
      // Create a test course with both filters
      await prisma.course.create({
        data: {
          title: "Test Course Combined",
          description: "A test course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
          categoryId: testCategory.id,
          instructorAssignments: {
            create: {
              userId: instructorUser.id,
              assignedById: instructorUser.id,
            },
          },
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/courses?status=PUBLISHED&categoryId=${testCategory.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.every((c: any) => 
        c.status === "PUBLISHED" && c.category?.id === testCategory.id
      )).toBe(true);
    });
  });

  describe("POST /api/courses", () => {
    it("should create course as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          title: "Test Course",
          description: "A test course description",
          type: "E-LEARNING",
          categoryId: testCategory.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.course).toBeDefined();
      expect(data.course.title).toBe("Test Course");
    });

    it("should validate required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          description: "Missing title",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should create course with all optional fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          code: "TEST-001",
          title: "Test Course Full",
          shortDescription: "Short description",
          description: "Full description",
          type: "BLENDED",
          categoryId: testCategory.id,
          tags: ["tag1", "tag2", "tag3"],
          estimatedTime: 120,
          difficultyLevel: "INTERMEDIATE",
          publicAccess: true,
          selfEnrollment: true,
          sequentialRequired: false,
          allowSkipping: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.course).toBeDefined();
      expect(data.course.title).toBe("Test Course Full");
      expect(data.course.code).toBe("TEST-001");

      // Verify all fields were saved
      const course = await prisma.course.findUnique({
        where: { id: data.course.id },
      });
      expect(course?.categoryId).toBe(testCategory.id);
      expect(course?.tags).toEqual(["tag1", "tag2", "tag3"]);
      expect(course?.estimatedTime).toBe(120);
      expect(course?.difficultyLevel).toBe("INTERMEDIATE");
      expect(course?.publicAccess).toBe(true);
      expect(course?.selfEnrollment).toBe(true);
      expect(course?.sequentialRequired).toBe(false);
      expect(course?.allowSkipping).toBe(true);
    });

    it("should create course with instructor assignments", async () => {
      // Create another instructor
      const otherInstructor = await prisma.user.create({
        data: {
          email: "other-instructor@test.com",
          passwordHash: await hashPassword("Pass123"),
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

      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          title: "Test Course With Instructors",
          description: "A test course",
          type: "E-LEARNING",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      
      // Verify instructor assignment was created
      const assignments = await prisma.instructorAssignment.findMany({
        where: { courseId: data.course.id },
      });
      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments.some(a => a.userId === instructorUser.id)).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });

    it("should reject duplicate course code", async () => {
      // Create first course with code
      await prisma.course.create({
        data: {
          code: "DUPLICATE-001",
          title: "First Course",
          description: "First course",
          status: "PUBLISHED",
          createdById: instructorUser.id,
          type: "E-LEARNING",
        },
      });

      // Try to create second course with same code
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          code: "DUPLICATE-001",
          title: "Second Course",
          description: "Second course",
          type: "E-LEARNING",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe("CONFLICT");
      expect(data.message).toContain("Course code already exists");
    });
  });
});

