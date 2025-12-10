import { describe, it, expect, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/system/settings/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("System Settings API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-settings@test.com", "instructor-settings@test.com", "learner-settings@test.com"] },
      },
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-settings@test.com",
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
        email: "instructor-settings@test.com",
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

    // Create learner user
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-settings@test.com",
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
    learnerToken = generateToken({ userId: learnerUser.id, email: learnerUser.email, roles: ["LEARNER"] });
  });

  describe("GET /api/system/settings", () => {
    it("should get settings as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        headers: {
          cookie: `accessToken=${adminToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.selfRegistration).toBeDefined();
      expect(data.password).toBeDefined();
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        headers: {
          cookie: `accessToken=${instructorToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        headers: {
          cookie: `accessToken=${learnerToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/system/settings", () => {
    it("should update settings as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          selfRegistration: {
            enabled: false,
            emailVerification: true,
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe("Settings updated successfully");
    });

    it("should update password settings", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          password: {
            minLength: 10,
            requireSpecialChars: true,
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);
    });

    it("should update account lockout settings", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          accountLockout: {
            enabled: true,
            maxAttempts: 3,
            lockoutDuration: 15,
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);
    });

    it("should update email settings", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          email: {
            smtpEnabled: true,
            smtpHost: "smtp.example.com",
            smtpPort: 587,
            fromEmail: "noreply@example.com",
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);
    });

    it("should return validation error for invalid password minLength", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          password: {
            minLength: 5, // Invalid: less than 6
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for invalid email", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${adminToken}`,
        },
        body: JSON.stringify({
          email: {
            fromEmail: "invalid-email", // Invalid email format
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${instructorToken}`,
        },
        body: JSON.stringify({
          selfRegistration: {
            enabled: false,
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: `accessToken=${learnerToken}`,
        },
        body: JSON.stringify({
          selfRegistration: {
            enabled: false,
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selfRegistration: {
            enabled: false,
          },
        }),
      });

      const response = await PUT(request);
      expect(response.status).toBe(401);
    });
  });
});

