import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/repository/content/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Content Repository API - extra coverage", () => {
  let instructor: { id: string; email: string };
  let instructorToken: string;
  let learner: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    await prisma.contentRepository.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ["content-inst@test.com", "content-learner@test.com"] } },
    });

    const instPwd = await hashPassword("InstructorPass123");
    instructor = await prisma.user.create({
      data: {
        email: "content-inst@test.com",
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
        email: "content-learner@test.com",
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
    await prisma.contentRepository.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ["content-inst@test.com", "content-learner@test.com"] } },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["INSTRUCTOR", "LEARNER"] },
        users: { none: {} },
      },
    });
  });

  it("should forbid GET for learner", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/content", {
      headers: { cookie: `accessToken=${learnerToken}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return 401 when unauthenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/content");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should support filtering by type", async () => {
    const request = new NextRequest("http://localhost:3000/api/repository/content?type=PDF", {
      headers: { cookie: `accessToken=${instructorToken}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("should support search filter", async () => {
    // Seed a repo entry
    await prisma.contentRepository.create({
      data: {
        name: "Week1 Slides",
        description: "Slides for week 1",
        type: "PDF",
        filePath: "repository/fake/path.pdf",
        fileSize: 123,
        mimeType: "application/pdf",
        uploadedById: instructor.id,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/repository/content?search=Slides", {
      headers: { cookie: `accessToken=${instructorToken}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.contentItems.length).toBeGreaterThanOrEqual(1);
  });
});

