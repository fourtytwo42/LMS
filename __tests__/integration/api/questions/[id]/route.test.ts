import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/questions/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Questions [id] API", () => {
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
  let testQuestion: { id: string };

  beforeEach(async () => {
    // Clean up in correct order to avoid foreign key constraints
    // First delete questions, tests, content items, courses, then users
    const testEmails = ["admin-qid@test.com", "instructor-qid@test.com", "other-instructor-qid@test.com", "learner-qid@test.com"];
    
    // Find users first
    const users = await prisma.user.findMany({
      where: { email: { in: testEmails } },
      select: { id: true },
    });
    const userIds = users.map(u => u.id);

    if (userIds.length > 0) {
      // Delete questions
      await prisma.question.deleteMany({
        where: {
          test: {
            contentItem: {
              course: {
                createdById: { in: userIds },
              },
            },
          },
        },
      });
      
      // Delete tests
      await prisma.test.deleteMany({
        where: {
          contentItem: {
            course: {
              createdById: { in: userIds },
            },
          },
        },
      });
      
      // Delete content items
      await prisma.contentItem.deleteMany({
        where: {
          course: {
            createdById: { in: userIds },
          },
        },
      });
      
      // Delete courses
      await prisma.course.deleteMany({
        where: {
          createdById: { in: userIds },
        },
      });
    }
    
    // Delete users
    await prisma.user.deleteMany({
      where: {
        email: { in: testEmails },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-qid@test.com",
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
        email: "instructor-qid@test.com",
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
        email: "other-instructor-qid@test.com",
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
        email: "learner-qid@test.com",
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
        title: "Test Course for Question ID",
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

    // Create question
    testQuestion = await prisma.question.create({
      data: {
        testId: testTest.id,
        type: "SINGLE_CHOICE",
        questionText: "What is 2+2?",
        points: 1.0,
        order: 1,
        options: [
          { text: "3", correct: false },
          { text: "4", correct: true },
          { text: "5", correct: false },
        ],
        correctAnswer: null, // For SINGLE_CHOICE, correct answer is in options
      },
    });
  });

  afterEach(async () => {
    await prisma.question.deleteMany({ where: { id: testQuestion.id } });
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-qid@test.com", "instructor-qid@test.com", "other-instructor-qid@test.com", "learner-qid@test.com"] },
      },
    });
  });

  describe("GET /api/questions/:id", () => {
    it("should get question as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.question.id).toBe(testQuestion.id);
    });

    it("should get question as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);
    });

    it("should return 404 for non-existent question", async () => {
      const request = new NextRequest("http://localhost:3000/api/questions/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should allow any instructor to get question", async () => {
      // Any instructor can view questions (not just creator)
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for learner (not enrolled)", async () => {
      // Learner is not enrolled, so should get 403
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testQuestion.id } });
      // The GET function checks if user is admin, instructor, creator, or assigned
      // Learners are not included, so this should return 403
      expect(response.status).toBe(403);
    });

    it("should return 401 when unauthenticated", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`);

      const response = await GET(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/questions/:id", () => {
    it("should update question as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({ questionText: "Updated question" }),
      });

      const response = await PUT(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.question.questionText).toBe("Updated question");
    });

    it("should update question as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({ points: 2.0 }),
      });

      const response = await PUT(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({ questionText: "Unauthorized" }),
      });

      const response = await PUT(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({ questionText: "Learner update" }),
      });

      const response = await PUT(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(403);
    });

    it("should validate input", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({ points: -1 }), // Invalid
      });

      const response = await PUT(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/questions/:id", () => {
    it("should delete question as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await DELETE(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);

      // Verify deleted
      const deleted = await prisma.question.findUnique({ where: { id: testQuestion.id } });
      expect(deleted).toBeNull();
    });

    it("should delete question as creator", async () => {
      // Create another question
      const anotherQuestion = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "TRUE_FALSE",
          questionText: "Another question",
          points: 1.0,
          order: 2,
          correctAnswer: true, // Boolean for TRUE_FALSE
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/questions/${anotherQuestion.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await DELETE(request, { params: { id: anotherQuestion.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await DELETE(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "DELETE",
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await DELETE(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(403);
    });
  });
});

