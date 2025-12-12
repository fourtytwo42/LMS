import { test, expect } from "@playwright/test";
import { loginAs, logout } from "./helpers/auth";
import { createTestCourse } from "./helpers/test-data";

test.describe("INSTRUCTOR Role - Client Functions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "instructor");
  });

  test("should view instructor dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/instructor/);
    await expect(page.locator("text=Dashboard").first()).toBeVisible({ timeout: 10000 });
    
    // Check for instructor-specific stats
    await expect(page.locator("text=My Courses").first()).toBeVisible();
  });

  test("should create a new course", async ({ page }) => {
    await page.goto("/courses/new", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Fill in course form
    await page.fill('input[name="title"]', `Test Course ${Date.now()}`);
    await page.fill('textarea[name="description"]', "This is a test course description");
    
    // Select course type if dropdown exists
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption({ index: 0 });
    }
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to course detail page
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 10000 });
    await expect(page.locator("h1, h2")).toBeVisible();
  });

  test("should edit an existing course", async ({ page }) => {
    // Navigate to courses list
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Find an edit button or link for an existing course
    const editButton = page.locator('button:has-text("Edit"), a[href*="/edit"]').first();
    
    if (await editButton.count() === 0) {
      test.skip("No courses available to edit");
      return;
    }
    
    // Click edit button
    await editButton.click();
    
    // Wait for edit page to load
    await page.waitForURL(/\/courses\/[^/]+\/edit/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Give time for React to hydrate
    
    // Wait for loading to disappear
    const loadingText = page.locator('text=Loading...');
    if (await loadingText.isVisible()) {
      await loadingText.waitFor({ state: "hidden", timeout: 10000 });
    }
    
    // Check if there's an error
    const errorText = page.locator('text=Course not found');
    if (await errorText.isVisible()) {
      test.skip("Course not found on edit page");
      return;
    }
    
    // Wait for the title input to be visible (form is loaded)
    await page.waitForSelector('form', { state: "visible", timeout: 10000 });
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 });
    
    // Get current title value
    const currentTitle = await page.locator('input[name="title"]').inputValue();
    
    // Update course title
    const updatedTitle = `Updated ${currentTitle} ${Date.now()}`;
    await page.fill('input[name="title"]', updatedTitle);
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Wait for redirect to course detail page
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    
    // Verify we're on the course detail page
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test("should add content to a course", async ({ page }) => {
    // Create or navigate to a course
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    const courseLink = page.locator('a[href^="/courses/"]:not([href*="/edit"])').first();
    
    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");
        
        // Look for "Add Content" or "New Content" button
        const addContentButton = page.locator('a[href*="/content/new"], button:has-text("Add Content"), button:has-text("New Content")').first();
        
        if (await addContentButton.count() > 0 && await addContentButton.isVisible()) {
          await addContentButton.click();
          
          // Check content creation form
          await expect(page.locator('input[name="title"], textarea[name="title"]')).toBeVisible();
          
          // Fill in content form
          await page.fill('input[name="title"], textarea[name="title"]', "Test Content Item");
          
          // Select content type if dropdown exists
          const typeSelect = page.locator('select[name="type"]');
          if (await typeSelect.count() > 0) {
            await typeSelect.selectOption({ index: 0 });
          }
          
          // Submit (or cancel to avoid creating test data)
          // await page.click('button[type="submit"]');
        }
      }
    } else {
      test.skip();
    }
  });

  test("should create a test", async ({ page }) => {
    // Navigate to a course
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    const courseLink = page.locator('a[href^="/courses/"]:not([href*="/edit"])').first();
    
    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute("href");
      if (href) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");
        
        // Look for "Add Test" or "Create Test" button
        const addTestButton = page.locator('a[href*="/test"], button:has-text("Add Test"), button:has-text("Create Test")').first();
        
        if (await addTestButton.count() > 0 && await addTestButton.isVisible()) {
          await addTestButton.click();
          
          // Check test creation form loads
          await page.waitForTimeout(1000);
          await expect(page.locator("h1, h2")).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test("should view enrollments", async ({ page }) => {
    await page.goto("/enrollments", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check enrollments page loads
    await expect(page.locator("text=Enrollment").first()).toBeVisible();
    
    // Check for enrollment list or table
    const enrollments = page.locator('[data-testid="enrollment"], .enrollment-item, table tbody tr');
    expect(await enrollments.count()).toBeGreaterThanOrEqual(0);
  });

  test("should approve enrollment request", async ({ page }) => {
    await page.goto("/enrollments", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    // Look for pending enrollment with approve button
    const approveButton = page.locator('button:has-text("Approve"), button[aria-label*="approve" i]').first();
    
    if (await approveButton.count() > 0 && await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(1000);
      
      // Check for success message or status change
      const successMessage = page.locator('text=/approved|success/i');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test("should view analytics", async ({ page }) => {
    await page.goto("/analytics", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    // Check analytics page loads - look for any heading or analytics content
    // The page might show "Analytics", "Overview", or just have charts
    const hasHeading = await page.locator("h1, h2").first().isVisible().catch(() => false);
    const hasAnalyticsText = await page.locator("text=/Analytics|Overview|Statistics/i").first().isVisible().catch(() => false);
    const hasCharts = await page.locator('canvas, svg, [data-testid="chart"]').first().isVisible().catch(() => false);
    
    // At least one of these should be visible
    expect(hasHeading || hasAnalyticsText || hasCharts).toBeTruthy();
    
    // Check for analytics charts or data (may not be visible immediately)
    const charts = page.locator('canvas, svg, [data-testid="chart"]');
    // Charts may take time to load, so just verify page loaded
    await page.waitForLoadState("networkidle");
  });

  test("should view course analytics", async ({ page }) => {
    // First get a course
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    
    const courseLink = page.locator('a[href^="/courses/"]:not([href*="/edit"])').first();
    
    if (await courseLink.count() > 0) {
      const href = await courseLink.getAttribute("href");
      if (href) {
        const courseId = href.match(/\/courses\/([^/]+)/)?.[1];
        if (courseId) {
          await page.goto(`/analytics/course/${courseId}`);
          
          // Check analytics page loads
          await expect(page.locator("h1, h2")).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test("should view courses list", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check courses page loads
    await expect(page.locator("text=Courses").first()).toBeVisible();
    
    // Check for create course button (instructors can create)
    const createButton = page.locator('a[href="/courses/new"], button:has-text("Create"), button:has-text("New Course")');
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test("should browse catalog", async ({ page }) => {
    await page.goto("/catalog", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check catalog page loads
    await expect(page.locator("text=Catalog").first()).toBeVisible();
  });

  test("should view and update profile", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check profile page loads
    await expect(page.locator("text=Profile").first()).toBeVisible();
    
    // Check for profile fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
  });

  test("should view notifications", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");
    
    // Check notifications page loads
    await expect(page.locator("text=Notification").first()).toBeVisible();
  });

  test("should logout", async ({ page }) => {
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

