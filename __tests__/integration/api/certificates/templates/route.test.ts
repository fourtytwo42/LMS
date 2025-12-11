import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/certificates/templates/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Certificate Templates API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;

  beforeEach(async () => {
    // Clean up in proper order (child records first)
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: ["admin@test.com", "instructor@test.com"] } },
      select: { id: true },
    });
    const userIds = existingUsers.map((u) => u.id);

    if (userIds.length > 0) {
      // Delete courses created by these users
      const courses = await prisma.course.findMany({
        where: { createdById: { in: userIds } },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length > 0) {
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
        where: { email: { in: ["admin@test.com", "instructor@test.com"] } },
      });
    }
    
    // Clean up roles only if no users have them
    const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    const instructorRole = await prisma.role.findUnique({ where: { name: "INSTRUCTOR" } });
    
    if (adminRole) {
      const adminUsers = await prisma.userRole.count({ where: { roleId: adminRole.id } });
      if (adminUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "ADMIN" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }
    
    if (instructorRole) {
      const instructorUsers = await prisma.userRole.count({ where: { roleId: instructorRole.id } });
      if (instructorUsers === 0) {
        try {
          await prisma.role.delete({ where: { name: "INSTRUCTOR" } });
        } catch (e) {
          // Role might have been deleted already or doesn't exist
        }
      }
    }
    
    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin@test.com",
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
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin@test.com", "instructor@test.com"] },
      },
    });
    await prisma.role.deleteMany({
      where: {
        name: { in: ["ADMIN", "INSTRUCTOR"] },
      },
    });
  });

  describe("GET /api/certificates/templates", () => {
    it("should list certificate templates as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.templates).toBeDefined();
      expect(Array.isArray(data.templates)).toBe(true);
      expect(data.templates.length).toBeGreaterThan(0); // Should have default template
    });

    it("should not list templates as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates");

      const response = await GET(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/certificates/templates", () => {
    it("should create certificate template as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Custom Template",
          description: "A custom certificate template",
          template: {
            layout: "landscape",
            fields: {
              title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
              recipientName: { x: 400, y: 250, fontSize: 36, fontFamily: "Arial" },
              courseName: { x: 400, y: 350, fontSize: 24, fontFamily: "Arial" },
              completionDate: { x: 400, y: 450, fontSize: 18, fontFamily: "Arial" },
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.template).toBeDefined();
      expect(data.template.name).toBe("Custom Template");
    });

    it("should not create template as instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Custom Template",
          template: {
            layout: "landscape",
            fields: {
              title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
              recipientName: { x: 400, y: 250, fontSize: 36, fontFamily: "Arial" },
              courseName: { x: 400, y: 350, fontSize: 24, fontFamily: "Arial" },
              completionDate: { x: 400, y: 450, fontSize: 18, fontFamily: "Arial" },
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Custom Template",
          template: {
            layout: "landscape",
            fields: {
              title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
              recipientName: { x: 400, y: 250, fontSize: 36, fontFamily: "Arial" },
              courseName: { x: 400, y: 350, fontSize: 24, fontFamily: "Arial" },
              completionDate: { x: 400, y: 450, fontSize: 18, fontFamily: "Arial" },
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should return validation error for invalid template structure", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Invalid Template",
          template: {
            layout: "invalid-layout", // Invalid enum value
            fields: {
              title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
              recipientName: { x: 400, y: 250, fontSize: 36, fontFamily: "Arial" },
              courseName: { x: 400, y: 350, fontSize: 24, fontFamily: "Arial" },
              completionDate: { x: 400, y: 450, fontSize: 18, fontFamily: "Arial" },
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
      expect(data.details).toBeDefined();
    });

    it("should return validation error for missing required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          // Missing name field
          template: {
            layout: "landscape",
            fields: {
              title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
              recipientName: { x: 400, y: 250, fontSize: 36, fontFamily: "Arial" },
              courseName: { x: 400, y: 350, fontSize: 24, fontFamily: "Arial" },
              completionDate: { x: 400, y: 450, fontSize: 18, fontFamily: "Arial" },
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
      expect(data.details).toBeDefined();
    });

    it("should return validation error for missing template fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Incomplete Template",
          template: {
            layout: "landscape",
            fields: {
              title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
              // Missing recipientName, courseName, completionDate
            },
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
      expect(data.details).toBeDefined();
    });
  });
});

