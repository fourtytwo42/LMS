import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, DELETE } from "@/app/api/files/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createTestUser, createTestCourse, cleanupTestUsers } from "../../../../utils/test-helpers";
import { generateToken } from "@/lib/auth/jwt";

describe("GET /api/files/[id]", () => {
  let testUser: any;
  let testUserToken: string;
  let testInstructor: any;
  let testInstructorToken: string;
  let testLearner: any;
  let testLearnerToken: string;
  let testCourse: any;
  let testFile: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await cleanupTestUsers(["admin@test.com", "instructor@test.com", "learner@test.com", "other@test.com"]);
    
    testUser = await createTestUser({ email: "admin@test.com", roles: ["ADMIN"] });
    testUserToken = generateToken({ userId: testUser.id, email: testUser.email, roles: ["ADMIN"] });
    testInstructor = await createTestUser({ email: "instructor@test.com", roles: ["INSTRUCTOR"] });
    testInstructorToken = generateToken({ userId: testInstructor.id, email: testInstructor.email, roles: ["INSTRUCTOR"] });
    testLearner = await createTestUser({ email: "learner@test.com", roles: ["LEARNER"] });
    testLearnerToken = generateToken({ userId: testLearner.id, email: testLearner.email, roles: ["LEARNER"] });
    testCourse = await createTestCourse(testInstructor.id, "Test Course");
    testFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test.pdf",
        filePath: "repository/test-course/test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedById: testInstructor.id,
      },
    });
  });

  afterEach(async () => {
    if (testFile) {
      await prisma.repositoryFile.deleteMany({ where: { id: testFile.id } }).catch(() => {});
    }
    if (testCourse) {
      await prisma.course.deleteMany({ where: { id: testCourse.id } }).catch(() => {});
    }
    // Cleanup users after courses (to avoid foreign key constraints)
    await cleanupTestUsers(["admin@test.com", "instructor@test.com", "learner@test.com", "other@test.com"]);
  });

  it("should return file metadata for admin", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      headers: {
        cookie: `accessToken=${testUserToken}`,
      },
    });

    const response = await GET(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(testFile.id);
    expect(data.fileName).toBe("test.pdf");
  });

  it("should return file metadata for course creator", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      headers: {
        cookie: `accessToken=${testInstructorToken}`,
      },
    });
    const response = await GET(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(testFile.id);
  });

  it("should return file metadata for enrolled learner", async () => {
    await prisma.enrollment.create({
      data: {
        userId: testLearner.id,
        courseId: testCourse.id,
        status: "ENROLLED",
      },
    });

    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      headers: {
        cookie: `accessToken=${testLearnerToken}`,
      },
    });

    const response = await GET(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(testFile.id);
  });

  it("should return 404 for non-existent file", async () => {
    const request = new NextRequest("http://localhost/api/files/non-existent", {
      headers: {
        cookie: `accessToken=${testUserToken}`,
      },
    });

    const response = await GET(request, { params: { id: "non-existent" } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("NOT_FOUND");
  });

  it("should return 403 for learner without enrollment", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      headers: {
        cookie: `accessToken=${testLearnerToken}`,
      },
    });

    const response = await GET(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("FORBIDDEN");
  });

  it("should return 401 for unauthenticated request", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`);

    const response = await GET(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("UNAUTHORIZED");
  });
});

describe("DELETE /api/files/[id]", () => {
  let testUser: any;
  let testUserToken: string;
  let testInstructor: any;
  let testInstructorToken: string;
  let testLearner: any;
  let testLearnerToken: string;
  let testCourse: any;
  let testFile: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await cleanupTestUsers(["admin@test.com", "instructor@test.com", "learner@test.com"]);
    
    testUser = await createTestUser({ email: "admin@test.com", roles: ["ADMIN"] });
    testUserToken = generateToken({ userId: testUser.id, email: testUser.email, roles: ["ADMIN"] });
    testInstructor = await createTestUser({ email: "instructor@test.com", roles: ["INSTRUCTOR"] });
    testInstructorToken = generateToken({ userId: testInstructor.id, email: testInstructor.email, roles: ["INSTRUCTOR"] });
    testLearner = await createTestUser({ email: "learner@test.com", roles: ["LEARNER"] });
    testLearnerToken = generateToken({ userId: testLearner.id, email: testLearner.email, roles: ["LEARNER"] });
    testCourse = await createTestCourse(testInstructor.id, "Test Course");
    testFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test.pdf",
        filePath: "repository/test-course/test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedById: testInstructor.id,
      },
    });
  });

  afterEach(async () => {
    if (testFile) {
      await prisma.repositoryFile.deleteMany({ where: { id: testFile.id } }).catch(() => {});
    }
    if (testCourse) {
      await prisma.course.deleteMany({ where: { id: testCourse.id } }).catch(() => {});
    }
    // Cleanup users after courses (to avoid foreign key constraints)
    await cleanupTestUsers(["admin@test.com", "instructor@test.com", "learner@test.com", "other@test.com"]);
  });

  it("should delete file for admin", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      method: "DELETE",
      headers: {
        cookie: `accessToken=${testUserToken}`,
      },
    });
    const response = await DELETE(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("File deleted successfully");

    const deleted = await prisma.repositoryFile.findUnique({ where: { id: testFile.id } });
    expect(deleted).toBeNull();
  });

  it("should delete file for course creator", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      method: "DELETE",
      headers: {
        cookie: `accessToken=${testInstructorToken}`,
      },
    });

    const response = await DELETE(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("File deleted successfully");
  });

  it("should return 404 for non-existent file", async () => {
    const request = new NextRequest("http://localhost/api/files/non-existent", {
      method: "DELETE",
      headers: {
        cookie: `accessToken=${testUserToken}`,
      },
    });

    const response = await DELETE(request, { params: { id: "non-existent" } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("NOT_FOUND");
  });

  it("should return 403 for learner", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      method: "DELETE",
      headers: {
        cookie: `accessToken=${testLearnerToken}`,
      },
    });

    const response = await DELETE(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("FORBIDDEN");
  });

  it("should return 403 for instructor without permission", async () => {
    const otherInstructor = await createTestUser({ email: "other@test.com", roles: ["INSTRUCTOR"] });
    const otherInstructorToken = generateToken({ userId: otherInstructor.id, email: otherInstructor.email, roles: ["INSTRUCTOR"] });
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      method: "DELETE",
      headers: {
        cookie: `accessToken=${otherInstructorToken}`,
      },
    });

    const response = await DELETE(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("FORBIDDEN");

    await prisma.user.deleteMany({ where: { id: otherInstructor.id } }).catch(() => {});
  });

  it("should return 401 for unauthenticated request", async () => {
    const request = new NextRequest(`http://localhost/api/files/${testFile.id}`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: { id: testFile.id } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("UNAUTHORIZED");
  });
});
