import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/repository/questions/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Question Repository API - extra coverage", () => {
  let instructor: { id: string; email: string };
  let instructorToken: string;
  let learner: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ["repo-inst@test.com", "repo-learner@test.com"] } },
    });

    const instPwd = await hashPassword("InstructorPass123");
    instructor = await prisma.user.create({
      data: {
        email: "repo-inst@test.com",
        passwordHash: instPwd,
        firstName: "Inst",
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
    instructorToken = generateToken({
      userId: instructor.id,
      email: instructor.email,
      roles: ["INSTRUCTOR"],
    });

    const learnerPwd = await hashPassword("LearnerPass123");
    learner = await prisma.user.create({
      data: {
        email: "repo-learner@test.com",
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
    learnerToken = generateToken({
      userId: learner.id,
      email: learner.email,
      roles: ["LEARNER"],
    });
  });

  afterEach(async () => {
    await prisma.questionRepository.deleteMany({
      where: { createdById: instructor.id },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["repo-inst@test.com", "repo-learner@test.com"] } },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["INSTRUCTOR", "LEARNER"] },
        users: { none: {} },
      },
    });
  });

  it("should forbid GET for learner", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/questions", {
      headers: { cookie: `accessToken=${learnerToken}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return 401 when unauthenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/questions");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should validate POST payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `accessToken=${instructorToken}`,
      },
      body: JSON.stringify({ name: "" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should create repository as instructor", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `accessToken=${instructorToken}`,
      },
      body: JSON.stringify({
        name: "My Repo",
        description: "Desc",
        category: "math",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.repository).toBeDefined();
    expect(data.repository.name).toBe("My Repo");
  });

  it("should filter repositories by search", async () => {
    // create two repos
    await prisma.questionRepository.create({
      data: {
        name: "Algebra Repo",
        description: "math stuff",
        createdById: instructor.id,
      },
    });
    await prisma.questionRepository.create({
      data: {
        name: "History Repo",
        description: "history",
        createdById: instructor.id,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/repository/questions?search=Algebra", {
      headers: { cookie: `accessToken=${instructorToken}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.repositories.length).toBeGreaterThanOrEqual(1);
    expect(data.repositories[0].name).toContain("Algebra");
  });
});

