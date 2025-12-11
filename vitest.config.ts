import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    // Run integration tests sequentially to avoid database conflicts
    fileParallelism: false,
    sequence: {
      shuffle: false,
    },
    // Timeouts following best practices:
    // - Individual tests should complete quickly
    // - Hooks need time for database operations
    // - Teardown should be fast
    testTimeout: 10000, // 10 seconds per test (reasonable for integration tests)
    hookTimeout: 15000, // 15 seconds for hooks (beforeEach/afterEach may do DB ops)
    teardownTimeout: 10000, // 10 seconds for teardown (cleanup operations)
    // Prevent hanging on unhandled promises
    bail: 0, // Don't bail on first failure, but timeouts will prevent hanging
    // Retry configuration for flaky tests (disabled by default, can enable if needed)
    retry: 0,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "__tests__/",
        "e2e/",
        "**/*.config.*",
        "**/types/**",
        "**/*.d.ts",
        "**/coverage/**",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
      // Report uncovered lines and functions
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: [
      { find: "@/app", replacement: path.resolve(__dirname, "./app") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@/__tests__", replacement: path.resolve(__dirname, "./__tests__") },
    ],
  },
});

