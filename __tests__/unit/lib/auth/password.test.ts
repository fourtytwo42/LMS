import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Password", () => {
  const plainPassword = "TestPassword123!";

  it("should hash password", async () => {
    const hashed = await hashPassword(plainPassword);
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plainPassword);
    expect(hashed.length).toBeGreaterThan(50);
  });

  it("should verify correct password", async () => {
    const hashed = await hashPassword(plainPassword);
    const isValid = await verifyPassword(plainPassword, hashed);
    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const hashed = await hashPassword(plainPassword);
    const isValid = await verifyPassword("WrongPassword", hashed);
    expect(isValid).toBe(false);
  });

  it("should produce different hashes for same password", async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);
    expect(hash1).not.toBe(hash2); // Different salts should produce different hashes
  });
});

