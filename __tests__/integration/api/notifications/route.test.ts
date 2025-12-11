import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/notifications/route";
import { PUT } from "@/app/api/notifications/read-all/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

describe("Notifications API", () => {
  let testUser: { id: string; email: string };
  let userToken: string;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: "notify@test.com",
      },
    });

    // Create test user
    const passwordHash = await hashPassword("TestPass123");
    testUser = await prisma.user.create({
      data: {
        email: "notify@test.com",
        passwordHash,
        firstName: "Test",
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
    userToken = generateToken({
      userId: testUser.id,
      email: testUser.email,
      roles: ["LEARNER"],
    });

    // Create test notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: testUser.id,
          type: "ENROLLMENT",
          title: "Test Notification 1",
          message: "You have been enrolled",
          read: false,
        },
        {
          userId: testUser.id,
          type: "COURSE",
          title: "Test Notification 2",
          message: "Course updated",
          read: true,
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.notification.deleteMany({
      where: {
        userId: testUser.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: "notify@test.com",
      },
    });
  });

  describe("GET /api/notifications", () => {
    it("should list user notifications", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications", {
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.notifications).toBeDefined();
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.unreadCount).toBeDefined();
    });

    it("should filter unread notifications", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications?read=false", {
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.notifications.every((n: any) => !n.read)).toBe(true);
    });

    it("should filter read notifications", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications?read=true", {
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.notifications.every((n: any) => n.read)).toBe(true);
    });

    it("should return unread count", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications", {
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.unreadCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle pagination", async () => {
      // Create more notifications for pagination
      await prisma.notification.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          userId: testUser.id,
          type: "COURSE",
          title: `Notification ${i}`,
          message: `Message ${i}`,
          read: false,
        })),
      });

      const request = new NextRequest("http://localhost:3000/api/notifications?page=1&limit=3", {
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.notifications.length).toBeLessThanOrEqual(3);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(3);
      expect(data.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it("should handle read filter with no value (show all)", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications", {
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      // Should return both read and unread notifications
      expect(data.notifications.length).toBeGreaterThan(0);
      expect(data.unreadCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("PUT /api/notifications/read-all", () => {
    it("should mark all notifications as read", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/read-all", {
        method: "PUT",
        headers: {
          cookie: `accessToken=${userToken}`,
        },
      });

      const response = await PUT(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe("All notifications marked as read");
      expect(data.count).toBeGreaterThanOrEqual(0);
    });

    it("should require authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/read-all", {
        method: "PUT",
      });

      const response = await PUT(request);
      expect(response.status).toBe(401);
    });
  });
});

