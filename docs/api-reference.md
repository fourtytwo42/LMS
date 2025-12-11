# API Reference

Complete API endpoint documentation for the LMS application.

## Base URL

All API endpoints are prefixed with `/api`

## Authentication

Most endpoints require authentication via JWT token stored in HTTP-only cookie.

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "user_id",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@lms.com",
  "password": "admin123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_id",
    "email": "admin@lms.com",
    "firstName": "Admin",
    "lastName": "User",
    "roles": ["ADMIN"]
  }
}
```

**Sets HTTP-only cookie:** `accessToken`

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Response:** `200 OK`
```json
{
  "user": { ... }
}
```

#### POST /api/auth/logout
Logout and clear tokens.

**Response:** `200 OK`

#### GET /api/auth/me
Get current authenticated user.

**Response:** `200 OK`
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["LEARNER"]
}
```

## User Management

### GET /api/users
List all users (Admin only).

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by name or email
- `role` - Filter by role

**Response:** `200 OK`
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### POST /api/users
Create a new user (Admin only).

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "SecurePass123",
  "roles": ["LEARNER"]
}
```

### GET /api/users/:id
Get user by ID.

**Response:** `200 OK`
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["LEARNER"],
  "createdAt": "2025-12-11T00:00:00Z"
}
```

### PUT /api/users/:id
Update user (Admin or own profile).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "bio": "Updated bio",
  "avatar": "https://example.com/avatar.jpg"
}
```

### DELETE /api/users/:id
Delete user (Admin only).

**Response:** `200 OK`

## Course Management

### GET /api/courses
List courses with filtering and pagination.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `search` - Search query
- `status` - Filter by status (DRAFT, PUBLISHED, ARCHIVED)
- `type` - Filter by type (E-LEARNING, IN_PERSON, HYBRID)
- `categoryId` - Filter by category
- `publicAccess` - Filter by public access
- `selfEnrollment` - Filter by self-enrollment

**Response:** `200 OK`
```json
{
  "courses": [...],
  "pagination": { ... }
}
```

### POST /api/courses
Create a new course (Instructor/Admin).

**Request Body:**
```json
{
  "title": "Introduction to React",
  "description": "Learn React fundamentals",
  "shortDescription": "React basics",
  "type": "E-LEARNING",
  "categoryId": "category_id",
  "publicAccess": true,
  "selfEnrollment": true
}
```

### GET /api/courses/:id
Get course by ID.

**Response:** `200 OK`
```json
{
  "id": "course_id",
  "title": "Introduction to React",
  "description": "...",
  "status": "PUBLISHED",
  "category": { ... },
  "contentItems": [...],
  "enrollmentCount": 50
}
```

### PUT /api/courses/:id
Update course (Instructor/Admin).

### DELETE /api/courses/:id
Delete course (Admin only).

### POST /api/courses/:id/publish
Publish a course (Instructor/Admin).

### POST /api/courses/:id/archive
Archive a course (Instructor/Admin).

## Enrollment Management

### GET /api/enrollments
List enrollments with filtering.

**Query Parameters:**
- `userId` - Filter by user
- `courseId` - Filter by course
- `learningPlanId` - Filter by learning plan
- `status` - Filter by status (PENDING, ACTIVE, COMPLETED, CANCELLED)
- `page` - Page number
- `limit` - Items per page

### POST /api/enrollments
Create enrollment (Instructor/Admin).

**Request Body:**
```json
{
  "userId": "user_id",
  "courseId": "course_id",
  "dueDate": "2025-12-31"
}
```

### POST /api/enrollments/self
Self-enroll in a course or learning plan.

**Request Body:**
```json
{
  "courseId": "course_id"
}
```

### POST /api/enrollments/:id/approve
Approve pending enrollment (Instructor/Admin).

### DELETE /api/enrollments/:id
Cancel enrollment.

## Progress Tracking

### GET /api/progress/video/:contentItemId
Get video progress for a content item.

**Response:** `200 OK`
```json
{
  "watchTime": 300,
  "totalDuration": 600,
  "lastPosition": 0.5,
  "timesWatched": 1,
  "completed": false
}
```

### POST /api/progress/video
Update video progress.

**Request Body:**
```json
{
  "contentItemId": "content_id",
  "watchTime": 300,
  "totalDuration": 600,
  "lastPosition": 0.5
}
```

### POST /api/progress/test
Submit test attempt and get results.

**Request Body:**
```json
{
  "testId": "test_id",
  "answers": [
    {
      "questionId": "question_id",
      "answer": "answer_text"
    }
  ],
  "timeSpent": 300
}
```

**Response:** `200 OK`
```json
{
  "score": 85,
  "totalQuestions": 10,
  "correctAnswers": 8.5,
  "passed": true,
  "canRetake": true
}
```

## File Management

### POST /api/files/upload
Upload a file.

**Request:** `multipart/form-data`
- `file` - File to upload
- `type` - File type (VIDEO, PDF, PPT, AVATAR, THUMBNAIL, COVER, REPOSITORY)
- `courseId` - Optional course ID
- `contentItemId` - Optional content item ID

**Response:** `200 OK`
```json
{
  "file": {
    "id": "file_id",
    "fileName": "video.mp4",
    "fileSize": 1048576,
    "mimeType": "video/mp4",
    "url": "/api/files/file_id/download"
  }
}
```

### GET /api/files/:id/download
Download a file.

**Response:** File stream

### GET /api/files/:id
Get file metadata.

### DELETE /api/files/:id
Delete a file (Admin/Instructor).

## Analytics

### GET /api/analytics/overview
Get system-wide analytics (Admin).

**Response:** `200 OK`
```json
{
  "users": {
    "total": 100,
    "active": 80
  },
  "courses": {
    "total": 50,
    "published": 40
  },
  "enrollments": {
    "total": 500,
    "active": 300,
    "completed": 150
  }
}
```

### GET /api/analytics/course/:id
Get course-specific analytics.

### GET /api/analytics/test/:id
Get test analytics.

### GET /api/analytics/user/:id
Get user analytics.

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input",
  "details": [...]
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

## Rate Limiting

Currently, there is no rate limiting implemented. Consider adding rate limiting for production use.

## Versioning

API versioning is not currently implemented. All endpoints are under `/api` without version prefixes.

