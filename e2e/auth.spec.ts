import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should register new user", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "TestPassword123");

    await page.click('button[type="submit"]');

    // Should redirect to login or show success message
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "wrong@example.com");
    await page.fill('input[name="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });

  test("should logout user", async ({ page }) => {
    // First login
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@lms.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Then logout
    await page.click('button:has-text("Log out"), button[aria-label*="logout"]');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

