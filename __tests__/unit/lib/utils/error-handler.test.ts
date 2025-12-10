import { describe, it, expect, vi } from "vitest";
import { AppError, formatErrorResponse, logError } from "@/lib/utils/error-handler";

describe("Error Handler Utilities", () => {
  describe("AppError", () => {
    it("should create error with code and message", () => {
      const error = new AppError("NOT_FOUND", "Resource not found", 404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
    });

    it("should include details", () => {
      const error = new AppError("VALIDATION_ERROR", "Invalid input", 400, {
        field: "email",
      });
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("formatErrorResponse", () => {
    it("should format AppError correctly", () => {
      const error = new AppError("NOT_FOUND", "Resource not found", 404);
      const response = formatErrorResponse(error);
      expect(response.error).toBe("NOT_FOUND");
      expect(response.message).toBe("Resource not found");
    });

    it("should format generic Error", () => {
      const error = new Error("Something went wrong");
      const response = formatErrorResponse(error);
      expect(response.error).toBe("INTERNAL_ERROR");
    });

    it("should handle unknown error types", () => {
      const response = formatErrorResponse("string error");
      expect(response.error).toBe("INTERNAL_ERROR");
      expect(response.message).toBe("An unexpected error occurred");
    });
  });

  describe("logError", () => {
    it("should log error with context", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Test error");
      logError(error, { userId: "123" });

      expect(consoleSpy).toHaveBeenCalled();
      // console.error is called with "Error:" as first arg and errorInfo as second
      expect(consoleSpy.mock.calls[0][0]).toBe("Error:");
      const errorInfo = consoleSpy.mock.calls[0][1];
      expect(errorInfo).toHaveProperty("message", "Test error");
      expect(errorInfo).toHaveProperty("context", { userId: "123" });
      expect(errorInfo).toHaveProperty("timestamp");

      consoleSpy.mockRestore();
    });
  });
});

