import { describe, it, expect } from "vitest";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

describe("Errors Utilities", () => {
  describe("AppError", () => {
    it("should create error with statusCode, errorCode, and message", () => {
      const error = new AppError(404, "NOT_FOUND", "Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
      expect(error.name).toBe("AppError");
    });

    it("should include optional details", () => {
      const error = new AppError(400, "VALIDATION_ERROR", "Invalid input", {
        field: "email",
      });
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("handleApiError", () => {
    it("should handle AppError correctly", async () => {
      const error = new AppError(404, "NOT_FOUND", "Resource not found");
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      const json = await response.json();
      expect(json.error).toBe("NOT_FOUND");
      expect(json.message).toBe("Resource not found");
      expect(response.status).toBe(404);
    });

    it("should include details in response", async () => {
      const error = new AppError(400, "VALIDATION_ERROR", "Invalid input", {
        field: "email",
      });
      const response = handleApiError(error);
      
      const json = await response.json();
      expect(json.details).toEqual({ field: "email" });
    });

    it("should handle Error with UNAUTHORIZED message", async () => {
      const error = new Error("UNAUTHORIZED");
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      const json = await response.json();
      expect(json.error).toBe("UNAUTHORIZED");
      expect(json.message).toBe("Authentication required");
      expect(response.status).toBe(401);
    });

    it("should handle Error with FORBIDDEN message", async () => {
      const error = new Error("FORBIDDEN");
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      const json = await response.json();
      expect(json.error).toBe("FORBIDDEN");
      expect(json.message).toBe("Insufficient permissions");
      expect(response.status).toBe(403);
    });

    it("should handle generic Error", async () => {
      const error = new Error("Something went wrong");
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      const json = await response.json();
      expect(json.error).toBe("INTERNAL_ERROR");
      expect(json.message).toBe("An unexpected error occurred");
      expect(response.status).toBe(500);
    });

    it("should handle unknown error types", async () => {
      const error = "string error";
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      const json = await response.json();
      expect(json.error).toBe("INTERNAL_ERROR");
      expect(json.message).toBe("An unexpected error occurred");
      expect(response.status).toBe(500);
    });
  });
});

