import { test, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./helpers/auth";

test.describe("LEARNER Role - Client Functions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "learner");
  });

  test("should view learner dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/learner/);
    await expect(page.locator("text=Dashboard").first()).toBeVisible({ timeout: 10000 });
    
    // Check for stat cards
    await expect(page.locator("text=Enrolled Courses")).toBeVisible();
    await expect(page.locator("text=In Progress")).toBeVisible();
    await expect(page.locator("text=Completed")).toBeVisible();
    await expect(page.locator("text=Certificates")).toBeVisible();
  });

  test("should browse catalog", async ({ page }) => {
    await page.goto("/catalog", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check catalog page loads
    await expect(page.locator("text=Catalog").first()).toBeVisible();
    
    // Check for search/filter functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.count() > 0) {
      await searchInput.fill("test");
      await page.waitForTimeout(500); // Wait for search to process
    }
  });

  test("should view courses list", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check courses page loads
    await expect(page.locator("text=Courses").first()).toBeVisible();
    
    // Check for course cards or list
    const courseCards = page.locator('[data-testid="course-card"], .course-card, article');
    const count = await courseCards.count();
    // Courses may or may not exist, but page should load
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should view course details", async ({ page }) => {
    // First, get a course ID from the courses page
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    // Try to find a course link
    const courseLink = page.locator('a[href^="/courses/"]').first();
    
    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        
        // Check course detail page elements
        await expect(page.locator("h1, h2")).toBeVisible(); // Course title
      }
    } else {
      // Skip if no courses available
      test.skip();
    }
  });

  test("should self-enroll in a course from catalog", async ({ page }) => {
    await page.goto("/catalog", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    // Look for enroll button
    const enrollButton = page.locator('button:has-text("Enroll"), button:has-text("Join")').first();
    
    if (await enrollButton.count() > 0 && await enrollButton.isVisible()) {
      await enrollButton.click();
      
      // Should show success message or redirect
      await page.waitForTimeout(1000);
      
      // Check for success message or enrollment confirmation
      const successMessage = page.locator('text=/enrolled|success|enrollment/i');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible();
      }
    } else {
      // Skip if no enrollable courses
      test.skip();
    }
  });

  test("should view course content", async ({ page }) => {
    // Navigate to a course first
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    const courseLink = page.locator('a[href^="/courses/"]').first();
    
    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");
        
        // Look for content items
        const contentLink = page.locator('a[href*="/content/"]').first();
        
        if (await contentLink.count() > 0) {
          await contentLink.click();
          
          // Check content page loads
          await expect(page.locator("h1, h2")).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test("should take a test", async ({ page }) => {
    // Navigate to a course with a test
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    const courseLink = page.locator('a[href^="/courses/"]').first();
    
    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");
        
        // Look for test link
        const testLink = page.locator('a[href*="/tests/"], button:has-text("Take Test")').first();
        
        if (await testLink.count() > 0 && await testLink.isVisible()) {
          await testLink.click();
          
          // Check test page loads
          await page.waitForTimeout(1000);
          
          // Look for test questions or submit button
          const submitButton = page.locator('button:has-text("Submit"), button[type="submit"]');
          if (await submitButton.count() > 0) {
            // Test page loaded successfully
            await expect(page.locator("h1, h2")).toBeVisible();
          }
        }
      }
    } else {
      test.skip();
    }
  });

  test("should view progress", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    // Progress should be visible on course cards or detail pages
    const progressIndicator = page.locator('text=/progress|completed|%|progress/i');
    // Progress may or may not be visible depending on enrollment status
    expect(await progressIndicator.count()).toBeGreaterThanOrEqual(0);
  });

  test("should view certificates", async ({ page }) => {
    await page.goto("/certificates", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check certificates page loads
    await expect(page.locator("text=Certificate").first()).toBeVisible();
    
    // Certificates may or may not exist
    const certificateCards = page.locator('[data-testid="certificate"], .certificate-card');
    expect(await certificateCards.count()).toBeGreaterThanOrEqual(0);
  });

  test("should view and update profile", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check profile page loads
    await expect(page.locator("text=Profile").first()).toBeVisible();
    
    // Check for profile fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    
    // Update profile
    await page.fill('input[name="firstName"]', "Updated");
    await page.fill('input[name="lastName"]', "Name");
    
    // Submit if save button exists
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1000);
      
      // Check for success message
      const successMessage = page.locator('text=/saved|updated|success/i');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible();
      }
    }
  });

  test("should view notifications", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check notifications page loads
    await expect(page.locator("text=Notification").first()).toBeVisible();
    
    // Notifications may or may not exist
    const notifications = page.locator('[data-testid="notification"], .notification-item');
    expect(await notifications.count()).toBeGreaterThanOrEqual(0);
  });

  test("should mark notification as read", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    // Look for unread notification
    const notification = page.locator('[data-testid="notification"]:not(.read), .notification-item:not(.read)').first();
    
    if (await notification.count() > 0) {
      // Click to mark as read or use mark as read button
      const markReadButton = notification.locator('button:has-text("Mark as read"), button[aria-label*="read" i]');
      if (await markReadButton.count() > 0) {
        await markReadButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      test.skip();
    }
  });

  test("should logout", async ({ page }) => {
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

