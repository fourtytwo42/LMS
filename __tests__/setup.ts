import "@testing-library/jest-dom";
import { expect, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load environment variables - best practice: load before any other imports
// Try .env.test first (test-specific), then .env.local, then .env
const envFiles = [
  resolve(__dirname, "../.env.test"),
  resolve(__dirname, "../.env.local"),
  resolve(__dirname, "../.env"),
];

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    config({ path: envFile, override: false }); // Don't override existing env vars
    break;
  }
}

// Set test-specific defaults if not already set
if (!process.env.DATABASE_URL && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-min-32-chars-for-testing-only";
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-key-min-32-chars-for-testing";
}

// Set NODE_ENV to test if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

// Validate required environment variables
beforeAll(() => {
  const requiredVars = ["DATABASE_URL", "JWT_SECRET"];
  const missing = requiredVars.filter((varName) => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for tests: ${missing.join(", ")}\n` +
      `Please ensure .env.local or .env.test exists with these variables.`
    );
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

