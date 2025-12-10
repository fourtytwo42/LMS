import { describe, it, expect } from "vitest";
import {
  sanitizeHtml,
  escapeHtml,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
} from "@/lib/security/sanitize";

describe("Security Utilities", () => {
  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain("<script");
      expect(result).toContain("<p>Hello</p>");
    });

    it("should remove event handlers", () => {
      const html = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain("onclick");
    });

    it("should remove javascript: protocol", () => {
      const html = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain("javascript:");
    });
  });

  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      const text = '<script>alert("xss")</script>';
      const result = escapeHtml(text);
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
    });

    it("should escape quotes", () => {
      const text = 'He said "Hello"';
      const result = escapeHtml(text);
      expect(result).toContain("&quot;");
    });
  });

  describe("sanitizeInput", () => {
    it("should trim whitespace", () => {
      const input = "  test  ";
      const result = sanitizeInput(input);
      expect(result).toBe("test");
    });

    it("should limit length", () => {
      const input = "a".repeat(2000);
      const result = sanitizeInput(input, 100);
      expect(result.length).toBe(100);
    });

    it("should remove null bytes", () => {
      const input = "test\0string";
      const result = sanitizeInput(input);
      expect(result).not.toContain("\0");
    });

    it("should handle empty input", () => {
      expect(sanitizeInput("")).toBe("");
      expect(sanitizeInput(null as any)).toBe("");
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@example.co.uk")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should validate correct URL formats", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("should reject invalid URL formats", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("javascript:alert('xss')")).toBe(false);
      expect(isValidUrl("ftp://example.com")).toBe(false);
    });
  });
});

