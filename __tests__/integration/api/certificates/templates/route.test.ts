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
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin@test.com", "instructor@test.com"] },
      },
    });
    
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
  });
});

