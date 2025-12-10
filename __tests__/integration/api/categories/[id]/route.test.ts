import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/categories/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Categories [id] API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let testCategory: any;
  let parentCategory: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-cat-id@test.com", "instructor-cat-id@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-cat-id@test.com",
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
        email: "instructor-cat-id@test.com",
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

    // Create parent category
    parentCategory = await prisma.category.create({
      data: {
        name: "Parent Category",
        description: "Parent category",
      },
    });

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: "Test Category",
        description: "Test category",
        parentId: parentCategory.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.category.deleteMany({
      where: {
        id: { in: [testCategory.id, parentCategory.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-cat-id@test.com", "instructor-cat-id@test.com"] },
      },
    });
  });

  describe("GET /api/categories/[id]", () => {
    it("should get category as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(testCategory.id);
      expect(data.name).toBe("Test Category");
    });

    it("should return 404 for non-existent category", async () => {
      const request = new NextRequest("http://localhost:3000/api/categories/non-existent", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/categories/[id]", () => {
    it("should update category as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Updated Category",
          description: "Updated description",
        }),
      });

      const response = await PUT(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.category.name).toBe("Updated Category");
    });

    it("should return 409 for duplicate name", async () => {
      // Create another category
      const otherCategory = await prisma.category.create({
        data: {
          name: "Other Category",
          description: "Other category",
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          name: "Other Category", // Duplicate name
        }),
      });

      const response = await PUT(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe("CONFLICT");

      // Cleanup
      await prisma.category.delete({ where: { id: otherCategory.id } });
    });

    it("should return 400 for category being its own parent", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          parentId: testCategory.id, // Cannot be its own parent
        }),
      });

      const response = await PUT(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("BAD_REQUEST");
      expect(data.message).toContain("cannot be its own parent");
    });

    it("should return 404 for non-existent parent", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          parentId: "non-existent-parent",
        }),
      });

      const response = await PUT(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("NOT_FOUND");
      expect(data.message).toContain("Parent category not found");
    });

    it("should return 400 for circular reference", async () => {
      // Create a child category
      const childCategory = await prisma.category.create({
        data: {
          name: "Child Category",
          description: "Child category",
          parentId: testCategory.id,
        },
      });

      // Try to set testCategory's parent to childCategory (circular)
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          parentId: childCategory.id, // Circular: testCategory -> childCategory -> testCategory
        }),
      });

      const response = await PUT(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("BAD_REQUEST");
      expect(data.message).toContain("Circular reference");

      // Cleanup
      await prisma.category.delete({ where: { id: childCategory.id } });
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized Update",
        }),
      });

      const response = await PUT(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent category", async () => {
      const request = new NextRequest("http://localhost:3000/api/categories/non-existent", {
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

  describe("DELETE /api/categories/[id]", () => {
    it("should delete category as admin", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(200);

      // Verify deleted
      const deleted = await prisma.category.findUnique({
        where: { id: testCategory.id },
      });
      expect(deleted).toBeNull();
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest(`http://localhost:3000/api/categories/${testCategory.id}`, {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: testCategory.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent category", async () => {
      const request = new NextRequest("http://localhost:3000/api/categories/non-existent", {
        method: "DELETE",
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await DELETE(request, { params: { id: "non-existent" } });
      expect(response.status).toBe(404);
    });
  });
});

