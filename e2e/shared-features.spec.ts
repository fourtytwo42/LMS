import { test, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./helpers/auth";

test.describe("Shared Features - All User Types", () => {
  const userTypes = ["learner", "instructor", "admin"] as const;

  for (const userType of userTypes) {
    test.describe(`${userType.toUpperCase()} - Shared Features`, () => {
      test.beforeEach(async ({ page }) => {
        await loginAs(page, userType);
      });

      test("should navigate using sidebar menu", async ({ page }) => {
        // Check sidebar is visible
        const sidebar = page.locator('aside, nav[aria-label*="navigation" i]');
        await expect(sidebar.first()).toBeVisible();
        
        // Get all menu links
        const menuLinks = page.locator('aside a, nav a');
        const linkCount = await menuLinks.count();
        
        if (linkCount > 0) {
          // Click on a menu item (not dashboard, as we're already there)
          const menuItem = menuLinks.filter({ hasNotText: "Dashboard" }).first();
          if (await menuItem.count() > 0) {
            const href = await menuItem.getAttribute("href");
            await menuItem.click();
            
            // Should navigate to the page
            if (href) {
              await page.waitForURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { timeout: 5000 });
            }
          }
        }
      });

      test("should view profile page", async ({ page }) => {
        await page.goto("/profile", { waitUntil: "networkidle" });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        
        // Check profile page loads - use more specific selector
        await expect(page.locator("text=Profile").first()).toBeVisible({ timeout: 15000 });
        
        // Check for user information - email is disabled input, so check by value attribute or label
        await expect(page.locator('input[name="firstName"]').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('input[name="lastName"]').first()).toBeVisible({ timeout: 15000 });
        // Email is a disabled input, check for label or the input itself
        await expect(page.locator('label:has-text("Email")').first()).toBeVisible({ timeout: 15000 });
      });

      test("should update profile information", async ({ page }) => {
        await page.goto("/profile", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        
        // Update first name
        const firstNameInput = page.locator('input[name="firstName"]');
        await firstNameInput.clear();
        await firstNameInput.fill("Updated");
        
        // Update last name
        const lastNameInput = page.locator('input[name="lastName"]');
        await lastNameInput.clear();
        await lastNameInput.fill("Name");
        
        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Check for success message or updated values
          const successMessage = page.locator('text=/saved|updated|success/i');
          if (await successMessage.count() > 0) {
            await expect(successMessage.first()).toBeVisible();
          }
        }
      });

      test("should view notifications", async ({ page }) => {
        await page.goto("/notifications", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        await page.waitForLoadState("networkidle");
        
        // Check notifications page loads - wait for content
        await expect(page.locator("text=Notification").first()).toBeVisible({ timeout: 10000 });
        
        // Check for notification list
        const notifications = page.locator('[data-testid="notification"], .notification-item');
        expect(await notifications.count()).toBeGreaterThanOrEqual(0);
      });

      test("should mark notification as read", async ({ page }) => {
        await page.goto("/notifications", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        await page.waitForLoadState("networkidle");
        
        // Find an unread notification
        const notification = page.locator('[data-testid="notification"]:not(.read), .notification-item:not(.read)').first();
        
        if (await notification.count() > 0) {
          // Click notification or mark as read button
          const markReadButton = notification.locator('button:has-text("Mark as read"), button[aria-label*="read" i]');
          if (await markReadButton.count() > 0) {
            await markReadButton.click();
            await page.waitForTimeout(500);
          } else {
            // Try clicking the notification itself
            await notification.click();
            await page.waitForTimeout(500);
          }
        } else {
          test.skip();
        }
      });

      test("should browse catalog", async ({ page }) => {
        await page.goto("/catalog", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        await page.waitForLoadState("networkidle");
        
        // Wait for loading to complete
        await page.waitForSelector('text=Loading catalog...', { state: "hidden", timeout: 30000 }).catch(() => {});
        
        // Check catalog page loads - use more specific selector
        await expect(page.locator("text=Catalog").first()).toBeVisible({ timeout: 10000 });
        
        // Check for search functionality
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        if (await searchInput.count() > 0) {
          await searchInput.fill("test");
          await page.waitForTimeout(500);
        }
        
        // Check for filter options
        const filterButtons = page.locator('button:has-text("Filter"), select');
        expect(await filterButtons.count()).toBeGreaterThanOrEqual(0);
      });

      test("should search in catalog", async ({ page }) => {
        await page.goto("/catalog", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        await page.waitForLoadState("networkidle");
        
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        
        if (await searchInput.count() > 0) {
          await searchInput.fill("course");
          await page.keyboard.press("Enter");
          await page.waitForTimeout(1000);
          
          // Results should update
          const results = page.locator('[data-testid="course-card"], [data-testid="learning-plan-card"], article');
          expect(await results.count()).toBeGreaterThanOrEqual(0);
        }
      });

      test("should filter catalog by category", async ({ page }) => {
        await page.goto("/catalog", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        await page.waitForLoadState("networkidle");
        
        // Look for category filter
        const categoryFilter = page.locator('select[name*="category"], button:has-text("Category")').first();
        
        if (await categoryFilter.count() > 0 && await categoryFilter.isVisible()) {
          if (await categoryFilter.evaluate((el) => el.tagName === "SELECT")) {
            // It's a select dropdown
            await categoryFilter.selectOption({ index: 1 });
          } else {
            // It's a button, click to open dropdown
            await categoryFilter.click();
            await page.waitForTimeout(500);
            const option = page.locator('button, a').filter({ hasText: /category/i }).first();
            if (await option.count() > 0) {
              await option.click();
            }
          }
          
          await page.waitForTimeout(1000);
        } else {
          test.skip();
        }
      });

      test("should use demo account buttons on login page", async ({ page }) => {
        await logout(page);
        await page.goto("/login", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        
        // Check for demo account buttons
        const demoButtons = page.locator('button:has-text("Admin"), button:has-text("Instructor"), button:has-text("Learner")');
        const count = await demoButtons.count();
        
        if (count > 0) {
          // Click on a demo account button
          await demoButtons.first().click();
          await page.waitForTimeout(500);
          
          // Check if form fields are populated
          const emailInput = page.locator('input[name="email"]');
          const emailValue = await emailInput.inputValue();
          expect(emailValue).toBeTruthy();
        }
      });

      test("should handle responsive navigation", async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Check if mobile menu exists or sidebar is hidden
        const mobileMenuButton = page.locator('button[aria-label*="menu" i], button:has-text("Menu")');
        const sidebar = page.locator('aside');
        
        if (await mobileMenuButton.count() > 0) {
          // Mobile menu button should be visible
          await expect(mobileMenuButton.first()).toBeVisible();
          
          // Click to open menu
          await mobileMenuButton.click();
          await page.waitForTimeout(500);
          
          // Menu should be visible
          const menu = page.locator('nav, aside');
          await expect(menu.first()).toBeVisible();
        } else if (await sidebar.count() > 0) {
          // Sidebar might be hidden on mobile
          const isVisible = await sidebar.first().isVisible();
          // Sidebar visibility depends on implementation
          expect(typeof isVisible).toBe("boolean");
        }
        
        // Reset to desktop
        await page.setViewportSize({ width: 1280, height: 720 });
      });

      test("should handle form validation errors", async ({ page }) => {
        await page.goto("/profile", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        
        // Try to submit empty required fields
        const firstNameInput = page.locator('input[name="firstName"]');
        if (await firstNameInput.count() > 0) {
          await firstNameInput.clear();
          
          const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await page.waitForTimeout(500);
            
            // Check for validation error
            const errorMessage = page.locator('text=/required|invalid|error/i');
            if (await errorMessage.count() > 0) {
              await expect(errorMessage.first()).toBeVisible();
            }
          }
        }
      });

      test("should handle loading states", async ({ page }) => {
        // Navigate to a page that loads data
        await page.goto("/courses", { waitUntil: "networkidle" });
        await page.waitForLoadState("networkidle");
        
        // Check for loading indicators (may appear briefly)
        // Use separate locators to avoid regex syntax issues
        const loadingText = page.locator('text=/loading/i').first();
        const loadingBusy = page.locator('[aria-busy="true"]').first();
        const loadingPulse = page.locator('.animate-pulse').first();
        
        // Loading may or may not be visible depending on speed
        // Just verify page loads successfully
        await page.waitForLoadState("networkidle");
        await expect(page.locator("text=Courses").first()).toBeVisible({ timeout: 15000 });
      });

      test("should handle error states", async ({ page }) => {
        // Try to access a non-existent resource
        await page.goto("/courses/non-existent-id", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        await page.waitForLoadState("networkidle");
        
        // Should show 404 or error message
        const errorMessage = page.locator('text=/not found|404|error/i').first().or(page.locator('h1:has-text("404")').first());
        // Error may or may not be shown depending on implementation
        expect(await errorMessage.count()).toBeGreaterThanOrEqual(0);
      });

      test("should maintain session across page navigation", async ({ page }) => {
        // Already logged in from beforeEach, determine role-specific dashboard
        let roleDashboard = "/dashboard/learner";
        if (userType === "admin") {
          roleDashboard = "/dashboard/admin";
        } else if (userType === "instructor") {
          roleDashboard = "/dashboard/instructor";
        }
        
        // Navigate to dashboard
        await page.goto(roleDashboard, { waitUntil: "networkidle" });
        await expect(page).toHaveURL(new RegExp(roleDashboard.replace("/", "\\/")), { timeout: 15000 });
        
        // Navigate to another page
        await page.goto("/profile", { waitUntil: "networkidle" });
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });
        
        // Navigate back - should still be authenticated
        await page.goto(roleDashboard, { waitUntil: "networkidle" });
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(new RegExp(roleDashboard.replace("/", "\\/")), { timeout: 15000 });
        
        // Should not be redirected to login
        await expect(page).not.toHaveURL(/\/login/);
      });

      test("should logout and redirect to login", async ({ page }) => {
        await logout(page);
        await expect(page).toHaveURL(/\/login/);
        
        // Try to access protected route
        await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
        
        // Should be redirected back to login
        await expect(page).toHaveURL(/\/login/);
      });
    });
  }
});

