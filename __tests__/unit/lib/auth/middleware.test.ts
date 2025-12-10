import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate, requireRole } from "@/lib/auth/middleware";
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

// Mock dependencies
vi.mock("@/lib/auth/jwt");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Authentication Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticate", () => {
    it("should throw error when no token is provided", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      
      await expect(authenticate(request)).rejects.toThrow(AppError);
      await expect(authenticate(request)).rejects.toThrow("Authentication required");
    });

    it("should authenticate user with valid token", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        roles: [
          {
            role: {
              name: "ADMIN",
            },
          },
        ],
      };

      vi.mocked(verifyToken).mockReturnValue({ userId: "user-123" });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          cookie: "accessToken=valid-token",
        },
      });

      const user = await authenticate(request);
      expect(user.id).toBe("user-123");
      expect(user.email).toBe("test@example.com");
      expect(user.roles).toEqual(["ADMIN"]);
    });

    it("should throw error when user not found", async () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: "user-123" });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          cookie: "accessToken=valid-token",
        },
      });

      await expect(authenticate(request)).rejects.toThrow(AppError);
      await expect(authenticate(request)).rejects.toThrow("User not found");
    });

    it("should throw error when token is invalid", async () => {
      vi.mocked(verifyToken).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          cookie: "accessToken=invalid-token",
        },
      });

      await expect(authenticate(request)).rejects.toThrow(AppError);
      await expect(authenticate(request)).rejects.toThrow("Invalid or expired token");
    });

    it("should handle AppError from verifyToken", async () => {
      const appError = new AppError(401, "UNAUTHORIZED", "Token expired");
      vi.mocked(verifyToken).mockImplementation(() => {
        throw appError;
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          cookie: "accessToken=expired-token",
        },
      });

      await expect(authenticate(request)).rejects.toThrow(appError);
    });
  });

  describe("requireRole", () => {
    it("should not throw when user has required role", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        roles: ["ADMIN", "INSTRUCTOR"],
      };

      expect(() => requireRole(user, ["ADMIN"])).not.toThrow();
      expect(() => requireRole(user, ["INSTRUCTOR"])).not.toThrow();
    });

    it("should throw error when user lacks required role", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        roles: ["LEARNER"],
      };

      expect(() => requireRole(user, ["ADMIN"])).toThrow(AppError);
      expect(() => requireRole(user, ["ADMIN"])).toThrow("Insufficient permissions");
    });

    it("should check multiple roles", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        roles: ["INSTRUCTOR"],
      };

      expect(() => requireRole(user, ["ADMIN", "INSTRUCTOR"])).not.toThrow();
    });
  });
});

