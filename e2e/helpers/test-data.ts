import { Page } from "@playwright/test";

export async function createTestCourse(page: Page, courseData: {
  title: string;
  description?: string;
  type?: string;
  status?: string;
}) {
  await page.goto("/courses/new");
  
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
  
  await page.click('button[type="submit"]');
  
  // Wait for redirect to course detail page
  await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 10000 });
  
  // Extract course ID from URL
  const url = page.url();
  const courseId = url.match(/\/courses\/([^/]+)$/)?.[1];
  
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

