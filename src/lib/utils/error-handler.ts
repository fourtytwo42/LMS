/**
 * Centralized error handling utilities
 */

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  message: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof AppError) {
    return {
      error: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      error: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : error.message,
    };
  }

  return {
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  };
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  };

  // In production, send to error tracking service (e.g., Sentry)
  console.error("Error:", errorInfo);
}

