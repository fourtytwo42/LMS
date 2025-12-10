import { describe, it, expect } from "vitest";
import { emailSchema, passwordSchema, registerSchema, loginSchema } from "@/lib/utils/validation";

describe("Validation", () => {
  describe("emailSchema", () => {
    it("should accept valid email", () => {
      expect(() => emailSchema.parse("test@example.com")).not.toThrow();
    });

    it("should reject invalid email", () => {
      expect(() => emailSchema.parse("invalid-email")).toThrow();
      expect(() => emailSchema.parse("test@")).toThrow();
    });
  });

  describe("passwordSchema", () => {
    it("should accept valid password", () => {
      expect(() => passwordSchema.parse("ValidPass123")).not.toThrow();
    });

    it("should reject short password", () => {
      expect(() => passwordSchema.parse("Short1")).toThrow();
    });

    it("should reject password without uppercase", () => {
      expect(() => passwordSchema.parse("lowercase123")).toThrow();
    });

    it("should reject password without lowercase", () => {
      expect(() => passwordSchema.parse("UPPERCASE123")).toThrow();
    });

    it("should reject password without number", () => {
      expect(() => passwordSchema.parse("NoNumber")).toThrow();
    });
  });

  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const validData = {
        email: "test@example.com",
        password: "ValidPass123",
        firstName: "John",
        lastName: "Doe",
      };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it("should reject missing fields", () => {
      expect(() => registerSchema.parse({})).toThrow();
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login data", () => {
      const validData = {
        email: "test@example.com",
        password: "anypassword",
      };
      expect(() => loginSchema.parse(validData)).not.toThrow();
    });
  });
});

