# Database Schema

Complete database schema documentation for the LMS application.

## Overview

The LMS uses PostgreSQL as the database with Prisma ORM for type-safe database access. The schema includes 20+ models covering users, courses, enrollments, progress tracking, assessments, and more.

## Core Models

### User Management

#### User
Stores user account information.

**Fields:**
- `id` (String, Primary Key) - Unique user identifier
- `email` (String, Unique) - User email address
- `passwordHash` (String) - Hashed password
- `firstName` (String) - User's first name
- `lastName` (String) - User's last name
- `bio` (String, Optional) - User biography
- `avatar` (String, Optional) - Avatar image URL
- `emailVerified` (Boolean) - Email verification status
- `createdAt` (DateTime) - Account creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Relations:**
- `roles` - UserRole[] (many-to-many with Role)
- `createdCourses` - Course[] (courses created by user)
- `enrollments` - Enrollment[] (user enrollments)
- `testAttempts` - TestAttempt[] (test attempts)

#### Role
Defines system roles.

**Fields:**
- `id` (String, Primary Key)
- `name` (String, Unique) - Role name (ADMIN, INSTRUCTOR, LEARNER)
- `description` (String, Optional)
- `permissions` (Json) - Array of permission strings

#### UserRole
Junction table for user-role relationships.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `roleId` (String, Foreign Key)
- `assignedAt` (DateTime)

### Course Management

#### Course
Main course entity.

**Fields:**
- `id` (String, Primary Key)
- `title` (String) - Course title
- `description` (String) - Full description
- `shortDescription` (String, Optional) - Brief description
- `thumbnail` (String, Optional) - Thumbnail image URL
- `status` (String) - DRAFT, PUBLISHED, ARCHIVED
- `type` (String) - E-LEARNING, IN_PERSON, HYBRID
- `publicAccess` (Boolean) - Public visibility
- `selfEnrollment` (Boolean) - Allow self-enrollment
- `estimatedTime` (Int, Optional) - Estimated completion time (minutes)
- `difficultyLevel` (String, Optional) - BEGINNER, INTERMEDIATE, ADVANCED
- `categoryId` (String, Optional, Foreign Key)
- `createdById` (String, Foreign Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relations:**
- `category` - Category (optional)
- `createdBy` - User
- `contentItems` - ContentItem[]
- `enrollments` - Enrollment[]
- `instructorAssignments` - InstructorAssignment[]

#### ContentItem
Content within a course (videos, PDFs, tests).

**Fields:**
- `id` (String, Primary Key)
- `courseId` (String, Foreign Key)
- `title` (String)
- `description` (String, Optional)
- `type` (String) - VIDEO, PDF, PPT, TEST, FILE
- `order` (Int) - Display order
- `priority` (Int) - Priority level
- `required` (Boolean) - Required for completion
- `completionThreshold` (Float) - Completion percentage (0-1)
- `allowSeeking` (Boolean) - Allow video seeking
- `url` (String, Optional) - Content URL
- `fileId` (String, Optional) - Associated file ID
- `testId` (String, Optional, Foreign Key) - Associated test
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relations:**
- `course` - Course
- `test` - Test (optional)

#### LearningPlan
Collection of courses organized as a learning path.

**Fields:**
- `id` (String, Primary Key)
- `code` (String, Optional, Unique)
- `title` (String)
- `description` (String)
- `shortDescription` (String, Optional)
- `coverImage` (String, Optional) - Used for both thumbnail and cover image display
- `status` (String) - DRAFT, PUBLISHED, ARCHIVED
- `publicAccess` (Boolean)
- `selfEnrollment` (Boolean)
- `requiresApproval` (Boolean)
- `hasCertificate` (Boolean)
- `hasBadge` (Boolean)
- `estimatedTime` (Int, Optional)
- `difficultyLevel` (String, Optional)
- `categoryId` (String, Optional, Foreign Key)
- `createdById` (String, Foreign Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relations:**
- `category` - Category (optional)
- `createdBy` - User
- `courses` - LearningPlanCourse[]
- `enrollments` - Enrollment[]

### Enrollment & Progress

#### Enrollment
User enrollment in courses or learning plans.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `courseId` (String, Optional, Foreign Key)
- `learningPlanId` (String, Optional, Foreign Key)
- `status` (String) - PENDING, ACTIVE, COMPLETED, CANCELLED
- `enrolledAt` (DateTime)
- `startedAt` (DateTime, Optional)
- `completedAt` (DateTime, Optional)
- `dueDate` (DateTime, Optional)
- `progress` (Float, Optional) - Completion percentage

**Relations:**
- `user` - User
- `course` - Course (optional)
- `learningPlan` - LearningPlan (optional)

#### VideoProgress
Tracks video watching progress.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `contentItemId` (String, Foreign Key)
- `watchTime` (Int) - Seconds watched
- `totalDuration` (Int) - Total video duration (seconds)
- `lastPosition` (Float) - Last playback position (0-1)
- `timesWatched` (Int) - Number of times watched
- `completed` (Boolean) - Completion status
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### Completion
Records course or learning plan completion.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `courseId` (String, Optional, Foreign Key)
- `learningPlanId` (String, Optional, Foreign Key)
- `completedAt` (DateTime)
- `score` (Float, Optional) - Final score
- `certificateUrl` (String, Optional) - Certificate URL

### Assessment System

#### Test
Assessment/test entity.

**Fields:**
- `id` (String, Primary Key)
- `contentItemId` (String, Foreign Key)
- `title` (String)
- `description` (String, Optional)
- `timeLimit` (Int, Optional) - Time limit in seconds
- `maxAttempts` (Int, Optional) - Maximum attempts allowed
- `passingScore` (Float) - Passing score (0-100)
- `shuffleQuestions` (Boolean) - Shuffle question order
- `showResults` (Boolean) - Show results after submission
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relations:**
- `contentItem` - ContentItem
- `questions` - Question[]
- `attempts` - TestAttempt[]

#### Question
Test question entity.

**Fields:**
- `id` (String, Primary Key)
- `testId` (String, Foreign Key)
- `type` (String) - SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, FILL_BLANK
- `question` (String) - Question text
- `options` (Json, Optional) - Answer options (for choice questions)
- `correctAnswer` (Json) - Correct answer(s)
- `points` (Float) - Points for correct answer
- `order` (Int) - Display order
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relations:**
- `test` - Test
- `answers` - TestAnswer[]

#### TestAttempt
User's test attempt.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `testId` (String, Foreign Key)
- `score` (Float, Optional) - Attempt score
- `timeSpent` (Int) - Time spent in seconds
- `passed` (Boolean) - Pass/fail status
- `submittedAt` (DateTime)
- `createdAt` (DateTime)

**Relations:**
- `user` - User
- `test` - Test
- `answers` - TestAnswer[]

#### TestAnswer
Individual question answer in a test attempt.

**Fields:**
- `id` (String, Primary Key)
- `attemptId` (String, Foreign Key)
- `questionId` (String, Foreign Key)
- `answer` (Json) - User's answer
- `isCorrect` (Boolean) - Whether answer is correct
- `points` (Float) - Points awarded

### File Management

#### RepositoryFile
Stored file metadata.

**Fields:**
- `id` (String, Primary Key)
- `courseId` (String, Optional, Foreign Key)
- `fileName` (String)
- `filePath` (String) - File system path
- `fileSize` (Int) - File size in bytes
- `mimeType` (String) - MIME type
- `folderPath` (String, Optional) - Folder path
- `uploadedById` (String, Foreign Key)
- `createdAt` (DateTime)

### Categories & Organization

#### Category
Course and learning plan categories.

**Fields:**
- `id` (String, Primary Key)
- `name` (String)
- `description` (String, Optional)
- `parentId` (String, Optional, Foreign Key) - Parent category
- `order` (Int) - Display order
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relations:**
- `parent` - Category (optional)
- `children` - Category[]
- `courses` - Course[]
- `learningPlans` - LearningPlan[]

### Notifications

#### Notification
User notifications.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Foreign Key)
- `type` (String) - Notification type
- `title` (String)
- `message` (String)
- `read` (Boolean) - Read status
- `readAt` (DateTime, Optional)
- `createdAt` (DateTime)

### Certificates

#### CertificateTemplate
Certificate template for generation.

**Fields:**
- `id` (String, Primary Key)
- `name` (String)
- `layout` (String) - LANDSCAPE, PORTRAIT
- `fields` (Json) - Field positions and configuration
- `isDefault` (Boolean) - Default template flag
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### System

#### AuditLog
System audit log for tracking changes.

**Fields:**
- `id` (String, Primary Key)
- `userId` (String, Optional, Foreign Key)
- `action` (String) - Action type (CREATE, UPDATE, DELETE)
- `entityType` (String) - Entity type
- `entityId` (String) - Entity ID
- `changes` (Json, Optional) - Change details
- `ipAddress` (String, Optional)
- `userAgent` (String, Optional)
- `createdAt` (DateTime)

## Relationships Summary

- **User ↔ Role:** Many-to-many via UserRole
- **User → Course:** One-to-many (created courses)
- **Course → ContentItem:** One-to-many
- **Course → Enrollment:** One-to-many
- **User → Enrollment:** One-to-many
- **LearningPlan → Course:** Many-to-many via LearningPlanCourse
- **ContentItem → Test:** One-to-one (optional)
- **Test → Question:** One-to-many
- **User → TestAttempt:** One-to-many
- **TestAttempt → TestAnswer:** One-to-many
- **Question → TestAnswer:** One-to-many

## Indexes

Key indexes for performance:
- `User.email` - Unique index
- `Enrollment.userId` - Index for user enrollments
- `Enrollment.courseId` - Index for course enrollments
- `VideoProgress.userId` - Index for user progress
- `TestAttempt.userId` - Index for user attempts

## Migrations

Database migrations are managed through Prisma:

```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Seed Data

Default seed data includes:
- Three roles: ADMIN, INSTRUCTOR, LEARNER
- One admin user: `admin@lms.com` / `admin123`

Run seed: `npx prisma db seed`

