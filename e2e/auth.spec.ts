import { test, expect } from "@playwright/test";
import { loginAs, logout } from "./helpers/auth";

test.describe("Authentication", () => {
  test("should register new user", async ({ page }) => {
    await page.goto("/register", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000); // Wait for React to hydrate

    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.waitFor({ state: "visible", timeout: 30000 });
    
    await firstNameInput.fill("Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "TestPassword123");

    // Wait for API response or navigation
    await Promise.all([
      page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {}),
      page.waitForResponse((resp) => resp.url().includes("/api/auth/register"), { timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    // Should redirect to login or show success message
    // Check for either redirect or success message
    const isLogin = page.url().includes("/login");
    const hasSuccess = await page.locator('text=/success|registered/i').isVisible().catch(() => false);
    
    if (!isLogin && !hasSuccess) {
      // Wait a bit more for redirect
      await page.waitForTimeout(2000);
    }
    
    // Accept either login redirect or success message
    expect(isLogin || hasSuccess || page.url().includes("/login")).toBeTruthy();
  });

  test("should login with valid credentials", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000); // Wait for React to hydrate

    const emailInput = page.locator('input[name="email"]');
    await emailInput.waitFor({ state: "visible", timeout: 30000 });
    await emailInput.fill("wrong@example.com");
    await page.fill('input[name="password"]', "wrongpassword");

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=/invalid|error|failed/i")).toBeVisible({ timeout: 10000 });
  });

  test("should logout user", async ({ page }) => {
    // First login
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Then logout
    await logout(page);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

