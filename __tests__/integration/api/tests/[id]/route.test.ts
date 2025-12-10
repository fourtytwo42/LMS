import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, PUT } from "@/app/api/tests/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Tests [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;
  let otherInstructorUser: { id: string; email: string };
  let otherInstructorToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };
  let testTest: { id: string };

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-testid@test.com", "instructor-testid@test.com", "learner-testid@test.com", "other-instructor-testid@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-testid@test.com",
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
        email: "instructor-testid@test.com",
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
        email: "other-instructor-testid@test.com",
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
        email: "learner-testid@test.com",
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
        title: "Test Course for Test ID",
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
        showCorrectAnswers: false,
      },
    });
  });

  afterEach(async () => {
    await prisma.test.deleteMany({ where: { id: testTest.id } });
    await prisma.contentItem.deleteMany({ where: { id: testContentItem.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-testid@test.com", "instructor-testid@test.com", "learner-testid@test.com", "other-instructor-testid@test.com"] },
      },
    });
  });

  describe("GET /api/tests/:id", () => {
    it("should get test as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testTest.id);
      expect(data.title).toBe("Test Quiz");
    });

    it("should get test as instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
    });

    it("should get test as enrolled learner", async () => {
      // Enroll learner
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      // Should hide answers for learner
      if (data.questions && data.questions.length > 0) {
        expect(data.questions[0].options).toBeDefined();
        if (data.questions[0].options) {
          expect(data.questions[0].options[0].correct).toBeUndefined();
        }
      }
    });

    it("should return 404 for non-existent test", async () => {
      const request = new NextRequest("http://localhost:3000/api/tests/non-existent", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 403 for unenrolled learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 401 when unauthenticated", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`);

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(401);
    });

    it("should show correct answers to learner when showCorrectAnswers is true", async () => {
      // Update test to show correct answers
      await prisma.test.update({
        where: { id: testTest.id },
        data: { showCorrectAnswers: true },
      });

      // Create question with options
      const question = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "SINGLE_CHOICE",
          questionText: "What is 2+2?",
          points: 10,
          order: 1,
          options: [
            { text: "3", correct: false },
            { text: "4", correct: true },
            { text: "5", correct: false },
          ],
          explanation: "Basic math",
        },
      });

      // Enroll learner
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should show correct answers
      if (data.questions && data.questions.length > 0) {
        const q = data.questions[0];
        expect(q.options).toBeDefined();
        if (q.options && q.options.length > 0) {
          expect(q.options[0].correct).toBeDefined();
        }
        expect(q.explanation).toBe("Basic math");
      }

      // Cleanup
      await prisma.question.delete({ where: { id: question.id } });
    });

    it("should handle MULTIPLE_CHOICE questions", async () => {
      const question = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "MULTIPLE_CHOICE",
          questionText: "Select all even numbers",
          points: 10,
          order: 1,
          options: [
            { text: "2", correct: true },
            { text: "3", correct: false },
            { text: "4", correct: true },
          ],
        },
      });

      // Enroll learner
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: testCourse.id,
          status: "ENROLLED",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const mcQuestion = data.questions.find((q: any) => q.type === "MULTIPLE_CHOICE");
      expect(mcQuestion).toBeDefined();
      expect(mcQuestion.options).toBeDefined();

      // Cleanup
      await prisma.question.delete({ where: { id: question.id } });
    });

    it("should handle questions without explanations", async () => {
      const question = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "TRUE_FALSE",
          questionText: "Is the sky blue?",
          points: 5,
          order: 1,
          correctAnswer: true,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const tfQuestion = data.questions.find((q: any) => q.type === "TRUE_FALSE");
      expect(tfQuestion).toBeDefined();
      expect(tfQuestion.explanation).toBeUndefined();

      // Cleanup
      await prisma.question.delete({ where: { id: question.id } });
    });

    it("should show explanations to instructors when not hiding answers", async () => {
      const question = await prisma.question.create({
        data: {
          testId: testTest.id,
          type: "SHORT_ANSWER",
          questionText: "What is the capital of France?",
          points: 10,
          order: 1,
          correctAnswers: ["Paris"],
          explanation: "Paris is the capital and largest city of France",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const saQuestion = data.questions.find((q: any) => q.type === "SHORT_ANSWER");
      expect(saQuestion).toBeDefined();
      expect(saQuestion.explanation).toBe("Paris is the capital and largest city of France");

      // Cleanup
      await prisma.question.delete({ where: { id: question.id } });
    });
  });

  describe("PUT /api/tests/:id", () => {
    it("should update test as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({ title: "Updated Test Title" }),
      });

      const response = await PUT(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.test).toBeDefined();
      expect(data.test.title).toBe("Updated Test Title");
    });

    it("should update test as creator", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({ description: "Updated description" }),
      });

      const response = await PUT(request, { params: { id: testTest.id } });
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-creator instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${otherInstructorToken}`,
        },
        body: JSON.stringify({ title: "Unauthorized Update" }),
      });

      const response = await PUT(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({ title: "Learner Update" }),
      });

      const response = await PUT(request, { params: { id: testTest.id } });
      expect(response.status).toBe(403);
    });

    it("should validate input", async () => {
      const request = new NextRequest(`http://localhost:3000/api/tests/${testTest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({ passingScore: 2.0 }), // Invalid: > 1
      });

      const response = await PUT(request, { params: { id: testTest.id } });
      expect(response.status).toBe(400);
    });
  });

});

