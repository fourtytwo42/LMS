import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/questions/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Questions API", () => {
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCourse: { id: string };
  let testContentItem: { id: string };
  let testTest: { id: string };
  let testQuestion: { id: string };

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "instructor-questions@test.com",
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
        email: "instructor-questions@test.com",
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

    // Create test
    testTest = await prisma.test.create({
      data: {
        contentItemId: testContentItem.id,
        title: "Test Quiz",
        passingScore: 0.7,
      },
    });

    // Create test question
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
        correctAnswer: true,
      },
    });
  });

  afterEach(async () => {
    await prisma.question.deleteMany({
      where: {
        id: testQuestion.id,
      },
    });
    await prisma.test.deleteMany({
      where: {
        id: testTest.id,
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
        email: "instructor-questions@test.com",
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

  describe("GET /api/questions/:id", () => {
    it("should get question as instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question).toBeDefined();
      expect(data.question.id).toBe(testQuestion.id);
    });
  });

  describe("PUT /api/questions/:id", () => {
    it("should update question as instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          questionText: "What is 2+3?",
        }),
      });

      const response = await PUT(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.questionText).toBe("What is 2+3?");
    });
  });

  describe("DELETE /api/questions/:id", () => {
    it("should delete question as instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/questions/${testQuestion.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testQuestion.id } });
      expect(response.status).toBe(200);
    });
  });
});

