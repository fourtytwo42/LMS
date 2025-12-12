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
  
  // Try submitting - wait for API response first, then navigation
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/auth/login") && resp.status() === 200,
    { timeout: 30000 }
  );
  
  // Click submit and wait for response
  await submitButton.click();
  
  // Wait for API response
  const response = await responsePromise;
  const status = response.status();
  if (status !== 200) {
    const body = await response.text().catch(() => "unknown");
    throw new Error(`Login failed with status ${status}: ${body}`);
  }
  
  // Extract token from Set-Cookie header and set it manually (bypass Secure flag issue)
  // The cookie has Secure flag which prevents it from being sent over HTTP
  const setCookieHeader = response.headers()["set-cookie"];
  let tokenValue: string | null = null;
  
  if (setCookieHeader) {
    // Handle both string and array formats
    const cookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    for (const header of cookieHeaders) {
      const tokenMatch = header.match(/accessToken=([^;]+)/);
      if (tokenMatch) {
        tokenValue = tokenMatch[1];
        // Manually set cookie without Secure flag for localhost testing
        // Try both with and without domain for localhost compatibility
        try {
          await page.context().addCookies([{
            name: "accessToken",
            value: tokenValue,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            secure: false, // Explicitly false for HTTP
            sameSite: "Lax",
          }]);
        } catch (e) {
          // If that fails, try without domain
          try {
            await page.context().addCookies([{
              name: "accessToken",
              value: tokenValue,
              path: "/",
              httpOnly: true,
              secure: false,
              sameSite: "Lax",
            }]);
          } catch (e2) {
            console.log("Failed to set cookie:", e2);
          }
        }
        break;
      }
    }
  }
  
  // If we couldn't extract from header, try to get from response body
  if (!tokenValue) {
    try {
      const responseBody = await response.json();
      // Token might be in response, but usually it's only in Set-Cookie
    } catch {
      // Response might not be JSON
    }
  }
  
  // Wait a moment and verify cookie was set
  await page.waitForTimeout(500);
  const cookies = await page.context().cookies();
  const accessToken = cookies.find(c => c.name === "accessToken");
  if (!accessToken) {
    throw new Error("Login cookie (accessToken) was not set after login");
  }
  
  // Wait a moment for client-side code to execute
  await page.waitForTimeout(2000);
  
  // Check if navigation happened automatically
  const currentUrl = page.url();
  if (!currentUrl.includes("/dashboard")) {
    // Client-side redirect didn't happen - navigate manually
    // First check for errors
    const errorMsg = await page.locator('text=/error|invalid|failed/i').isVisible().catch(() => false);
    if (errorMsg) {
      const errorText = await page.locator('text=/error|invalid|failed/i').first().textContent().catch(() => "unknown");
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // Navigate directly to role-specific dashboard based on user type
    // This bypasses the /dashboard redirect and goes straight to the role dashboard
    let roleDashboard = "/dashboard/learner"; // default
    if (userType === "admin") {
      roleDashboard = "/dashboard/admin";
    } else if (userType === "instructor") {
      roleDashboard = "/dashboard/instructor";
    }
    
    await page.goto(roleDashboard, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    if (finalUrl.includes("/login")) {
      // Still redirecting - cookie might not be working
      // Try one more time with a wait
      await page.waitForTimeout(2000);
      await page.goto(roleDashboard, { waitUntil: "networkidle", timeout: 20000 });
      
      const retryUrl = page.url();
      if (retryUrl.includes("/login")) {
        throw new Error(`Dashboard redirects to login even with valid cookie. User: ${userType}, URL: ${retryUrl}`);
      }
    }
  } else {
    // Navigation happened, wait for it to complete
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Check if we need to wait for role-based redirect
    const url = page.url();
    if (url.includes("/dashboard") && !url.match(/\/dashboard\/(admin|instructor|learner)/)) {
      // Wait for role-based redirect (server-side)
      await page.waitForURL(/\/dashboard\/(admin|instructor|learner)/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
    }
  }
  
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

