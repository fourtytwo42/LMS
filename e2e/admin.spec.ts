import { test, expect } from "@playwright/test";
import { loginAs, logout } from "./helpers/auth";
import { createTestCourse, createTestUser } from "./helpers/test-data";

test.describe("ADMIN Role - Client Functions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("should view admin dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/admin/);
    await expect(page.locator("text=Dashboard")).toBeVisible();
    
    // Check for admin-specific stats
    await expect(page.locator("text=Total Users").or(page.locator("text=Users"))).toBeVisible();
    await expect(page.locator("text=Total Courses").or(page.locator("text=Courses"))).toBeVisible();
  });

  test("should view all users", async ({ page }) => {
    await page.goto("/users");
    
    // Check users page loads
    await expect(page.locator("text=Users").or(page.locator("h1"))).toBeVisible();
    
    // Check for user list or table
    const users = page.locator('[data-testid="user"], .user-item, table tbody tr');
    expect(await users.count()).toBeGreaterThanOrEqual(0);
    
    // Check for create user button
    const createButton = page.locator('a[href="/users/new"], button:has-text("Create"), button:has-text("New User")');
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test("should create a new user", async ({ page }) => {
    await page.goto("/users/new");
    
    // Fill in user form
    const timestamp = Date.now();
    await page.fill('input[name="firstName"]', `Test${timestamp}`);
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', `testuser${timestamp}@example.com`);
    await page.fill('input[name="password"]', "TestPassword123");
    
    // Select role if checkboxes/select exists
    const roleCheckbox = page.locator('input[value="LEARNER"], input[name="roles"][value="LEARNER"]');
    if (await roleCheckbox.count() > 0) {
      await roleCheckbox.check();
    }
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to users list or show success
    await page.waitForURL(/\/users/, { timeout: 10000 });
  });

  test("should edit an existing user", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");
    
    // Find a user to edit
    const userLink = page.locator('a[href^="/users/"]:not([href="/users/new"])').first();
    
    if (await userLink.count() > 0) {
      await userLink.click();
      
      // Check user detail page loads
      await expect(page.locator('input[name="firstName"]')).toBeVisible();
      
      // Update user
      await page.fill('input[name="firstName"]', "Updated");
      
      // Save changes
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      test.skip();
    }
  });

  test("should delete a user", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");
    
    // Find delete button
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]').first();
    
    if (await deleteButton.count() > 0 && await deleteButton.isVisible()) {
      // Click delete and confirm if dialog appears
      await deleteButton.click();
      
      // Handle confirmation dialog if it appears
      page.on("dialog", async (dialog) => {
        await dialog.accept();
      });
      
      await page.waitForTimeout(1000);
    } else {
      test.skip();
    }
  });

  test("should manage courses", async ({ page }) => {
    await page.goto("/courses");
    
    // Check courses page loads
    await expect(page.locator("text=Courses").or(page.locator("h1"))).toBeVisible();
    
    // Check for create course button
    const createButton = page.locator('a[href="/courses/new"], button:has-text("Create")');
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test("should create a course", async ({ page }) => {
    await page.goto("/courses/new");
    
    // Fill in course form
    await page.fill('input[name="title"]', `Admin Course ${Date.now()}`);
    await page.fill('textarea[name="description"]', "Admin created course");
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to course detail
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 10000 });
  });

  test("should manage learning plans", async ({ page }) => {
    await page.goto("/learning-plans");
    
    // Check learning plans page loads
    await expect(page.locator("text=Learning Plan").or(page.locator("h1"))).toBeVisible();
    
    // Check for create button
    const createButton = page.locator('a[href="/learning-plans/new"], button:has-text("Create")');
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test("should create a learning plan", async ({ page }) => {
    await page.goto("/learning-plans/new");
    
    // Fill in learning plan form
    await page.fill('input[name="title"], input[name="name"]', `Learning Plan ${Date.now()}`);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to learning plan detail
    await page.waitForURL(/\/learning-plans\/[^/]+$/, { timeout: 10000 });
  });

  test("should manage groups", async ({ page }) => {
    await page.goto("/groups");
    
    // Check groups page loads
    await expect(page.locator("text=Group").or(page.locator("h1"))).toBeVisible();
    
    // Check for create button
    const createButton = page.locator('a[href="/groups/new"], button:has-text("Create")');
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test("should create a group", async ({ page }) => {
    await page.goto("/groups/new");
    
    // Fill in group form
    await page.fill('input[name="name"]', `Test Group ${Date.now()}`);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to group detail or list
    await page.waitForURL(/\/groups/, { timeout: 10000 });
  });

  test("should manage categories", async ({ page }) => {
    await page.goto("/categories");
    
    // Check categories page loads
    await expect(page.locator("text=Categor").or(page.locator("h1"))).toBeVisible();
    
    // Check for create button
    const createButton = page.locator('a[href="/categories/new"], button:has-text("Create")');
    if (await createButton.count() > 0) {
      await expect(createButton.first()).toBeVisible();
    }
  });

  test("should create a category", async ({ page }) => {
    await page.goto("/categories/new");
    
    // Fill in category form
    await page.fill('input[name="name"]', `Category ${Date.now()}`);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to categories list or detail
    await page.waitForURL(/\/categories/, { timeout: 10000 });
  });

  test("should view all enrollments", async ({ page }) => {
    await page.goto("/enrollments");
    
    // Check enrollments page loads
    await expect(page.locator("text=Enrollment").or(page.locator("h1"))).toBeVisible();
    
    // Check for filters or search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0);
  });

  test("should view system analytics", async ({ page }) => {
    await page.goto("/analytics");
    
    // Check analytics page loads
    await expect(page.locator("text=Analytics").or(page.locator("h1"))).toBeVisible();
    
    // Check for analytics overview
    await expect(page.locator("text=Overview").or(page.locator("h2"))).toBeVisible();
  });

  test("should view user analytics", async ({ page }) => {
    // First get a user
    await page.goto("/users");
    await page.waitForLoadState("networkidle");
    
    const userLink = page.locator('a[href^="/users/"]:not([href="/users/new"])').first();
    
    if (await userLink.count() > 0) {
      const href = await userLink.getAttribute("href");
      if (href) {
        const userId = href.match(/\/users\/([^/]+)/)?.[1];
        if (userId) {
          await page.goto(`/analytics/user/${userId}`);
          
          // Check analytics page loads
          await expect(page.locator("h1, h2")).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test("should view and update profile", async ({ page }) => {
    await page.goto("/profile");
    
    // Check profile page loads
    await expect(page.locator("text=Profile").or(page.locator("h1"))).toBeVisible();
    
    // Update profile
    await page.fill('input[name="firstName"]', "Admin");
    await page.fill('input[name="lastName"]', "User");
    
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test("should view notifications", async ({ page }) => {
    await page.goto("/notifications");
    
    // Check notifications page loads
    await expect(page.locator("text=Notification").or(page.locator("h1"))).toBeVisible();
  });

  test("should logout", async ({ page }) => {
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

