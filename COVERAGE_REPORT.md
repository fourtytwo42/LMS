# Test Coverage Report

**Generated:** $(date)
**Current Status:** 433 tests passing, but coverage below 90% threshold

## Overall Coverage

| Metric | Current | Threshold | Gap |
|--------|---------|-----------|-----|
| **Lines** | 78.26% | 90% | -11.74% |
| **Functions** | 89.2% | 90% | -0.8% |
| **Branches** | 60.96% | 90% | -29.04% |
| **Statements** | 78.34% | 90% | -11.66% |

## Priority Files for Testing (Lowest Coverage First)

### Critical Priority (< 70% Coverage)

#### 1. `app/api/certificates/templates/route.ts`
- **Lines:** 56.25% ⚠️
- **Functions:** 15.38% ⚠️⚠️
- **Branches:** 66.66%
- **Statements:** 56.25%
- **Missing Lines:** 35-141, 173-188
- **Status:** Certificate template management needs comprehensive tests

#### 2. `app/api/enrollments/route.ts`
- **Lines:** 61.38% ⚠️
- **Functions:** 42.04% ⚠️
- **Branches:** 100% ✅
- **Statements:** 61.38%
- **Missing Lines:** 61-370, 441-442
- **Status:** Enrollment listing and creation needs more test cases

#### 3. `app/api/courses/route.ts`
- **Lines:** 64.47% ⚠️
- **Functions:** 45.94% ⚠️
- **Branches:** 100% ✅
- **Statements:** 64.47%
- **Missing Lines:** 112-217, 288-289
- **Status:** Course listing and creation needs more edge cases

#### 4. `app/api/content/[id]/route.ts`
- **Lines:** 70.52%
- **Functions:** 51.68% ⚠️
- **Branches:** 57.14% ⚠️⚠️
- **Statements:** 70.96%
- **Missing Lines:** 96, 305, 322-323
- **Status:** Content item CRUD operations need branch coverage

### High Priority (70-80% Coverage)

#### 5. `app/api/progress/test/route.ts`
- **Lines:** 73.75%
- **Functions:** 56.94% ⚠️
- **Branches:** 58.33% ⚠️
- **Statements:** 72.36%
- **Missing Lines:** 62, 218, 274-275
- **Status:** Test progress tracking needs more branch coverage

#### 6. `app/api/tests/[id]/questions/route.ts`
- **Lines:** 73.58%
- **Functions:** 56.92% ⚠️
- **Branches:** 100% ✅
- **Statements:** 73.07%
- **Missing Lines:** 83, 193, 244-245
- **Status:** Question management needs more test cases

#### 7. `app/api/certificates/templates/[id]/route.ts`
- **Lines:** 72.46%
- **Functions:** 34% ⚠️⚠️
- **Branches:** 100% ✅
- **Statements:** 71.21%
- **Missing Lines:** 30-236, 265-273
- **Status:** Certificate template CRUD needs function coverage

#### 8. `app/api/enrollments/[id]/approve/route.ts`
- **Lines:** 72.97%
- **Functions:** 64.28%
- **Branches:** 66.66% ⚠️
- **Statements:** 72.97%
- **Missing Lines:** 108-116, 141-142
- **Status:** Enrollment approval needs branch coverage

#### 9. `app/api/notifications/route.ts`
- **Lines:** 76.19%
- **Functions:** 44.44% ⚠️
- **Branches:** 100% ✅
- **Statements:** 76.19%
- **Missing Lines:** 11-17, 74-75
- **Status:** Notification listing needs function coverage

#### 10. `app/api/learning-plans/[id]/courses/route.ts`
- **Lines:** 80%
- **Functions:** 42.5% ⚠️
- **Branches:** 100% ✅
- **Statements:** 80%
- **Missing Lines:** 42, 150, 203-204
- **Status:** Learning plan course management needs function coverage

### Medium Priority (80-90% Coverage)

#### 11. `app/api/files/upload/route.ts`
- **Lines:** 76.47%
- **Functions:** 76.47%
- **Branches:** 50% ⚠️⚠️
- **Statements:** 76.47%
- **Missing Lines:** 19, 140-159
- **Status:** File upload error handling needs branch coverage

#### 12. `app/api/tests/route.ts`
- **Lines:** 82.69%
- **Functions:** 65.3%
- **Branches:** 75% ⚠️
- **Statements:** 82.69%
- **Missing Lines:** 133-139, 244-245
- **Status:** Test creation needs branch coverage

#### 13. `app/api/completions/check-course/[courseId]/route.ts`
- **Lines:** 78.12%
- **Functions:** 57.69% ⚠️
- **Branches:** 100% ✅
- **Statements:** 77.41%
- **Missing Lines:** 113-114, 139-140
- **Status:** Course completion checking needs function coverage

#### 14. `app/api/completions/route.ts`
- **Lines:** 79.16%
- **Functions:** 50% ⚠️
- **Branches:** 100% ✅
- **Statements:** 79.16%
- **Missing Lines:** 11-17, 89-90
- **Status:** Completion listing needs function coverage

#### 15. `app/api/notifications/read-all/route.ts`
- **Lines:** 70%
- **Functions:** 50% ⚠️
- **Branches:** 100% ✅
- **Statements:** 70%
- **Missing Lines:** 9, 37-38
- **Status:** Mark all as read needs function coverage

## Files with Good Coverage (90%+)

✅ **Perfect Coverage (100%):**
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/lib/auth/middleware.ts`
- `src/lib/auth/password.ts`
- `src/lib/security/sanitize.ts`
- `src/lib/utils/cn.ts`
- `src/lib/utils/errors.ts`
- `src/lib/utils/validation.ts`

✅ **Near Perfect (90%+):**
- `app/api/repository/content/route.ts` - 90% lines, 82.14% functions
- `app/api/content/[id]/order/route.ts` - 89.65% lines, 71.42% functions
- `app/api/files/repository/[courseId]/route.ts` - 89.65% lines, 77.27% functions
- `app/api/tests/[id]/route.ts` - 87.32% lines, 67.14% functions
- `app/api/repository/questions/route.ts` - 86.04% lines, 71.05% functions
- `app/api/progress/video/route.ts` - 86.84% lines, 57.89% functions
- `app/api/users/route.ts` - 85.45% lines, 73.68% functions

## Recommendations

### Immediate Actions (Critical Priority)

1. **Certificate Templates** (`app/api/certificates/templates/route.ts`)
   - Only 15.38% function coverage
   - Add tests for all CRUD operations
   - Test error handling and validation

2. **Enrollments** (`app/api/enrollments/route.ts`)
   - 61.38% line coverage
   - Add tests for pagination, filtering, search
   - Test bulk enrollment operations

3. **Courses** (`app/api/courses/route.ts`)
   - 64.47% line coverage
   - Add tests for complex filtering scenarios
   - Test course creation with all fields

4. **Content Items** (`app/api/content/[id]/route.ts`)
   - 57.14% branch coverage (critical)
   - Add tests for all conditional paths
   - Test permission checks for different user roles

### High Priority Actions

5. **Test Progress** (`app/api/progress/test/route.ts`)
   - 58.33% branch coverage
   - Add tests for all scoring scenarios
   - Test edge cases in progress calculation

6. **File Upload** (`app/api/files/upload/route.ts`)
   - 50% branch coverage
   - Add tests for all file type validations
   - Test error handling for invalid files

### Branch Coverage Focus

The biggest gap is **branch coverage at 60.96%**. Focus on:
- Error handling paths
- Conditional logic (if/else, switch statements)
- Permission checks
- Validation failures
- Edge cases in business logic

### Function Coverage Focus

Several files have low function coverage:
- Certificate templates: 15.38%
- Certificate templates [id]: 34%
- Courses: 45.94%
- Enrollments: 42.04%
- Notifications: 44.44%
- Learning plans courses: 42.5%

These need tests for all exported functions and methods.

## Test Strategy

1. **Start with Critical Priority files** - These have the lowest coverage and likely contain important business logic
2. **Focus on Branch Coverage** - This is the biggest gap (29% below threshold)
3. **Add Error Path Tests** - Many files are missing error handling test cases
4. **Test Edge Cases** - Boundary conditions, null checks, validation failures
5. **Permission Tests** - Ensure all role-based access controls are tested

## Next Steps

1. Create test files for certificate templates (highest priority)
2. Expand enrollment route tests
3. Add branch coverage tests for content items
4. Improve file upload test coverage
5. Add missing function tests for courses and learning plans

