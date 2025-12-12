import { Page } from "@playwright/test";

export const TEST_USERS = {
  admin: {
    email: "admin@lms.com",
    password: "admin123",
    role: "ADMIN",
  },
  instructor: {
    email: "instructor@lms.com",
    password: "instructor123",
    role: "INSTRUCTOR",
  },
  learner: {
    email: "learner@lms.com",
    password: "learner123",
    role: "LEARNER",
  },
};

export async function loginAs(page: Page, userType: "admin" | "instructor" | "learner") {
  const user = TEST_USERS[userType];
  await page.goto("/login", { waitUntil: "networkidle" });
  
  // Wait for page to be fully loaded and form to be interactive
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");
  
  // Wait for login form to be visible and interactive
  const emailInput = page.locator('input[name="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 30000 });
  
  // Wait for React to hydrate - check for form element
  await page.waitForSelector('form', { state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Fill in credentials
  await emailInput.click();
  await emailInput.fill(user.email);
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.fill(user.password);
  
  // Wait for form to be ready
  await page.waitForTimeout(500);
  
  // Submit form - wait for button to be enabled and clickable
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.waitFor({ state: "visible" });
  await submitButton.waitFor({ state: "attached" });
  
  // Check for console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`Browser console error: ${msg.text()}`);
    }
  });
  
  // Wait for page errors
  page.on("pageerror", (error) => {
    console.log(`Page error: ${error.message}`);
  });
  
  // Try submitting - wait for navigation directly
  // The form should handle submission via JavaScript
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }),
    submitButton.click(),
  ]);
  
  return user;
}

export async function logout(page: Page) {
  // Look for logout button in various possible locations
  const logoutSelectors = [
    'button:has-text("Log out")',
    'button:has-text("Logout")',
    'button[aria-label*="logout" i]',
    'a:has-text("Log out")',
    'a:has-text("Logout")',
  ];
  
  for (const selector of logoutSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForURL(/\/login/, { timeout: 5000 });
      return;
    }
  }
  
  // If no logout button found, clear cookies and go to login
  await page.context().clearCookies();
  await page.goto("/login");
}

export async function waitForDashboard(page: Page, expectedRole?: "admin" | "instructor" | "learner") {
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  
  if (expectedRole) {
    const rolePath = expectedRole === "admin" ? "/dashboard/admin" : 
                     expectedRole === "instructor" ? "/dashboard/instructor" : 
                     "/dashboard/learner";
    await page.waitForURL(new RegExp(rolePath), { timeout: 5000 });
  }
}

