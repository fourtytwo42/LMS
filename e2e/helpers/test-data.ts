import { Page } from "@playwright/test";

export async function createTestCourse(page: Page, courseData: {
  title: string;
  description?: string;
  type?: string;
  status?: string;
}) {
  await page.goto("/courses/new", { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");
  
  // Wait for form to be ready
  await page.waitForSelector('input[name="title"]', { state: "visible", timeout: 10000 });
  
  await page.fill('input[name="title"]', courseData.title);
  if (courseData.description) {
    await page.fill('textarea[name="description"]', courseData.description);
  }
  if (courseData.type) {
    await page.selectOption('select[name="type"]', courseData.type);
  }
  if (courseData.status) {
    await page.selectOption('select[name="status"]', courseData.status);
  }
  
  // Submit form and wait for redirect
  await page.click('button[type="submit"]');
  
  // Wait for redirect to course detail page
  await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  
  // Extract course ID from URL
  const url = page.url();
  const match = url.match(/\/courses\/([^/]+)$/);
  const courseId = match?.[1];
  
  if (!courseId) {
    throw new Error(`Failed to extract course ID from URL: ${url}`);
  }
  
  // Wait a moment for the course to be fully created in the database
  await page.waitForTimeout(1000);
  
  return courseId;
}

export async function createTestUser(page: Page, userData: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roles?: string[];
}) {
  await page.goto("/users/new");
  
  await page.fill('input[name="firstName"]', userData.firstName);
  await page.fill('input[name="lastName"]', userData.lastName);
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="password"]', userData.password);
  
  if (userData.roles && userData.roles.length > 0) {
    // Select roles (assuming multi-select or checkboxes)
    for (const role of userData.roles) {
      await page.check(`input[value="${role}"], input[name="roles"][value="${role}"]`);
    }
  }
  
  await page.click('button[type="submit"]');
  
  // Wait for redirect or success message
  await page.waitForURL(/\/users/, { timeout: 10000 });
}

export async function waitForApiResponse(page: Page, urlPattern: RegExp | string, timeout = 5000) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === "string") {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

