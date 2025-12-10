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
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: [
      { find: "@/app", replacement: path.resolve(__dirname, "./app") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});

