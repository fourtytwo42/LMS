import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PUT } from "@/app/api/notifications/[id]/read/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createTestUser } from "../../../../../utils/test-helpers";
import { generateToken } from "@/lib/auth/jwt";

describe("PUT /api/notifications/[id]/read", () => {
  let testUser: any;
  let testUserToken: string;
  let otherUser: any;
  let otherUserToken: string;
  let testNotification: any;

  beforeEach(async () => {
    // Clean up any existing users first
    await prisma.user.deleteMany({
      where: {
        email: { in: ["user@test.com", "other@test.com"] },
      },
    });
    
    testUser = await createTestUser({ email: "user@test.com", roles: ["LEARNER"] });
    testUserToken = generateToken({ userId: testUser.id, email: testUser.email, roles: ["LEARNER"] });
    otherUser = await createTestUser({ email: "other@test.com", roles: ["LEARNER"] });
    otherUserToken = generateToken({ userId: otherUser.id, email: otherUser.email, roles: ["LEARNER"] });
    testNotification = await prisma.notification.create({
      data: {
        userId: testUser.id,
        title: "Test Notification",
        message: "Test message",
        type: "INFO",
        read: false,
      },
    });
  });

  afterEach(async () => {
    if (testNotification) {
      await prisma.notification.deleteMany({ where: { id: testNotification.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.user.deleteMany({ where: { id: testUser.id } }).catch(() => {});
    }
    if (otherUser) {
      await prisma.user.deleteMany({ where: { id: otherUser.id } }).catch(() => {});
    }
  });

  it("should mark own notification as read", async () => {
    const request = new NextRequest(`http://localhost/api/notifications/${testNotification.id}/read`, {
      method: "PUT",
      headers: {
        cookie: `accessToken=${testUserToken}`,
      },
    });
    const response = await PUT(request, { params: { id: testNotification.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notification.read).toBe(true);
    expect(data.notification.readAt).toBeDefined();

    const updated = await prisma.notification.findUnique({ where: { id: testNotification.id } });
    expect(updated?.read).toBe(true);
    expect(updated?.readAt).toBeDefined();
  });

  it("should return 404 for non-existent notification", async () => {
    const request = new NextRequest("http://localhost/api/notifications/non-existent/read", {
      method: "PUT",
      headers: {
        cookie: `accessToken=${testUserToken}`,
      },
    });

    const response = await PUT(request, { params: { id: "non-existent" } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("NOT_FOUND");
  });

  it("should return 403 for other user's notification", async () => {
    const request = new NextRequest(`http://localhost/api/notifications/${testNotification.id}/read`, {
      method: "PUT",
      headers: {
        cookie: `accessToken=${otherUserToken}`,
      },
    });

    const response = await PUT(request, { params: { id: testNotification.id } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("FORBIDDEN");
  });

  it("should return 401 for unauthenticated request", async () => {
    const request = new NextRequest(`http://localhost/api/notifications/${testNotification.id}/read`, {
      method: "PUT",
    });

    const response = await PUT(request, { params: { id: testNotification.id } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("UNAUTHORIZED");
  });
});
