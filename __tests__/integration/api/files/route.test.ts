import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, DELETE } from "@/app/api/files/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Files API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testFile: { id: string };

  beforeEach(async () => {
    // Clean up in dependency order: files -> courses -> users/roles
    await prisma.repositoryFile.deleteMany({
      where: {
        course: {
          title: { in: ["Test Course"] },
        },
      },
    });
    await prisma.course.deleteMany({
      where: {
        title: "Test Course",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-files@test.com", "instructor-files@test.com"] },
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["ADMIN", "INSTRUCTOR"] },
        users: { none: {} },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-files@test.com",
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
                  description: "Admin role",
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
        email: "instructor-files@test.com",
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
    const testCourse = await prisma.course.create({
      data: {
        title: "Test Course",
        description: "Test course for files",
        status: "PUBLISHED",
        type: "E-LEARNING",
        createdById: instructorUser.id,
      },
    });

    // Create test file
    testFile = await prisma.repositoryFile.create({
      data: {
        courseId: testCourse.id,
        fileName: "test.pdf",
        filePath: "repository/test-course/test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedById: instructorUser.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.repositoryFile.deleteMany({
      where: {
        course: {
          title: "Test Course",
        },
      },
    });
    await prisma.course.deleteMany({
      where: {
        title: "Test Course",
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-files@test.com", "instructor-files@test.com"] },
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["ADMIN", "INSTRUCTOR"] },
        users: {
          none: {},
        },
      },
    });
  });

  describe("GET /api/files/:id", () => {
    it("should get file metadata as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(testFile.id);
      expect(data.fileName).toBe("test.pdf");
    });

    it("should get file metadata as uploader", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(testFile.id);
    });

    it("should return 404 for non-existent file", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/non-existent", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should allow enrolled user to access file", async () => {
      // Create learner user
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "learner-files@test.com",
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

      // Get the course from testFile
      const file = await prisma.repositoryFile.findUnique({
        where: { id: testFile.id },
        include: { course: true },
      });

      // Enroll learner in course
      await prisma.enrollment.create({
        data: {
          userId: learnerUser.id,
          courseId: file!.courseId,
          status: "ENROLLED",
        },
      });

      const learnerToken = generateToken({
        userId: learnerUser.id,
        email: learnerUser.email,
        roles: ["LEARNER"],
      });

      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(200);

      // Cleanup
      await prisma.enrollment.deleteMany({ where: { userId: learnerUser.id } });
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });

    it("should deny access to unauthorized user", async () => {
      // Create learner user (not enrolled)
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "unauthorized-learner@test.com",
          passwordHash: learnerPasswordHash,
          firstName: "Unauthorized",
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

      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });

    it("should require authentication", async () => {
      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`);
      const response = await GET(request, { params: { id: testFile.id } });
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/files/:id", () => {
    it("should delete file as admin", async () => {
      // Create a file to delete
      const fileToDelete = await prisma.repositoryFile.create({
        data: {
          courseId: (await prisma.course.findFirst({ where: { title: "Test Course" } }))!.id,
          fileName: "delete-test.pdf",
          filePath: "repository/test-course/delete-test.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/files/${fileToDelete.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: fileToDelete.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain("deleted successfully");
    });

    it("should delete file as uploader", async () => {
      // Create a file to delete
      const fileToDelete = await prisma.repositoryFile.create({
        data: {
          courseId: (await prisma.course.findFirst({ where: { title: "Test Course" } }))!.id,
          fileName: "delete-test-2.pdf",
          filePath: "repository/test-course/delete-test-2.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedById: instructorUser.id,
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/files/${fileToDelete.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: fileToDelete.id } });
      expect(response.status).toBe(200);
    });

    it("should deny delete for non-instructor/admin", async () => {
      const learnerPasswordHash = await hashPassword("LearnerPass123");
      const learnerUser = await prisma.user.create({
        data: {
          email: "learner-delete@test.com",
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

      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testFile.id } });
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: learnerUser.id } });
    });

    it("should return 404 for non-existent file on delete", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/non-existent", {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should deny delete for instructor without permission", async () => {
      // Create another instructor
      const otherInstructorPasswordHash = await hashPassword("OtherInstructorPass123");
      const otherInstructor = await prisma.user.create({
        data: {
          email: "other-instructor@test.com",
          passwordHash: otherInstructorPasswordHash,
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

      const otherInstructorToken = generateToken({
        userId: otherInstructor.id,
        email: otherInstructor.email,
        roles: ["INSTRUCTOR"],
      });

      const request = new NextRequest(`http://localhost:3000/api/files/${testFile.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${otherInstructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testFile.id } });
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: otherInstructor.id } });
    });
  });
});

