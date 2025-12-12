# E2E Tests Documentation

This directory contains comprehensive end-to-end (E2E) tests for the LMS application using Playwright.

## Test Structure

### Test Files

- **`auth.spec.ts`** - Authentication tests (login, register, logout)
- **`protected-routes.spec.ts`** - Route protection and redirect tests
- **`learner.spec.ts`** - All LEARNER role functionality tests
- **`instructor.spec.ts`** - All INSTRUCTOR role functionality tests
- **`admin.spec.ts`** - All ADMIN role functionality tests
- **`shared-features.spec.ts`** - Features available to all user types

### Helper Files

- **`helpers/auth.ts`** - Authentication helper functions
- **`helpers/test-data.ts`** - Test data creation helpers

## Test Coverage

### LEARNER Role Tests

- ✅ View learner dashboard
- ✅ Browse catalog
- ✅ View courses list
- ✅ View course details
- ✅ Self-enroll in courses
- ✅ View course content
- ✅ Take tests
- ✅ View progress
- ✅ View certificates
- ✅ View and update profile
- ✅ View notifications
- ✅ Mark notifications as read

### INSTRUCTOR Role Tests

- ✅ View instructor dashboard
- ✅ Create new course
- ✅ Edit existing course
- ✅ Add content to course
- ✅ Create tests
- ✅ View enrollments
- ✅ Approve enrollment requests
- ✅ View analytics
- ✅ View course analytics
- ✅ View courses list
- ✅ Browse catalog
- ✅ View and update profile
- ✅ View notifications

### ADMIN Role Tests

- ✅ View admin dashboard
- ✅ View all users
- ✅ Create new user
- ✅ Edit existing user
- ✅ Delete user
- ✅ Manage courses
- ✅ Create course
- ✅ Manage learning plans
- ✅ Create learning plan
- ✅ Manage groups
- ✅ Create group
- ✅ Manage categories
- ✅ Create category
- ✅ View all enrollments
- ✅ View system analytics
- ✅ View user analytics
- ✅ View and update profile
- ✅ View notifications

### Shared Features Tests (All User Types)

- ✅ Navigate using sidebar menu
- ✅ View profile page
- ✅ Update profile information
- ✅ View notifications
- ✅ Mark notification as read
- ✅ Browse catalog
- ✅ Search in catalog
- ✅ Filter catalog by category
- ✅ Use demo account buttons on login
- ✅ Handle responsive navigation
- ✅ Handle form validation errors
- ✅ Handle loading states
- ✅ Handle error states
- ✅ Maintain session across navigation
- ✅ Logout and redirect to login

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

### Run Specific Test File

```bash
npx playwright test e2e/learner.spec.ts
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

### Run Tests with Debug

```bash
npx playwright test --debug
```

## Test Users

The tests use the following demo accounts (created by seed):

- **Admin**: `admin@lms.com` / `admin123`
- **Instructor**: `instructor@lms.com` / `instructor123`
- **Learner**: `learner@lms.com` / `learner123`

## Configuration

Tests are configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 retries in CI, 0 locally
- **Reporter**: HTML reporter

## Test Helpers

### Authentication Helpers

```typescript
import { loginAs, logout, TEST_USERS } from "./helpers/auth";

// Login as specific user type
await loginAs(page, "admin");

// Logout
await logout(page);

// Access test user credentials
const admin = TEST_USERS.admin;
```

### Test Data Helpers

```typescript
import { createTestCourse, createTestUser } from "./helpers/test-data";

// Create a test course
const courseId = await createTestCourse(page, {
  title: "Test Course",
  description: "Test description",
});

// Create a test user
await createTestUser(page, {
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  password: "Password123",
  roles: ["LEARNER"],
});
```

## Best Practices

1. **Use test.skip()** for tests that depend on data that may not exist
2. **Wait for network idle** before interacting with dynamic content
3. **Use data-testid attributes** when possible for more reliable selectors
4. **Handle async operations** with proper waits
5. **Clean up test data** after tests if needed
6. **Use helper functions** to reduce code duplication

## Troubleshooting

### Tests Fail with "Target page closed"

- Ensure the app is running on `http://localhost:3000`
- Check that PM2 is running the app
- Verify database is accessible

### Tests Fail with Missing Libraries

Install Playwright system dependencies:

```bash
npx playwright install-deps
```

### Tests Timeout

- Increase timeout in test: `test.setTimeout(60000)`
- Check network conditions
- Verify API endpoints are responding

## CI/CD Integration

Tests can be run in CI/CD pipelines. The configuration automatically:
- Uses 2 retries in CI
- Runs with 1 worker in CI
- Generates HTML reports

## Notes

- Tests are designed to be resilient and skip when required data doesn't exist
- Some tests create test data, others use existing seeded data
- Tests verify both positive and negative scenarios
- All user role permissions are tested

