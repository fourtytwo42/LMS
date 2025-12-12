import { test, expect } from "@playwright/test";

test.describe("Protected Routes", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should allow authenticated user to access dashboard", async ({ page }) => {
    // Use login helper for consistency
    const { loginAs } = await import("./helpers/auth");
    await loginAs(page, "admin");
    
    // Should be on admin dashboard
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 10000 });
    
    // Should be able to access dashboard
    await expect(page.locator("text=Dashboard").first()).toBeVisible({ timeout: 10000 });
  });

  test("should preserve redirect after login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Use login helper for consistency
    const { loginAs } = await import("./helpers/auth");
    await loginAs(page, "admin");

    // Should redirect back to originally requested page (admin dashboard)
    await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 10000 });
  });
});

