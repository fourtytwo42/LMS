import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/tests/[id]/questions/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Tests [id] Questions API", () => {
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
        email: { in: ["admin-questions@test.com", "instructor-questions@test.com", "other-instructor-questions@test.com", "learner-questions@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-questions@test.com",
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
        email: "instructor-questions@test.com",
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
        email: "other-instructor-questions@test.com",
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
        email: "learner-questions@test.com",
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
        title: "Test Course for Questions",
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
    await prisma.question.deleteMany({ where: { testId: testTest.id } });
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-questions@test.com", "instructor-questions@test.com", "other-instructor-questions@test.com", "learner-questions@test.com"] },
      },
    });
  });

  describe("GET /api/tests/[id]/questions", () => {
    it("should get questions as admin", async () => {
      // Create a question
      const question = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "SINGLE_CHOICE",
          questionText: "Test question",
          points: 1.0,
          order: 1,
          options: [
            { text: "Option 1", correct: false },
            { text: "Option 2", correct: true },
          ],
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(1);
      expect(data.questions[0].id).toBe(question.id);

      // Cleanup
      await prisma.question.delete({ where: { id: question.id } });
    });

    it("should get questions as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questions).toBeDefined();
    });

    it("should get questions as assigned instructor", async () => {
      // Assign other instructor
      await prisma.instructorAssignment.create({
        data: {
          userId: otherInstructorUser.id,
          courseId: testCourse.id,
          assignedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.instructorAssignment.deleteMany({ where: { courseId: testCourse.id } });
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        headers: { cookie: `accessToken=${otherInstructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent test", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests/non-existent/questions", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`);

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(401);
    });

    it("should return questions ordered by order field", async () => {
      // Create questions in reverse order
      const q1 = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "SINGLE_CHOICE",
          questionText: "Question 1",
          points: 1.0,
          order: 2,
          options: [{ text: "Option", correct: true }],
        },
      });

      const q2 = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "SINGLE_CHOICE",
          questionText: "Question 2",
          points: 1.0,
          order: 1,
          options: [{ text: "Option", correct: true }],
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questions.length).toBe(2);
      expect(data.questions[0].order).toBe(1);
      expect(data.questions[1].order).toBe(2);

      // Cleanup
      await prisma.question.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
    });
  });

  describe("POST /api/tests/[id]/questions", () => {
    it("should create SINGLE_CHOICE question as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "What is 2+2?",
          points: 1.0,
          options: [
            { text: "3", correct: false },
            { text: "4", correct: true },
            { text: "5", correct: false },
          ],
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.question).toBeDefined();
      expect(data.question.questionText).toBe("What is 2+2?");
    });

    it("should create MULTIPLE_CHOICE question", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "MULTIPLE_CHOICE",
          questionText: "Select all even numbers",
          points: 2.0,
          options: [
            { text: "2", correct: true },
            { text: "3", correct: false },
            { text: "4", correct: true },
            { text: "5", correct: false },
          ],
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.question).toBeDefined();
    });

    it("should create TRUE_FALSE question", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "TRUE_FALSE",
          questionText: "The Earth is round",
          points: 1.0,
          correctAnswer: true,
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.question).toBeDefined();
    });

    it("should create SHORT_ANSWER question", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "SHORT_ANSWER",
          questionText: "What is the capital of France?",
          points: 1.0,
          correctAnswers: ["Paris"], // Use correctAnswers array for SHORT_ANSWER
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.question).toBeDefined();
    });

    it("should create FILL_BLANK question", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "FILL_BLANK",
          questionText: "The capital of France is _____",
          points: 1.0,
          correctAnswers: ["Paris"], // Use correctAnswers array for FILL_BLANK
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.question).toBeDefined();
    });

    it("should return 400 for SINGLE_CHOICE without options", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Question",
          points: 1.0,
          // Missing options
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(400);
    });

    it("should return 400 for SINGLE_CHOICE with less than 2 options", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Question",
          points: 1.0,
          options: [{ text: "Only one", correct: true }],
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("at least 2 options");
    });

    it("should return 400 for SHORT_ANSWER without correctAnswers", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "SHORT_ANSWER",
          questionText: "Question",
          points: 1.0,
          // Missing correctAnswers
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("correct answer");
    });

    it("should return 400 for FILL_BLANK without correctAnswers", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "FILL_BLANK",
          questionText: "Question",
          points: 1.0,
          // Missing correctAnswers
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(400);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Question",
          points: 1.0,
          options: [
            { text: "Option 1", correct: false },
            { text: "Option 2", correct: true },
          ],
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for non-assigned instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Question",
          points: 1.0,
          options: [
            { text: "Option 1", correct: false },
            { text: "Option 2", correct: true },
          ],
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent test", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests/non-existent/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Question",
          points: 1.0,
          options: [
            { text: "Option 1", correct: false },
            { text: "Option 2", correct: true },
          ],
        }),
      });

      const response = await POST(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should set order automatically if not provided", async () => {
      // Create first question
      await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "SINGLE_CHOICE",
          questionText: "First",
          points: 1.0,
          order: 5,
          options: [{ text: "Option", correct: true }],
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Second",
          points: 1.0,
          options: [
            { text: "Option 1", correct: false },
            { text: "Option 2", correct: true },
          ],
          // order not provided
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);

      // Verify order was set to maxOrder + 1
      const questions = await prisma.question.findMany({
        where: { testId: testTest.id },
        orderBy: { order: "asc" },
      });
      expect(questions.length).toBe(2);
      expect(questions[1].order).toBe(6); // 5 + 1
    });

    it("should create question with explanation", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          type: "SINGLE_CHOICE",
          questionText: "Question with explanation",
          points: 1.0,
          options: [
            { text: "Option 1", correct: false },
            { text: "Option 2", correct: true },
          ],
          explanation: "This is the correct answer because...",
        }),
      });

      const response = await POST(request, { params: { id: testTest.id } });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.question).toBeDefined();

      // Verify explanation was saved
      const question = await prisma.question.findFirst({
        where: { testId: testTest.id },
      });
      expect(question?.explanation).toBe("This is the correct answer because...");
    });
  });
});
