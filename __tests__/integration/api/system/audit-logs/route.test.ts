import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/system/audit-logs/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("System Audit Logs API", () => {
  let adminUser: { id: string; email: string };
  let adminToken: string;
  let instructorUser: { id: string; email: string };
  let instructorToken: string;
  let learnerUser: { id: string; email: string };
  let learnerToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-audit@test.com", "instructor-audit@test.com", "learner-audit@test.com"] },
      },
    });

    // Create admin
    const adminPasswordHash = await hashPassword("AdminPass123");
    adminUser = await prisma.user.create({
      data: {
        email: "admin-audit@test.com",
        passwordHash: adminPasswordHash,
        firstName: "Admin",
        lastName: "User",
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "ADMIN" },
                create: { name: "ADMIN", description: "Admin", permissions: [] },
              },
            },
          },
        },
      },
    });
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roles: ["ADMIN"] });

    // Create instructor
    const instructorPasswordHash = await hashPassword("InstructorPass123");
    instructorUser = await prisma.user.create({
      data: {
        email: "instructor-audit@test.com",
        passwordHash: instructorPasswordHash,
        firstName: "Instructor",
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
    instructorToken = generateToken({ userId: instructorUser.id, email: instructorUser.email, roles: ["INSTRUCTOR"] });

    // Create learner
    const learnerPasswordHash = await hashPassword("LearnerPass123");
    learnerUser = await prisma.user.create({
      data: {
        email: "learner-audit@test.com",
        passwordHash: learnerPasswordHash,
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
    learnerToken = generateToken({ userId: learnerUser.id, email: learnerUser.email, roles: ["LEARNER"] });

    // Create test audit logs
    await prisma.auditLog.createMany({
      data: [
        {
          userId: adminUser.id,
          action: "CREATE",
          entityType: "COURSE",
          entityId: "course-1",
          changes: { title: "New Course" },
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
        },
        {
          userId: instructorUser.id,
          action: "UPDATE",
          entityType: "COURSE",
          entityId: "course-1",
          changes: { title: "Updated Course" },
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
        },
        {
          userId: learnerUser.id,
          action: "VIEW",
          entityType: "COURSE",
          entityId: "course-1",
          changes: {},
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        userId: { in: [adminUser.id, instructorUser.id, learnerUser.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ["admin-audit@test.com", "instructor-audit@test.com", "learner-audit@test.com"] },
      },
    });
  });

  describe("GET /api/system/audit-logs", () => {
    it("should get audit logs as admin", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.logs).toBeDefined();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it("should return 403 for instructor", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs", {
        headers: { cookie: `accessToken=${instructorToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 for learner", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs", {
        headers: { cookie: `accessToken=${learnerToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated request", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should filter by userId", async () => {
      const request = new NextRequest(`http://localhost:3000/api/system/audit-logs?userId=${adminUser.id}`, {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.logs.every((log: any) => log.userId === adminUser.id)).toBe(true);
    });

    it("should filter by entityType", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs?entityType=COURSE", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.logs.every((log: any) => log.entityType === "COURSE")).toBe(true);
    });

    it("should filter by action", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs?action=CREATE", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.logs.every((log: any) => log.action === "CREATE")).toBe(true);
    });

    it("should support pagination", async () => {
      const request = new NextRequest("http://localhost:3000/api/system/audit-logs?page=1&limit=2", {
        headers: { cookie: `accessToken=${adminToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.logs.length).toBeLessThanOrEqual(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
    });

    it("should filter by date range", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const request = new NextRequest(
        `http://localhost:3000/api/system/audit-logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: { cookie: `accessToken=${adminToken}` },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.logs).toBeDefined();
    });
  });
});

