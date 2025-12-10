import { test, expect } from "@playwright/test";

test.describe("Protected Routes", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should allow authenticated user to access dashboard", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Should be able to access dashboard
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("should preserve redirect after login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    // Login
    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Should redirect back to originally requested page
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });
});

