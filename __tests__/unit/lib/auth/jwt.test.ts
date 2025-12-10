import { describe, it, expect, beforeEach } from "vitest";
import { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import jwt from "jsonwebtoken";

describe("JWT", () => {
  const payload = {
    userId: "test-user-id",
    email: "test@example.com",
    roles: ["LEARNER"],
  };

  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret-key-min-32-characters-long";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key-min-32-characters-long";
  });

  it("should generate and verify access token", () => {
    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.roles).toEqual(payload.roles);
  });

  it("should generate and verify refresh token", () => {
    const token = generateRefreshToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it("should throw error for invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });

  it("should throw error for expired token", () => {
    // Create a token with a past expiration
    const expiredPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    };
    
    // Manually create an expired token by signing with past exp
    const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET!, {
      expiresIn: "-1h", // Expired 1 hour ago
    });
    
    expect(() => verifyToken(expiredToken)).toThrow();
  });
});

