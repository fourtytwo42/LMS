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
  await page.goto("/login");
  
  // Wait for login form to be visible
  await page.waitForSelector('input[name="email"]', { state: "visible" });
  
  // Fill in credentials
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  
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

