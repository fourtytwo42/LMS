# LMS - API Specifications

**Complete API documentation for all endpoints, request/response formats, authentication, and WebSocket events.**

## Base URL

**Development:** `http://localhost:3000/api`  
**Production:** `https://your-domain.com/api`

## Authentication

**Method:** JWT tokens stored in HTTP-only cookies

**Flow:**
1. User authenticates via `/api/auth/login` or `/api/auth/register`
2. Backend issues JWT access token (3-day expiration) and refresh token (30-day expiration)
3. Tokens stored in HTTP-only cookies (`accessToken`, `refreshToken`)
4. Client includes cookies automatically in subsequent requests
5. On token expiration, use `/api/auth/refresh` to get new access token

**Headers:**
- All authenticated requests automatically include JWT cookie
- No explicit Authorization header needed (cookie-based auth)
- CSRF protection via SameSite cookie attribute

**Token Structure:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  roles: string[]; // ["LEARNER", "INSTRUCTOR", "ADMIN"]
  iat: number; // Issued at
  exp: number; // Expiration
}
```

## Error Responses

All endpoints may return these error responses:

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "field": "Error message for field"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## Endpoints

### Authentication

#### `POST /api/auth/register`

**Purpose:** Register a new user account

**Authentication:** None (public endpoint, if self-registration enabled)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": false,
    "roles": ["LEARNER"]
  },
  "message": "Registration successful. Please check your email for verification."
}
```

**Error Responses:**
- `400` - Validation error (invalid email, weak password, etc.)
- `409` - Email already exists
- `403` - Self-registration disabled

---

#### `POST /api/auth/login`

**Purpose:** Authenticate user and receive JWT tokens

**Authentication:** None (public endpoint)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["LEARNER", "INSTRUCTOR"],
    "avatar": "https://example.com/avatars/user.jpg"
  },
  "message": "Login successful"
}
```

**Cookies Set:**
- `accessToken` - JWT access token (3-day expiration, HTTP-only, SameSite=Strict)
- `refreshToken` - JWT refresh token (30-day expiration, HTTP-only, SameSite=Strict)

**Error Responses:**
- `400` - Invalid email or password format
- `401` - Invalid credentials
- `423` - Account locked (too many failed attempts)

---

#### `POST /api/auth/refresh`

**Purpose:** Refresh access token using refresh token

**Authentication:** Refresh token cookie required

**Request:** None (uses refresh token from cookie)

**Response (200):**
```json
{
  "message": "Token refreshed"
}
```

**Cookies Set:**
- `accessToken` - New JWT access token

**Error Responses:**
- `401` - Invalid or expired refresh token

---

#### `POST /api/auth/logout`

**Purpose:** Logout user and invalidate tokens

**Authentication:** Required

**Request:** None

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Cookies Cleared:**
- `accessToken`
- `refreshToken`

---

#### `POST /api/auth/forgot-password`

**Purpose:** Request password reset email

**Authentication:** None (public endpoint, if enabled)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Error Responses:**
- `400` - Invalid email format
- `403` - Password reset disabled

---

#### `POST /api/auth/reset-password`

**Purpose:** Reset password using reset token

**Authentication:** None (public endpoint)

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**
- `400` - Invalid or expired token, weak password
- `401` - Invalid reset token

---

#### `GET /api/auth/me`

**Purpose:** Get current authenticated user

**Authentication:** Required

**Request:** None

**Response (200):**
```json
{
  "id": "clx123abc",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://example.com/avatars/user.jpg",
  "bio": "Software developer",
  "emailVerified": true,
  "roles": ["LEARNER", "INSTRUCTOR"],
  "createdAt": "2025-01-15T10:00:00Z",
  "lastLoginAt": "2025-12-09T08:30:00Z"
}
```

**Error Responses:**
- `401` - Not authenticated

---

### Users

#### `GET /api/users`

**Purpose:** List users (with filters and pagination)

**Authentication:** Required (Admin or Instructor)

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `search` (string) - Search by name or email
- `role` (string) - Filter by role (LEARNER, INSTRUCTOR, ADMIN)
- `groupId` (string) - Filter by group membership

**Response (200):**
```json
{
  "users": [
    {
      "id": "clx123abc",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://example.com/avatars/user.jpg",
      "roles": ["LEARNER"],
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Insufficient permissions

---

#### `POST /api/users`

**Purpose:** Create new user (admin only)

**Authentication:** Required (Admin)

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["LEARNER", "INSTRUCTOR"]
}
```

**Response (201):**
```json
{
  "user": {
    "id": "clx456def",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "roles": ["LEARNER", "INSTRUCTOR"],
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `409` - Email already exists
- `403` - Insufficient permissions

---

#### `GET /api/users/:id`

**Purpose:** Get user by ID

**Authentication:** Required (Admin, Instructor, or self)

**Response (200):**
```json
{
  "id": "clx123abc",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://example.com/avatars/user.jpg",
  "bio": "Software developer",
  "emailVerified": true,
  "roles": ["LEARNER", "INSTRUCTOR"],
  "createdAt": "2025-01-15T10:00:00Z",
  "lastLoginAt": "2025-12-09T08:30:00Z",
  "enrollments": [
    {
      "id": "enrollment-id",
      "courseId": "course-id",
      "courseTitle": "Introduction to Web Development",
      "status": "IN_PROGRESS",
      "progress": 45
    }
  ]
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Insufficient permissions (can't view other users unless admin/instructor)
- `404` - User not found

---

#### `PUT /api/users/:id`

**Purpose:** Update user (admin or self for own profile)

**Authentication:** Required

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Note:** Email cannot be changed via this endpoint. Password changes use separate endpoint.

**Response (200):**
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Updated bio",
    "avatar": "https://example.com/new-avatar.jpg",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Not authenticated
- `403` - Insufficient permissions (can't edit other users unless admin)
- `404` - User not found

---

#### `DELETE /api/users/:id`

**Purpose:** Delete user (admin only)

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Insufficient permissions
- `404` - User not found
- `409` - Cannot delete user (has active enrollments, etc.)

---

#### `POST /api/users/bulk-import`

**Purpose:** Bulk import users from CSV

**Authentication:** Required (Admin)

**Request:** Multipart form data
- `file` (file) - CSV file with columns: email, firstName, lastName, password (optional), roles (comma-separated)

**Response (200):**
```json
{
  "imported": 50,
  "failed": 2,
  "errors": [
    {
      "row": 3,
      "email": "invalid@email",
      "error": "Invalid email format"
    }
  ]
}
```

**Error Responses:**
- `400` - Invalid file format
- `403` - Insufficient permissions

---

#### `GET /api/users/bulk-export`

**Purpose:** Export users to CSV

**Authentication:** Required (Admin)

**Query Parameters:**
- `format` (string, default: "csv") - Export format
- `role` (string) - Filter by role
- `groupId` (string) - Filter by group

**Response (200):**
- Content-Type: `text/csv`
- File download with CSV data

**Error Responses:**
- `403` - Insufficient permissions

---

### Courses

#### `GET /api/courses`

**Purpose:** List courses (with filters, search, pagination)

**Authentication:** Required (public courses visible to all, private to enrolled/instructors/admins)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string) - Search in title/description
- `categoryId` (string) - Filter by category
- `tags` (string[]) - Filter by tags
- `status` (string) - Filter by status (DRAFT, PUBLISHED, ARCHIVED)
- `publicAccess` (boolean) - Filter public/private courses
- `selfEnrollment` (boolean) - Filter self-enrollable courses
- `featured` (boolean) - Filter featured courses
- `difficultyLevel` (string) - Filter by difficulty
- `sort` (string) - Sort by: "newest", "oldest", "title", "rating"

**Response (200):**
```json
{
  "courses": [
    {
      "id": "course-id",
      "code": "COURSE-001",
      "title": "Introduction to Web Development",
      "shortDescription": "Learn the fundamentals of web development",
      "thumbnail": "https://example.com/thumbnails/course.jpg",
      "status": "PUBLISHED",
      "type": "E-LEARNING",
      "estimatedTime": 120,
      "difficultyLevel": "BEGINNER",
      "publicAccess": true,
      "selfEnrollment": true,
      "featured": false,
      "category": {
        "id": "cat-id",
        "name": "Web Development"
      },
      "tags": ["html", "css", "javascript"],
      "rating": 4.5,
      "enrollmentCount": 150,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 83,
    "totalPages": 5
  }
}
```

---

#### `POST /api/courses`

**Purpose:** Create new course

**Authentication:** Required (Instructor or Admin)

**Request:**
```json
{
  "code": "COURSE-001",
  "title": "Introduction to Web Development",
  "shortDescription": "Learn the fundamentals of web development",
  "description": "Complete course description here...",
  "type": "E-LEARNING",
  "categoryId": "cat-id",
  "tags": ["html", "css", "javascript"],
  "estimatedTime": 120,
  "difficultyLevel": "BEGINNER",
  "publicAccess": false,
  "selfEnrollment": false,
  "sequentialRequired": true,
  "allowSkipping": false
}
```

**Response (201):**
```json
{
  "course": {
    "id": "course-id",
    "code": "COURSE-001",
    "title": "Introduction to Web Development",
    "status": "DRAFT",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Insufficient permissions

---

#### `GET /api/courses/:id`

**Purpose:** Get course details

**Authentication:** Required (must have access to course)

**Response (200):**
```json
{
  "id": "course-id",
  "code": "COURSE-001",
  "title": "Introduction to Web Development",
  "shortDescription": "Learn the fundamentals of web development",
  "description": "Complete course description...",
  "thumbnail": "https://example.com/thumbnails/course.jpg",
  "coverImage": "https://example.com/covers/course.jpg",
  "status": "PUBLISHED",
  "type": "E-LEARNING",
  "estimatedTime": 120,
  "difficultyLevel": "BEGINNER",
  "publicAccess": true,
  "selfEnrollment": true,
  "sequentialRequired": true,
  "allowSkipping": false,
  "category": {
    "id": "cat-id",
    "name": "Web Development"
  },
  "tags": ["html", "css", "javascript"],
  "rating": 4.5,
  "reviewCount": 25,
  "enrollmentCount": 150,
  "contentItems": [
    {
      "id": "content-id",
      "title": "Introduction Video",
      "type": "VIDEO",
      "order": 1,
      "priority": 0,
      "required": true,
      "completed": false
    }
  ],
  "createdBy": {
    "id": "user-id",
    "firstName": "John",
    "lastName": "Instructor"
  },
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-12-09T08:00:00Z"
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - No access to course
- `404` - Course not found

---

#### `PUT /api/courses/:id`

**Purpose:** Update course

**Authentication:** Required (Instructor assigned to course or Admin)

**Request:** Same as POST, all fields optional

**Response (200):**
```json
{
  "course": {
    "id": "course-id",
    "title": "Updated Course Title",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Insufficient permissions
- `404` - Course not found

---

#### `DELETE /api/courses/:id`

**Purpose:** Delete course (admin only)

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "message": "Course deleted successfully"
}
```

**Error Responses:**
- `403` - Insufficient permissions
- `404` - Course not found
- `409` - Cannot delete (has enrollments, etc.)

---

#### `POST /api/courses/:id/publish`

**Purpose:** Publish course (change status from DRAFT to PUBLISHED)

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "course": {
    "id": "course-id",
    "status": "PUBLISHED",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `POST /api/courses/:id/archive`

**Purpose:** Archive course (change status to ARCHIVED)

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "course": {
    "id": "course-id",
    "status": "ARCHIVED",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `GET /api/courses/:id/analytics`

**Purpose:** Get course analytics

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "courseId": "course-id",
  "enrollments": {
    "total": 150,
    "active": 45,
    "completed": 80,
    "dropped": 25
  },
  "completionRate": 53.3,
  "averageScore": 85.5,
  "averageTimeToComplete": 95, // minutes
  "contentItems": [
    {
      "id": "content-id",
      "title": "Introduction Video",
      "type": "VIDEO",
      "completionRate": 92.5,
      "averageWatchTime": 450, // seconds
      "timesWatched": 138
    }
  ],
  "tests": [
    {
      "id": "test-id",
      "title": "Final Exam",
      "attempts": 120,
      "passRate": 78.3,
      "averageScore": 82.5
    }
  ]
}
```

**Error Responses:**
- `403` - Insufficient permissions

---

### Learning Plans

#### `GET /api/learning-plans`

**Purpose:** List learning plans (similar to courses endpoint)

**Authentication:** Required

**Query Parameters:** Same as courses endpoint

**Response (200):**
```json
{
  "learningPlans": [
    {
      "id": "plan-id",
      "code": "LP-001",
      "title": "Full Stack Web Development",
      "shortDescription": "Complete web development bootcamp",
      "thumbnail": "https://example.com/thumbnails/plan.jpg",
      "status": "PUBLISHED",
      "estimatedTime": 600,
      "difficultyLevel": "INTERMEDIATE",
      "courseCount": 5,
      "enrollmentCount": 200,
      "rating": 4.8,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

---

#### `POST /api/learning-plans`

**Purpose:** Create learning plan

**Authentication:** Required (Instructor or Admin)

**Request:**
```json
{
  "code": "LP-001",
  "title": "Full Stack Web Development",
  "shortDescription": "Complete web development bootcamp",
  "description": "Full description...",
  "categoryId": "cat-id",
  "tags": ["web", "fullstack", "javascript"],
  "estimatedTime": 600,
  "difficultyLevel": "INTERMEDIATE",
  "publicAccess": true,
  "selfEnrollment": true,
  "hasCertificate": true,
  "hasBadge": true
}
```

**Response (201):**
```json
{
  "learningPlan": {
    "id": "plan-id",
    "code": "LP-001",
    "title": "Full Stack Web Development",
    "status": "DRAFT",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `GET /api/learning-plans/:id`

**Purpose:** Get learning plan details

**Authentication:** Required (must have access)

**Response (200):**
```json
{
  "id": "plan-id",
  "code": "LP-001",
  "title": "Full Stack Web Development",
  "description": "Full description...",
  "status": "PUBLISHED",
  "courses": [
    {
      "id": "course-id",
      "title": "Introduction to Web Development",
      "order": 1,
      "estimatedTime": 120
    }
  ],
  "enrollmentCount": 200,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

#### `PUT /api/learning-plans/:id`

**Purpose:** Update learning plan

**Authentication:** Required (Instructor assigned or Admin)

**Request:** Same as POST, all fields optional

**Response (200):**
```json
{
  "learningPlan": {
    "id": "plan-id",
    "title": "Updated Title",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `POST /api/learning-plans/:id/courses`

**Purpose:** Add course to learning plan

**Authentication:** Required (Instructor assigned or Admin)

**Request:**
```json
{
  "courseId": "course-id",
  "order": 1
}
```

**Response (200):**
```json
{
  "message": "Course added to learning plan"
}
```

---

#### `PUT /api/learning-plans/:id/courses/order`

**Purpose:** Reorder courses in learning plan

**Authentication:** Required (Instructor assigned or Admin)

**Request:**
```json
{
  "courseOrders": [
    { "courseId": "course-1", "order": 1 },
    { "courseId": "course-2", "order": 2 },
    { "courseId": "course-3", "order": 3 }
  ]
}
```

**Response (200):**
```json
{
  "message": "Courses reordered successfully"
}
```

---

### Content Items

#### `GET /api/courses/:courseId/content`

**Purpose:** List content items for a course

**Authentication:** Required (must have access to course)

**Response (200):**
```json
{
  "contentItems": [
    {
      "id": "content-id",
      "title": "Introduction Video",
      "description": "Watch this video to get started",
      "type": "VIDEO",
      "order": 1,
      "priority": 0,
      "required": true,
      "videoUrl": "/api/files/video-id/stream",
      "videoDuration": 600,
      "completionThreshold": 0.8,
      "completed": false,
      "progress": 0.45
    },
    {
      "id": "test-id",
      "title": "Quiz 1",
      "type": "TEST",
      "order": 2,
      "priority": 1,
      "required": true,
      "unlocked": false // Locked until video is completed
    }
  ]
}
```

---

#### `POST /api/courses/:courseId/content`

**Purpose:** Add content item to course

**Authentication:** Required (Instructor assigned or Admin)

**Request:**
```json
{
  "title": "Introduction Video",
  "description": "Watch this video to get started",
  "type": "VIDEO",
  "order": 1,
  "priority": 0,
  "required": true,
  "videoUrl": "https://example.com/video.mp4",
  "completionThreshold": 0.8,
  "allowSeeking": true
}
```

**Response (201):**
```json
{
  "contentItem": {
    "id": "content-id",
    "title": "Introduction Video",
    "type": "VIDEO",
    "order": 1,
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `GET /api/content/:id`

**Purpose:** Get content item details

**Authentication:** Required (must have access)

**Response (200):**
```json
{
  "id": "content-id",
  "title": "Introduction Video",
  "description": "Watch this video...",
  "type": "VIDEO",
  "order": 1,
  "priority": 0,
  "required": true,
  "videoUrl": "/api/files/video-id/stream",
  "videoDuration": 600,
  "completionThreshold": 0.8,
  "allowSeeking": true
}
```

---

#### `PUT /api/content/:id`

**Purpose:** Update content item

**Authentication:** Required (Instructor assigned or Admin)

**Request:** Same as POST, all fields optional

**Response (200):**
```json
{
  "contentItem": {
    "id": "content-id",
    "title": "Updated Title",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `DELETE /api/content/:id`

**Purpose:** Delete content item

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "message": "Content item deleted successfully"
}
```

---

#### `PUT /api/content/:id/order`

**Purpose:** Update content item order/priority

**Authentication:** Required (Instructor assigned or Admin)

**Request:**
```json
{
  "order": 2,
  "priority": 1
}
```

**Response (200):**
```json
{
  "contentItem": {
    "id": "content-id",
    "order": 2,
    "priority": 1
  }
}
```

---

### Enrollments

#### `GET /api/enrollments`

**Purpose:** List enrollments (with filters)

**Authentication:** Required

**Query Parameters:**
- `userId` (string) - Filter by user
- `courseId` (string) - Filter by course
- `learningPlanId` (string) - Filter by learning plan
- `status` (string) - Filter by status
- `page` (number)
- `limit` (number)

**Response (200):**
```json
{
  "enrollments": [
    {
      "id": "enrollment-id",
      "userId": "user-id",
      "courseId": "course-id",
      "status": "IN_PROGRESS",
      "progress": 45,
      "enrolledAt": "2025-01-15T10:00:00Z",
      "startedAt": "2025-01-16T08:00:00Z",
      "dueDate": "2025-02-15T23:59:59Z",
      "course": {
        "id": "course-id",
        "title": "Introduction to Web Development"
      },
      "user": {
        "id": "user-id",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

#### `POST /api/enrollments`

**Purpose:** Create enrollment (manual enrollment by instructor/admin)

**Authentication:** Required (Instructor or Admin)

**Request:**
```json
{
  "userId": "user-id",
  "courseId": "course-id",
  "dueDate": "2025-02-15T23:59:59Z"
}
```

**Or for learning plan:**
```json
{
  "userId": "user-id",
  "learningPlanId": "plan-id",
  "dueDate": "2025-02-15T23:59:59Z"
}
```

**Response (201):**
```json
{
  "enrollment": {
    "id": "enrollment-id",
    "userId": "user-id",
    "courseId": "course-id",
    "status": "ENROLLED",
    "enrolledAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `POST /api/enrollments/self`

**Purpose:** Self-enroll in course or learning plan

**Authentication:** Required

**Request:**
```json
{
  "courseId": "course-id"
}
```

**Or:**
```json
{
  "learningPlanId": "plan-id"
}
```

**Response (201):**
```json
{
  "enrollment": {
    "id": "enrollment-id",
    "status": "ENROLLED",
    "requiresApproval": true,
    "message": "Enrollment request submitted. Waiting for approval."
  }
}
```

**Or if approval not required:**
```json
{
  "enrollment": {
    "id": "enrollment-id",
    "status": "ENROLLED",
    "message": "Successfully enrolled"
  }
}
```

**Error Responses:**
- `400` - Course/plan not available for self-enrollment
- `409` - Already enrolled
- `403` - Enrollment limit reached

---

#### `POST /api/enrollments/bulk`

**Purpose:** Bulk enroll users

**Authentication:** Required (Instructor or Admin)

**Request:**
```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "courseId": "course-id",
  "dueDate": "2025-02-15T23:59:59Z"
}
```

**Response (200):**
```json
{
  "enrolled": 3,
  "failed": 0,
  "enrollments": [
    {
      "id": "enrollment-id-1",
      "userId": "user-1"
    }
  ]
}
```

---

#### `POST /api/enrollments/:id/approve`

**Purpose:** Approve enrollment request

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "enrollment": {
    "id": "enrollment-id",
    "status": "ENROLLED",
    "approvedAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `DELETE /api/enrollments/:id`

**Purpose:** Remove enrollment

**Authentication:** Required (Admin, Instructor, or self)

**Response (200):**
```json
{
  "message": "Enrollment removed successfully"
}
```

---

### Progress Tracking

#### `GET /api/progress/course/:courseId`

**Purpose:** Get course progress for current user

**Authentication:** Required

**Response (200):**
```json
{
  "courseId": "course-id",
  "enrollmentId": "enrollment-id",
  "status": "IN_PROGRESS",
  "progress": 45,
  "contentItems": [
    {
      "id": "content-id",
      "title": "Introduction Video",
      "type": "VIDEO",
      "completed": true,
      "progress": 1.0,
      "completedAt": "2025-12-08T10:00:00Z"
    },
    {
      "id": "test-id",
      "title": "Quiz 1",
      "type": "TEST",
      "completed": false,
      "unlocked": true,
      "bestScore": 0.85
    }
  ],
  "startedAt": "2025-01-16T08:00:00Z",
  "dueDate": "2025-02-15T23:59:59Z"
}
```

---

#### `GET /api/progress/learning-plan/:planId`

**Purpose:** Get learning plan progress for current user

**Authentication:** Required

**Response (200):**
```json
{
  "learningPlanId": "plan-id",
  "enrollmentId": "enrollment-id",
  "status": "IN_PROGRESS",
  "progress": 60,
  "courses": [
    {
      "id": "course-id",
      "title": "Introduction to Web Development",
      "completed": true,
      "progress": 100,
      "completedAt": "2025-12-05T10:00:00Z"
    },
    {
      "id": "course-id-2",
      "title": "Advanced JavaScript",
      "completed": false,
      "progress": 30,
      "unlocked": true
    }
  ],
  "startedAt": "2025-01-15T10:00:00Z"
}
```

---

#### `POST /api/progress/video`

**Purpose:** Update video watch progress

**Authentication:** Required

**Request:**
```json
{
  "contentItemId": "content-id",
  "watchTime": 300, // seconds watched
  "totalDuration": 600, // total video duration
  "lastPosition": 0.5, // 0.0-1.0
  "timesWatched": 1
}
```

**Response (200):**
```json
{
  "progress": {
    "contentItemId": "content-id",
    "watchTime": 300,
    "totalDuration": 600,
    "lastPosition": 0.5,
    "timesWatched": 1,
    "completed": false,
    "completionPercentage": 50
  },
  "unlockedNext": false
}
```

**Note:** If completion threshold is met, `completed` will be `true` and `unlockedNext` will indicate if next content is unlocked.

---

#### `GET /api/progress/video/:contentItemId`

**Purpose:** Get video progress for current user

**Authentication:** Required

**Response (200):**
```json
{
  "contentItemId": "content-id",
  "watchTime": 300,
  "totalDuration": 600,
  "lastPosition": 0.5,
  "timesWatched": 1,
  "completed": false,
  "completedAt": null
}
```

---

#### `POST /api/progress/test`

**Purpose:** Submit test attempt

**Authentication:** Required

**Request:**
```json
{
  "testId": "test-id",
  "answers": [
    {
      "questionId": "question-id-1",
      "answerText": "Answer text",
      "selectedOptions": [0, 2]
    },
    {
      "questionId": "question-id-2",
      "answerText": "True"
    }
  ],
  "timeSpent": 1200 // seconds
}
```

**Response (200):**
```json
{
  "attempt": {
    "id": "attempt-id",
    "testId": "test-id",
    "attemptNumber": 1,
    "score": 0.85,
    "pointsEarned": 85,
    "totalPoints": 100,
    "passed": true,
    "timeSpent": 1200,
    "submittedAt": "2025-12-09T10:30:00Z"
  },
  "answers": [
    {
      "questionId": "question-id-1",
      "isCorrect": true,
      "pointsEarned": 10,
      "correctAnswer": "Correct answer text"
    }
  ],
  "canRetake": true,
  "maxAttempts": 3,
  "remainingAttempts": 2
}
```

**Error Responses:**
- `400` - Invalid answers, test not unlocked, etc.
- `403` - Max attempts reached

---

#### `GET /api/progress/test/:testId`

**Purpose:** Get test attempts and scores for current user

**Authentication:** Required

**Response (200):**
```json
{
  "testId": "test-id",
  "attempts": [
    {
      "id": "attempt-id",
      "attemptNumber": 1,
      "score": 0.85,
      "passed": true,
      "submittedAt": "2025-12-09T10:30:00Z"
    }
  ],
  "bestScore": 0.85,
  "canRetake": true,
  "remainingAttempts": 2
}
```

---

### Tests

#### `GET /api/tests/:id`

**Purpose:** Get test details (for taking test)

**Authentication:** Required (must have access)

**Response (200):**
```json
{
  "id": "test-id",
  "title": "Final Exam",
  "description": "Complete this test to finish the course",
  "passingScore": 0.7,
  "maxAttempts": 3,
  "timeLimit": 60, // minutes
  "showCorrectAnswers": false,
  "randomizeQuestions": false,
  "randomizeAnswers": false,
  "questions": [
    {
      "id": "question-id",
      "type": "SINGLE_CHOICE",
      "questionText": "What is the capital of France?",
      "points": 10,
      "options": [
        { "text": "London", "correct": false },
        { "text": "Paris", "correct": true },
        { "text": "Berlin", "correct": false }
      ],
      "order": 1
    }
  ]
}
```

**Note:** If `showCorrectAnswers` is false, correct answers are not included in response.

---

#### `POST /api/tests`

**Purpose:** Create test

**Authentication:** Required (Instructor or Admin)

**Request:**
```json
{
  "contentItemId": "content-id",
  "title": "Final Exam",
  "description": "Complete this test...",
  "passingScore": 0.7,
  "maxAttempts": 3,
  "timeLimit": 60,
  "showCorrectAnswers": false,
  "randomizeQuestions": false,
  "randomizeAnswers": false
}
```

**Response (201):**
```json
{
  "test": {
    "id": "test-id",
    "title": "Final Exam",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `PUT /api/tests/:id`

**Purpose:** Update test

**Authentication:** Required (Instructor assigned or Admin)

**Request:** Same as POST, all fields optional

**Response (200):**
```json
{
  "test": {
    "id": "test-id",
    "title": "Updated Title",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `GET /api/tests/:id/questions`

**Purpose:** Get test questions (for editing)

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "questions": [
    {
      "id": "question-id",
      "type": "SINGLE_CHOICE",
      "questionText": "What is the capital of France?",
      "points": 10,
      "options": [
        { "text": "London", "correct": false },
        { "text": "Paris", "correct": true },
        { "text": "Berlin", "correct": false }
      ],
      "explanation": "Paris is the capital and largest city of France.",
      "order": 1
    }
  ]
}
```

---

#### `POST /api/tests/:id/questions`

**Purpose:** Add question to test

**Authentication:** Required (Instructor assigned or Admin)

**Request:**
```json
{
  "type": "SINGLE_CHOICE",
  "questionText": "What is the capital of France?",
  "points": 10,
  "options": [
    { "text": "London", "correct": false },
    { "text": "Paris", "correct": true },
    { "text": "Berlin", "correct": false }
  ],
  "explanation": "Paris is the capital...",
  "order": 1
}
```

**Response (201):**
```json
{
  "question": {
    "id": "question-id",
    "questionText": "What is the capital of France?",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `PUT /api/questions/:id`

**Purpose:** Update question

**Authentication:** Required (Instructor assigned or Admin)

**Request:** Same as POST, all fields optional

**Response (200):**
```json
{
  "question": {
    "id": "question-id",
    "questionText": "Updated question",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `DELETE /api/questions/:id`

**Purpose:** Delete question

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "message": "Question deleted successfully"
}
```

---

#### `GET /api/tests/:id/analytics`

**Purpose:** Get test analytics

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "testId": "test-id",
  "totalAttempts": 120,
  "passRate": 78.3,
  "averageScore": 82.5,
  "averageTimeSpent": 45, // minutes
  "questionPerformance": [
    {
      "questionId": "question-id",
      "questionText": "What is the capital of France?",
      "totalAttempts": 120,
      "correctAttempts": 95,
      "correctRate": 79.2
    }
  ],
  "scoreDistribution": {
    "0-50": 5,
    "50-60": 10,
    "60-70": 15,
    "70-80": 25,
    "80-90": 35,
    "90-100": 30
  }
}
```

---

### Files

#### `POST /api/files/upload`

**Purpose:** Upload file (video, PDF, PPT, repository file, avatar)

**Authentication:** Required

**Request:** Multipart form data
- `file` (file) - File to upload
- `type` (string) - File type: "VIDEO", "PDF", "PPT", "REPOSITORY", "AVATAR", "THUMBNAIL", "COVER"
- `courseId` (string, optional) - For course-related files
- `contentItemId` (string, optional) - For content item files
- `folderPath` (string, optional) - For repository files

**Response (200):**
```json
{
  "file": {
    "id": "file-id",
    "fileName": "video.mp4",
    "filePath": "/storage/videos/course-123/content-456/video.mp4",
    "fileSize": 52428800,
    "mimeType": "video/mp4",
    "url": "/api/files/file-id/download"
  }
}
```

**Error Responses:**
- `400` - File too large (>100MB), invalid file type
- `413` - File size exceeds limit

---

#### `GET /api/files/:id`

**Purpose:** Get file metadata

**Authentication:** Required (must have access)

**Response (200):**
```json
{
  "id": "file-id",
  "fileName": "video.mp4",
  "filePath": "/storage/videos/course-123/content-456/video.mp4",
  "fileSize": 52428800,
  "mimeType": "video/mp4",
  "url": "/api/files/file-id/download",
  "createdAt": "2025-12-09T10:00:00Z"
}
```

---

#### `GET /api/files/:id/download`

**Purpose:** Download file (or stream video)

**Authentication:** Required (must have access)

**Response (200):**
- Content-Type: Based on file MIME type
- Content-Disposition: `attachment; filename="video.mp4"` (for downloads)
- For videos: Supports HTTP range requests for streaming

**Headers for video streaming:**
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-1023/52428800` (for partial content)

**Error Responses:**
- `403` - No access to file
- `404` - File not found

---

#### `GET /api/files/:id/stream`

**Purpose:** Stream video file with range request support

**Authentication:** Required (must have access)

**Request Headers:**
- `Range: bytes=0-1023` (optional, for seeking)

**Response (206 Partial Content):**
- Content-Type: `video/mp4`
- Content-Range: `bytes 0-1023/52428800`
- Accept-Ranges: `bytes`

---

#### `DELETE /api/files/:id`

**Purpose:** Delete file

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

---

#### `GET /api/files/repository/:courseId`

**Purpose:** Get repository files for course

**Authentication:** Required (must have access to course)

**Query Parameters:**
- `folderPath` (string, optional) - Filter by folder

**Response (200):**
```json
{
  "files": [
    {
      "id": "file-id",
      "fileName": "handout.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "folderPath": "materials/week1",
      "downloadCount": 45,
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "folders": [
    {
      "path": "materials/week1",
      "fileCount": 5
    }
  ]
}
```

---

#### `POST /api/files/folder`

**Purpose:** Create folder in repository

**Authentication:** Required (Instructor assigned or Admin)

**Request:**
```json
{
  "courseId": "course-id",
  "folderPath": "materials/week2"
}
```

**Response (201):**
```json
{
  "message": "Folder created successfully"
}
```

---

#### `POST /api/files/bulk-upload`

**Purpose:** Bulk upload files (including folders)

**Authentication:** Required (Instructor assigned or Admin)

**Request:** Multipart form data
- `files` (file[]) - Multiple files
- `courseId` (string)
- `folderPath` (string, optional)

**Response (200):**
```json
{
  "uploaded": 10,
  "failed": 0,
  "files": [
    {
      "id": "file-id",
      "fileName": "file1.pdf"
    }
  ]
}
```

---

### Analytics

#### `GET /api/analytics/overview`

**Purpose:** Get system overview analytics (admin only)

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "users": {
    "total": 500,
    "learners": 450,
    "instructors": 40,
    "admins": 10
  },
  "courses": {
    "total": 83,
    "published": 65,
    "draft": 15,
    "archived": 3
  },
  "learningPlans": {
    "total": 25,
    "published": 20
  },
  "enrollments": {
    "total": 2000,
    "active": 500,
    "completed": 1200,
    "dropped": 300
  },
  "recentActivity": [
    {
      "type": "ENROLLMENT",
      "userId": "user-id",
      "courseId": "course-id",
      "timestamp": "2025-12-09T10:00:00Z"
    }
  ]
}
```

---

#### `GET /api/analytics/course/:id`

**Purpose:** Get course analytics

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "courseId": "course-id",
  "enrollments": {
    "total": 150,
    "active": 45,
    "completed": 80,
    "dropped": 25
  },
  "completionRate": 53.3,
  "averageScore": 85.5,
  "averageTimeToComplete": 95,
  "contentItems": [
    {
      "id": "content-id",
      "title": "Introduction Video",
      "type": "VIDEO",
      "completionRate": 92.5,
      "averageWatchTime": 450,
      "timesWatched": 138
    }
  ],
  "tests": [
    {
      "id": "test-id",
      "title": "Final Exam",
      "attempts": 120,
      "passRate": 78.3,
      "averageScore": 82.5
    }
  ],
  "enrollmentTrends": [
    {
      "date": "2025-12-01",
      "count": 10
    }
  ]
}
```

---

#### `GET /api/analytics/learning-plan/:id`

**Purpose:** Get learning plan analytics

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "learningPlanId": "plan-id",
  "enrollments": {
    "total": 200,
    "active": 50,
    "completed": 120
  },
  "completionRate": 60,
  "courses": [
    {
      "courseId": "course-id",
      "title": "Introduction to Web Development",
      "completionRate": 80,
      "averageScore": 85
    }
  ]
}
```

---

#### `GET /api/analytics/user/:id`

**Purpose:** Get user analytics (admin or self)

**Authentication:** Required (Admin or self)

**Response (200):**
```json
{
  "userId": "user-id",
  "enrollments": {
    "total": 10,
    "completed": 7,
    "inProgress": 2,
    "dropped": 1
  },
  "averageScore": 88.5,
  "totalTimeSpent": 1200, // minutes
  "certificatesEarned": 5,
  "badgesEarned": 3,
  "recentCompletions": [
    {
      "courseId": "course-id",
      "courseTitle": "Introduction to Web Development",
      "completedAt": "2025-12-05T10:00:00Z",
      "score": 90
    }
  ]
}
```

---

#### `GET /api/analytics/test/:id`

**Purpose:** Get test analytics

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "testId": "test-id",
  "totalAttempts": 120,
  "passRate": 78.3,
  "averageScore": 82.5,
  "averageTimeSpent": 45,
  "questionPerformance": [
    {
      "questionId": "question-id",
      "questionText": "What is the capital of France?",
      "totalAttempts": 120,
      "correctAttempts": 95,
      "correctRate": 79.2
    }
  ],
  "scoreDistribution": {
    "0-50": 5,
    "50-60": 10,
    "60-70": 15,
    "70-80": 25,
    "80-90": 35,
    "90-100": 30
  },
  "attemptsOverTime": [
    {
      "date": "2025-12-01",
      "count": 10,
      "averageScore": 85
    }
  ]
}
```

---

#### `GET /api/analytics/video/:id`

**Purpose:** Get video analytics

**Authentication:** Required (Instructor assigned or Admin)

**Response (200):**
```json
{
  "contentItemId": "content-id",
  "totalViews": 150,
  "uniqueViewers": 120,
  "averageWatchTime": 450, // seconds
  "averageCompletionRate": 75.5,
  "completionRate": 92.5,
  "dropOffPoints": [
    {
      "time": 120, // seconds
      "viewers": 10
    }
  ],
  "watchTimeDistribution": [
    {
      "range": "0-25%",
      "viewers": 5
    },
    {
      "range": "25-50%",
      "viewers": 10
    },
    {
      "range": "50-75%",
      "viewers": 20
    },
    {
      "range": "75-100%",
      "viewers": 85
    }
  ]
}
```

---

#### `POST /api/analytics/export`

**Purpose:** Export analytics to CSV

**Authentication:** Required (Instructor or Admin)

**Request:**
```json
{
  "type": "COURSE", // "COURSE", "LEARNING_PLAN", "TEST", "USER", "VIDEO"
  "entityId": "course-id",
  "format": "CSV"
}
```

**Response (200):**
- Content-Type: `text/csv`
- File download with CSV data

---

### Notifications

#### `GET /api/notifications`

**Purpose:** Get user notifications

**Authentication:** Required

**Query Parameters:**
- `read` (boolean) - Filter by read/unread
- `page` (number)
- `limit` (number)

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "notification-id",
      "type": "ENROLLMENT",
      "title": "Enrollment Confirmed",
      "message": "You have been enrolled in 'Introduction to Web Development'",
      "link": "/courses/course-id",
      "read": false,
      "createdAt": "2025-12-09T10:00:00Z"
    }
  ],
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25
  }
}
```

---

#### `PUT /api/notifications/:id/read`

**Purpose:** Mark notification as read

**Authentication:** Required

**Response (200):**
```json
{
  "notification": {
    "id": "notification-id",
    "read": true,
    "readAt": "2025-12-09T10:30:00Z"
  }
}
```

---

#### `PUT /api/notifications/read-all`

**Purpose:** Mark all notifications as read

**Authentication:** Required

**Response (200):**
```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

---

#### `DELETE /api/notifications/:id`

**Purpose:** Delete notification

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Notification deleted successfully"
}
```

---

### Categories & Tags

#### `GET /api/categories`

**Purpose:** List categories

**Authentication:** Required

**Response (200):**
```json
{
  "categories": [
    {
      "id": "cat-id",
      "name": "Web Development",
      "description": "Courses related to web development",
      "parentId": null,
      "order": 1,
      "courseCount": 25,
      "learningPlanCount": 5
    }
  ]
}
```

---

#### `POST /api/categories`

**Purpose:** Create category (admin only)

**Authentication:** Required (Admin)

**Request:**
```json
{
  "name": "Web Development",
  "description": "Courses related to web development",
  "parentId": null,
  "order": 1
}
```

**Response (201):**
```json
{
  "category": {
    "id": "cat-id",
    "name": "Web Development",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

---

### Groups

#### `GET /api/groups`

**Purpose:** List groups

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "groups": [
    {
      "id": "group-id",
      "name": "Staff",
      "type": "STAFF",
      "description": "Internal staff members",
      "memberCount": 50,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

#### `POST /api/groups`

**Purpose:** Create group (admin only)

**Authentication:** Required (Admin)

**Request:**
```json
{
  "name": "External Users",
  "type": "EXTERNAL",
  "description": "External users group"
}
```

**Response (201):**
```json
{
  "group": {
    "id": "group-id",
    "name": "External Users",
    "createdAt": "2025-12-09T10:00:00Z"
  }
}
```

---

#### `POST /api/groups/:id/members`

**Purpose:** Add member to group

**Authentication:** Required (Admin)

**Request:**
```json
{
  "userId": "user-id"
}
```

**Response (200):**
```json
{
  "message": "Member added to group"
}
```

---

### Certificates

#### `GET /api/certificates/:completionId`

**Purpose:** Generate/download certificate

**Authentication:** Required (must own completion or admin)

**Response (200):**
- Content-Type: `application/pdf`
- File download with certificate PDF

---

### System

#### `GET /api/system/settings`

**Purpose:** Get system settings (admin only)

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "selfRegistration": {
    "enabled": true,
    "emailVerification": false
  },
  "password": {
    "resetEnabled": false,
    "complexityRequired": true,
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false
  },
  "accountLockout": {
    "enabled": false,
    "maxAttempts": 5,
    "lockoutDuration": 30 // minutes
  },
  "email": {
    "smtpEnabled": false,
    "smtpHost": "",
    "smtpPort": 587,
    "smtpUser": "",
    "smtpPassword": "",
    "fromEmail": ""
  },
  "sso": {
    "enabled": false,
    "provider": "LDAP",
    "config": {}
  }
}
```

---

#### `PUT /api/system/settings`

**Purpose:** Update system settings (admin only)

**Authentication:** Required (Admin)

**Request:**
```json
{
  "selfRegistration": {
    "enabled": true,
    "emailVerification": false
  },
  "password": {
    "complexityRequired": true,
    "minLength": 8
  }
}
```

**Response (200):**
```json
{
  "message": "Settings updated successfully"
}
```

---

#### `GET /api/system/audit-logs`

**Purpose:** Get audit logs (admin only)

**Authentication:** Required (Admin)

**Query Parameters:**
- `userId` (string)
- `entityType` (string)
- `entityId` (string)
- `action` (string)
- `page` (number)
- `limit` (number)
- `startDate` (ISO date)
- `endDate` (ISO date)

**Response (200):**
```json
{
  "logs": [
    {
      "id": "log-id",
      "userId": "user-id",
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "action": "CREATE",
      "entityType": "COURSE",
      "entityId": "course-id",
      "changes": {
        "title": "New Course"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-12-09T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000
  }
}
```

---

## WebSocket Events (Optional)

If WebSocket support is implemented for real-time updates:

### Connection

**URL:** `ws://localhost:3000/ws` (development)  
**Authentication:** JWT token in query parameter: `?token=jwt-token`

### Events

#### `progress:update`
**Purpose:** Real-time video progress updates

**Client → Server:**
```json
{
  "type": "progress:update",
  "contentItemId": "content-id",
  "watchTime": 300,
  "lastPosition": 0.5
}
```

**Server → Client:**
```json
{
  "type": "progress:update",
  "contentItemId": "content-id",
  "completed": false,
  "unlockedNext": false
}
```

#### `notification:new`
**Purpose:** New notification received

**Server → Client:**
```json
{
  "type": "notification:new",
  "notification": {
    "id": "notification-id",
    "title": "New Enrollment",
    "message": "You have been enrolled in...",
    "link": "/courses/course-id"
  }
}
```

---

This API specification provides a complete reference for all endpoints in the LMS system. Each endpoint includes authentication requirements, request/response formats, and error handling.

