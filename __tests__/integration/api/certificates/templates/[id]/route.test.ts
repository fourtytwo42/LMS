import { describe, it, expect, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/certificates/templates/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Certificate Templates [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-cert-id@test.com", "instructor-cert-id@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-cert-id@test.com",
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
                  description: "Administrator",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roles: ["ADMIN"] });

    // Create instructor user
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-cert-id@test.com",
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
                  description: "Instructor",
                  permissions: [],
                },
              },
            },
          },
        },
      },
    });
    instructorToken = generateToken({ userId: instructorUser.id, email: instructorUser.email, roles: ["INSTRUCTOR"] });
  });

  describe("GET /api/certificates/templates/[id]", () => {
    it("should get template as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "default" } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.template.id).toBe("default");
      expect(data.template.name).toBe("Default Certificate");
    });

    it("should return 404 for non-existent template", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/non-existent", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request, { params: { id: "default" } });
      expect(response.status).toBe(403);
    });
  });

  describe("PUT /api/certificates/templates/[id]", () => {
    it("should update template as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Updated Default Certificate",
        }),
      });

      const response = await PUT(request, { params: { id: "default" } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.template.name).toBe("Updated Default Certificate");
    });

    it("should return validation error for invalid data", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "", // Invalid: empty name
        }),
      });

      const response = await PUT(request, { params: { id: "default" } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized Update",
        }),
      });

      const response = await PUT(request, { params: { id: "default" } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent template", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/non-existent", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Update",
        }),
      });

      const response = await PUT(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/certificates/templates/[id]", () => {
    it("should return 400 for default template", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "default" } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("BAD_REQUEST");
      expect(data.message).toContain("Cannot delete default template");
    });

    it("should return 404 for non-existent template", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/non-existent", {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/certificates/templates/default", {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "default" } });
      expect(response.status).toBe(403);
    });
  });
});

