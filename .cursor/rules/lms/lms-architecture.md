# LMS - Detailed Architecture

**Complete system architecture, database schema, component design, and technology specifications for the Learning Management System.**

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema](#database-schema)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Component Architecture](#component-architecture)
5. [Data Flow & State Management](#data-flow--state-management)
6. [File Storage Architecture](#file-storage-architecture)
7. [Video Streaming Architecture](#video-streaming-architecture)
8. [Assessment Engine Architecture](#assessment-engine-architecture)
9. [Analytics & Reporting Architecture](#analytics--reporting-architecture)
10. [Security Architecture](#security-architecture)
11. [Performance Considerations](#performance-considerations)
12. [Scalability Strategy](#scalability-strategy)

## System Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Learner    │  │  Instructor  │  │   Admin      │          │
│  │   Dashboard  │  │  Dashboard   │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                            │
│                    │  Next.js App   │                            │
│                    │  (App Router)  │                            │
│                    └───────┬────────┘                            │
└────────────────────────────┼────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼────────┐  ┌───────▼──────────┐
         │   API Routes     │  │  Server          │
         │   (Backend)      │  │  Components     │
         └──────────┬────────┘  └──────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐  ┌──────▼──────┐  ┌───▼──────┐
│Prisma  │  │  File System│  │  SMTP    │
│Client  │  │  Storage    │  │  Service │
└───┬────┘  └─────────────┘  └──────────┘
    │
┌───▼──────────┐
│  PostgreSQL  │
│  Database    │
└──────────────┘
```

### Technology Stack

**Frontend:**
- **Framework:** Next.js 16.0.8 (App Router) - Updated from 15.x
- **UI Library:** React 19.2.1
- **Styling:** Tailwind CSS 4.1.17 (with `@import "tailwindcss"` syntax, dark mode support)
- **Icons:** Lucide React 0.556.0 (modern, consistent icon set with unique icons per menu item)
- **Forms:** React Hook Form 7.68.0 + Zod 4.1.13
- **State Management:** Zustand 5.0.9 (client state), React Server Components (server state), React Context (theme)
- **Charts:** Recharts 3.5.1 (for analytics dashboards)
- **Video Player:** Custom HTML5 player with progress tracking, duration detection, and stored duration support
- **PDF Viewer:** react-pdf 10.2.0 (inline viewer with page navigation)
- **PPT Viewer:** Download/open support (no native viewer, opens in external application)
- **Theme System:** Dark/light mode toggle with localStorage persistence

**Backend:**
- **Runtime:** Node.js 20.x LTS
- **Framework:** Next.js 16.0.8 API Routes (with async route params)
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 6.19.0 (updated from 5.x)
- **Authentication:** Custom JWT implementation (jsonwebtoken 9.0.3)
- **Password Hashing:** bcryptjs 3.0.3
- **File Upload:** formidable 3.5.4
- **Email:** nodemailer 7.0.11 (for SMTP)

**Infrastructure:**
- **Hosting:** Ubuntu 22.04 LTS VM (U-225VM)
- **Database:** PostgreSQL on same VM
- **Storage:** Local filesystem (organized directory structure)
- **Reverse Proxy:** Nginx (for production)
- **Process Manager:** PM2 (configured and running in production)
- **Deployment Status:** ✅ Production deployment complete

## Database Schema

### Core Tables

#### Users Table

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  avatar        String?   // URL to avatar image
  bio           String?
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  
  // Roles
  roles         UserRole[]
  
  // Enrollments
  enrollments  Enrollment[]
  
  // Progress tracking
  videoProgress VideoProgress[]
  testAttempts  TestAttempt[]
  completions   Completion[]
  
  // Created content (instructors/admins)
  createdCourses      Course[]         @relation("CourseCreator")
  createdLearningPlans LearningPlan[]  @relation("LearningPlanCreator")
  
  // Assigned as instructor
  instructorAssignments InstructorAssignment[]
  
  // Notifications
  notifications Notification[]
  
  // Audit trail
  auditLogs     AuditLog[]
  
  @@index([email])
  @@index([createdAt])
}
```

#### Roles Table

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique // "LEARNER", "INSTRUCTOR", "ADMIN"
  description String?
  permissions String[] // Array of permission strings
  
  users       UserRole[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### UserRole Junction Table

```prisma
model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
}
```

#### Groups Table (for group-based access)

```prisma
model Group {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        String   // "STAFF", "EXTERNAL", "CUSTOM"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  members     GroupMember[]
  courseAccess CourseGroupAccess[]
  learningPlanAccess LearningPlanGroupAccess[]
  
  @@index([name])
}
```

#### GroupMember Junction Table

```prisma
model GroupMember {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  joinedAt  DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([userId, groupId])
  @@index([userId])
  @@index([groupId])
}
```

#### Learning Plans Table

```prisma
model LearningPlan {
  id                String   @id @default(cuid())
  code              String?  @unique
  title             String
  shortDescription  String?  @db.VarChar(130)
  description       String   @db.Text
  thumbnail         String?  // URL to thumbnail image
  coverImage        String?  // URL to cover image
  status            String   @default("DRAFT") // "DRAFT", "PUBLISHED", "ARCHIVED"
  estimatedTime     Int?     // Minutes
  difficultyLevel   String?  // "BEGINNER", "INTERMEDIATE", "ADVANCED"
  
  // Enrollment settings
  selfEnrollment    Boolean  @default(false)
  requiresApproval Boolean  @default(false)
  maxEnrollments   Int?
  publicAccess     Boolean  @default(false)
  
  // Certificate settings
  hasCertificate   Boolean  @default(false)
  certificateTemplate String? // Template ID or path
  
  // Badge settings
  hasBadge         Boolean  @default(false)
  badgeImage       String?  // URL to badge image
  
  // Metadata
  categoryId       String?
  tags             String[] // Array of tag strings
  featured         Boolean  @default(false)
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  createdById      String
  
  // Relations
  createdBy        User     @relation("LearningPlanCreator", fields: [createdById], references: [id])
  category         Category? @relation(fields: [categoryId], references: [id])
  courses          LearningPlanCourse[]
  enrollments      Enrollment[]
  groupAccess      LearningPlanGroupAccess[]
  ratings          Rating[]
  completions      Completion[]
  versions         LearningPlanVersion[]
  
  @@index([status])
  @@index([createdById])
  @@index([categoryId])
  @@index([publicAccess, selfEnrollment])
}
```

#### LearningPlanCourse Junction Table (with ordering)

```prisma
model LearningPlanCourse {
  id              String   @id @default(cuid())
  learningPlanId  String
  courseId        String
  order           Int      // Order within learning plan
  createdAt       DateTime @default(now())
  
  learningPlan    LearningPlan @relation(fields: [learningPlanId], references: [id], onDelete: Cascade)
  course          Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@unique([learningPlanId, courseId])
  @@index([learningPlanId, order])
  @@index([courseId])
}
```

#### Courses Table

```prisma
model Course {
  id                String   @id @default(cuid())
  code              String?  @unique
  title             String
  shortDescription  String?  @db.VarChar(130)
  description       String   @db.Text
  thumbnail         String?
  coverImage        String?
  status            String   @default("DRAFT") // "DRAFT", "PUBLISHED", "ARCHIVED"
  type              String   @default("E-LEARNING") // "E-LEARNING", "ILT", "VILT"
  estimatedTime     Int?     // Minutes
  difficultyLevel   String?
  
  // Enrollment settings
  selfEnrollment    Boolean  @default(false)
  requiresApproval Boolean  @default(false)
  maxEnrollments   Int?
  publicAccess     Boolean  @default(false)
  
  // Progression settings
  sequentialRequired Boolean @default(true) // Require sequential completion
  allowSkipping      Boolean  @default(false) // Allow learners to skip around
  
  // Metadata
  categoryId       String?
  tags             String[]
  featured         Boolean  @default(false)
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  createdById      String
  
  // Relations
  createdBy        User     @relation("CourseCreator", fields: [createdById], references: [id])
  category         Category? @relation(fields: [categoryId], references: [id])
  learningPlans    LearningPlanCourse[]
  enrollments      Enrollment[]
  groupAccess      CourseGroupAccess[]
  contentItems     ContentItem[]
  repositoryFiles  RepositoryFile[]
  prerequisites    CoursePrerequisite[]
  dependentCourses CoursePrerequisite[] @relation("DependentCourse")
  ratings          Rating[]
  completions      Completion[]
  versions         CourseVersion[]
  instructorAssignments InstructorAssignment[]
  
  @@index([status])
  @@index([createdById])
  @@index([categoryId])
  @@index([publicAccess, selfEnrollment])
}
```

#### CoursePrerequisite Table

```prisma
model CoursePrerequisite {
  id              String   @id @default(cuid())
  courseId        String
  prerequisiteId  String  // Course that must be completed first
  createdAt       DateTime @default(now())
  
  course          Course   @relation("Prerequisite", fields: [courseId], references: [id], onDelete: Cascade)
  prerequisite    Course   @relation("DependentCourse", fields: [prerequisiteId], references: [id], onDelete: Cascade)
  
  @@unique([courseId, prerequisiteId])
  @@index([courseId])
  @@index([prerequisiteId])
}
```

#### Content Items Table (Videos, PDFs, PPTs, Tests)

```prisma
model ContentItem {
  id              String   @id @default(cuid())
  courseId        String
  title           String
  description     String?  @db.Text
  type            String   // "VIDEO", "PDF", "PPT", "TEST", "HTML"
  order           Int      // Order within course
  priority        Int      @default(0) // For sequential unlocking
  required        Boolean  @default(true) // Must complete to finish course
  
  // Video-specific
  videoUrl        String?  // Local file path or external URL
  videoDuration   Int?     // Seconds
  completionThreshold Float @default(0.8) // Percentage watched to complete (0.0-1.0)
  allowSeeking    Boolean  @default(true) // Allow forward/backward seeking
  
  // PDF-specific
  pdfUrl          String?
  pdfPages        Int?
  
  // PPT-specific
  pptUrl          String?
  pptSlides       Int?
  
  // HTML content
  htmlContent     String?  @db.Text
  
  // External content
  externalUrl     String?
  externalType    String?  // "YOUTUBE", "VIMEO", etc.
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  videoProgress   VideoProgress[]
  test            Test?
  
  @@index([courseId, order])
  @@index([courseId, priority])
}
```

#### Tests Table

```prisma
model Test {
  id                    String   @id @default(cuid())
  contentItemId         String   @unique
  title                 String
  description           String?   @db.Text
  
  // Test settings
  passingScore          Float     @default(0.7) // Percentage (0.0-1.0)
  maxAttempts           Int?      // null = unlimited
  timeLimit             Int?      // Minutes, null = no limit
  showCorrectAnswers    Boolean   @default(false)
  randomizeQuestions    Boolean   @default(false)
  randomizeAnswers       Boolean   @default(false)
  
  // Question repository reference
  useQuestionRepository Boolean   @default(false)
  repositoryCategoryId  String?
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  contentItem           ContentItem @relation(fields: [contentItemId], references: [id], onDelete: Cascade)
  questions             Question[]
  attempts              TestAttempt[]
  
  @@index([contentItemId])
}
```

#### Questions Table

```prisma
model Question {
  id              String   @id @default(cuid())
  testId          String?
  repositoryId    String?  // If from question repository
  
  type            String   // "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "FILL_BLANK"
  questionText    String   @db.Text
  points          Float    @default(1.0)
  order           Int
  
  // For multiple choice / single choice
  options         Json?    // Array of { text: string, correct: boolean }
  
  // For true/false
  correctAnswer   Boolean?
  
  // For short answer / fill in blank
  correctAnswers   String[] // Array of acceptable answers (case-insensitive matching)
  caseSensitive    Boolean  @default(false)
  
  // For fill in blank
  blankPositions   Int[]?   // Positions of blanks in question text
  
  explanation      String?  @db.Text // Explanation shown after answer
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  test             Test?    @relation(fields: [testId], references: [id], onDelete: Cascade)
  answers          TestAnswer[]
  
  @@index([testId, order])
  @@index([repositoryId])
}
```

#### Enrollments Table

```prisma
model Enrollment {
  id              String   @id @default(cuid())
  userId          String
  courseId        String?
  learningPlanId  String?
  
  status          String   @default("ENROLLED") // "ENROLLED", "IN_PROGRESS", "COMPLETED", "DROPPED"
  enrollmentType  String   @default("MANUAL") // "MANUAL", "SELF", "GROUP", "AUTO"
  
  // Dates
  enrolledAt      DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  dueDate         DateTime?
  
  // Approval workflow
  requiresApproval Boolean @default(false)
  approvedAt      DateTime?
  approvedById    String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course          Course?  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  learningPlan    LearningPlan? @relation(fields: [learningPlanId], references: [id], onDelete: Cascade)
  approvedBy      User?    @relation("EnrollmentApprover", fields: [approvedById], references: [id])
  
  @@unique([userId, courseId])
  @@unique([userId, learningPlanId])
  @@index([userId])
  @@index([courseId])
  @@index([learningPlanId])
  @@index([status])
}
```

#### Video Progress Table

```prisma
model VideoProgress {
  id              String   @id @default(cuid())
  userId          String
  contentItemId   String
  watchTime       Int      @default(0) // Seconds watched
  totalDuration   Int      // Total video duration in seconds
  lastPosition    Float    @default(0) // Last watched position (0.0-1.0)
  timesWatched    Int      @default(1)
  completed       Boolean  @default(false)
  completedAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  contentItem     ContentItem @relation(fields: [contentItemId], references: [id], onDelete: Cascade)
  
  @@unique([userId, contentItemId])
  @@index([userId])
  @@index([contentItemId])
  @@index([completed])
}
```

#### Test Attempts Table

```prisma
model TestAttempt {
  id              String   @id @default(cuid())
  userId          String
  testId          String
  attemptNumber   Int
  score           Float?   // Calculated score (0.0-1.0)
  pointsEarned    Float    @default(0)
  totalPoints     Float
  passed          Boolean?
  timeSpent       Int      // Seconds
  startedAt       DateTime @default(now())
  submittedAt     DateTime?
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  test            Test     @relation(fields: [testId], references: [id], onDelete: Cascade)
  answers         TestAnswer[]
  
  @@index([userId, testId])
  @@index([testId])
  @@index([submittedAt])
}
```

#### Test Answers Table

```prisma
model TestAnswer {
  id              String   @id @default(cuid())
  attemptId       String
  questionId      String
  answerText      String?  @db.Text // For text-based answers
  selectedOptions Int[]?   // For multiple choice (indices)
  isCorrect       Boolean?
  pointsEarned    Float    @default(0)
  
  createdAt       DateTime @default(now())
  
  attempt         TestAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question        Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)
  
  @@index([attemptId])
  @@index([questionId])
}
```

#### Completions Table

```prisma
model Completion {
  id              String   @id @default(cuid())
  userId          String
  courseId        String?
  learningPlanId  String?
  contentItemId   String?
  
  completedAt     DateTime @default(now())
  score           Float?   // Final score if applicable
  
  // Certificate
  certificateUrl  String?
  certificateGeneratedAt DateTime?
  
  // Badge
  badgeAwarded    Boolean  @default(false)
  badgeAwardedAt  DateTime?
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course          Course?  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  learningPlan    LearningPlan? @relation(fields: [learningPlanId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([courseId])
  @@index([learningPlanId])
  @@index([contentItemId])
  @@index([completedAt])
}
```

#### Repository Files Table

```prisma
model RepositoryFile {
  id              String   @id @default(cuid())
  courseId        String
  fileName        String
  filePath        String   // Relative path from storage root
  fileSize        Int      // Bytes
  mimeType        String
  folderPath      String?  // Relative folder path (null = root)
  order           Int      @default(0)
  
  downloadCount   Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  uploadedById    String
  
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  uploader        User     @relation("FileUploader", fields: [uploadedById], references: [id])
  downloads       FileDownload[]
  
  @@index([courseId])
  @@index([folderPath])
}
```

#### File Downloads Table (for analytics)

```prisma
model FileDownload {
  id              String   @id @default(cuid())
  fileId          String
  userId          String
  downloadedAt    DateTime @default(now())
  
  file            RepositoryFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  user            User     @relation("FileDownloader", fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([fileId])
  @@index([userId])
  @@index([downloadedAt])
}
```

#### Categories Table

```prisma
model Category {
  id              String   @id @default(cuid())
  name            String   @unique
  description     String?
  parentId        String?  // For hierarchical categories
  order           Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  parent          Category? @relation("CategoryParent", fields: [parentId], references: [id])
  children        Category[] @relation("CategoryParent")
  courses         Course[]
  learningPlans   LearningPlan[]
  
  @@index([parentId])
}
```

#### Ratings Table

```prisma
model Rating {
  id              String   @id @default(cuid())
  userId          String
  courseId        String?
  learningPlanId  String?
  rating          Int      // 1-5 stars
  review          String?  @db.Text
  helpfulCount    Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation("Rater", fields: [userId], references: [id], onDelete: Cascade)
  course          Course?  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  learningPlan    LearningPlan? @relation(fields: [learningPlanId], references: [id], onDelete: Cascade)
  
  @@unique([userId, courseId])
  @@unique([userId, learningPlanId])
  @@index([courseId])
  @@index([learningPlanId])
}
```

#### Notifications Table

```prisma
model Notification {
  id              String   @id @default(cuid())
  userId          String
  type            String   // "ENROLLMENT", "COMPLETION", "DEADLINE", "APPROVAL", etc.
  title           String
  message         String   @db.Text
  link            String?  // URL to related content
  read            Boolean  @default(false)
  readAt          DateTime?
  emailSent       Boolean  @default(false)
  emailSentAt     DateTime?
  
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, read])
  @@index([createdAt])
}
```

#### Instructor Assignments Table

```prisma
model InstructorAssignment {
  id              String   @id @default(cuid())
  userId          String
  courseId        String?
  learningPlanId  String?
  assignedAt      DateTime @default(now())
  assignedById    String
  
  user            User     @relation("Instructor", fields: [userId], references: [id], onDelete: Cascade)
  course          Course?  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  learningPlan    LearningPlan? @relation("InstructorLearningPlan", fields: [learningPlanId], references: [id], onDelete: Cascade)
  assignedBy      User     @relation("AssignmentCreator", fields: [assignedById], references: [id])
  
  @@unique([userId, courseId])
  @@unique([userId, learningPlanId])
  @@index([userId])
  @@index([courseId])
  @@index([learningPlanId])
}
```

#### Course/Learning Plan Group Access Table

```prisma
model CourseGroupAccess {
  id              String   @id @default(cuid())
  courseId        String
  groupId         String
  createdAt       DateTime @default(now())
  
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  group           Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([courseId, groupId])
  @@index([courseId])
  @@index([groupId])
}

model LearningPlanGroupAccess {
  id              String   @id @default(cuid())
  learningPlanId  String
  groupId         String
  createdAt       DateTime @default(now())
  
  learningPlan    LearningPlan @relation(fields: [learningPlanId], references: [id], onDelete: Cascade)
  group           Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  @@unique([learningPlanId, groupId])
  @@index([learningPlanId])
  @@index([groupId])
}
```

#### Version History Tables

```prisma
model CourseVersion {
  id              String   @id @default(cuid())
  courseId        String
  versionNumber   Int
  title           String
  description     String   @db.Text
  status          String   // "DRAFT", "PUBLISHED"
  createdById     String
  createdAt       DateTime @default(now())
  publishedAt     DateTime?
  
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdBy       User     @relation("CourseVersionCreator", fields: [createdById], references: [id])
  
  @@index([courseId, versionNumber])
}

model LearningPlanVersion {
  id              String   @id @default(cuid())
  learningPlanId  String
  versionNumber   Int
  title           String
  description     String   @db.Text
  status          String
  createdById     String
  createdAt       DateTime @default(now())
  publishedAt     DateTime?
  
  learningPlan    LearningPlan @relation(fields: [learningPlanId], references: [id], onDelete: Cascade)
  createdBy       User         @relation("LearningPlanVersionCreator", fields: [createdById], references: [id])
  
  @@index([learningPlanId, versionNumber])
}
```

#### Audit Log Table

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  userId          String?
  action          String   // "CREATE", "UPDATE", "DELETE", "ENROLL", "COMPLETE", etc.
  entityType      String   // "COURSE", "LEARNING_PLAN", "USER", etc.
  entityId        String?
  changes         Json?    // JSON object of what changed
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime @default(now())
  
  user            User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

#### Question Repository Table

```prisma
model QuestionRepository {
  id              String   @id @default(cuid())
  name            String
  description     String?   @db.Text
  category        String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdById     String
  
  questions       Question[]
  createdBy       User      @relation("QuestionRepositoryCreator", fields: [createdById], references: [id])
  
  @@index([category])
}
```

#### Central Content Repository Table

```prisma
model ContentRepository {
  id              String   @id @default(cuid())
  name            String
  description     String?   @db.Text
  type            String   // "VIDEO", "PDF", "PPT", "FILE"
  filePath        String
  fileSize        Int
  mimeType        String
  folderPath      String?
  tags            String[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  uploadedById    String
  
  uploadedBy      User      @relation("ContentRepositoryUploader", fields: [uploadedById], references: [id])
  
  @@index([type])
  @@index([uploadedById])
}
```

### Database Indexes Strategy

**Performance Indexes:**
- User lookups: `email`, `createdAt`
- Course/Plan queries: `status`, `publicAccess`, `selfEnrollment`, `categoryId`
- Enrollment queries: `userId`, `courseId`, `learningPlanId`, `status`
- Progress tracking: `userId`, `contentItemId`, `completed`
- Analytics: `completedAt`, `submittedAt`, `downloadedAt`
- Search: Full-text search indexes on `title`, `description` fields

**Composite Indexes:**
- `[userId, courseId]` for enrollment lookups
- `[courseId, order]` for content item ordering
- `[learningPlanId, order]` for course ordering in plans
- `[userId, read]` for notification queries

## User Roles & Permissions

### Role Definitions

**LEARNER:**
- View enrolled courses and learning plans
- Access course content (videos, PDFs, PPTs, tests)
- Take tests and view results (if allowed)
- View own progress and completion records
- Download repository files
- Rate and review courses/learning plans
- Self-enroll in public courses/plans (if enabled)
- Edit own profile (except email)
- View own certificates and badges

**INSTRUCTOR:**
- All LEARNER permissions
- Create and edit courses (assigned or own)
- Create and edit learning plans (assigned or own)
- Upload and manage content (videos, PDFs, PPTs, tests)
- Create and manage tests with questions
- Enroll learners in courses/learning plans
- View analytics for assigned courses/learning plans
- Approve enrollment requests (if assigned)
- Manage repository files for assigned courses
- View test results and progress for assigned content
- Export reports for assigned content

**ADMIN:**
- All INSTRUCTOR permissions
- Create and edit all courses and learning plans
- Assign instructors to courses/learning plans
- Manage all users (create, edit, delete, assign roles)
- Manage groups and group access
- Configure system settings
- View all analytics and reports
- Export all data
- Manage categories and tags
- Configure email settings (SMTP)
- Manage question repository
- Manage central content repository
- View audit logs
- Configure authentication settings (self-registration, password policies, etc.)

### Permission System

Permissions are stored as strings in the `Role.permissions` array. Examples:
- `course:create`
- `course:edit:own`
- `course:edit:all`
- `course:delete:own`
- `course:delete:all`
- `enrollment:create`
- `enrollment:approve`
- `analytics:view:own`
- `analytics:view:all`
- `user:manage`
- `system:configure`

Middleware checks user roles and permissions before allowing actions.

## Component Architecture

### Frontend Components

**Layout Components:**
- `AppLayout` - Main application layout with header, sidebar, footer
- `DashboardLayout` - Dashboard-specific layout
- `AuthLayout` - Authentication pages layout
- `CourseLayout` - Course viewing layout

**Dashboard Components:**
- `LearnerDashboard` - Progress overview, enrolled courses, recommendations
- `InstructorDashboard` - Assigned courses, analytics overview, quick actions
- `AdminDashboard` - System overview, user stats, content stats, recent activity

**Course Components:**
- `CourseCatalog` - Browse and search courses/learning plans
- `CourseCard` - Course card with thumbnail, title, description, enrollment button
- `CourseViewer` - Main course viewing interface
- `ContentItemViewer` - Renders videos, PDFs, PPTs, tests
- `VideoPlayer` - Custom video player with progress tracking
- `PDFViewer` - In-browser PDF viewer
- `PPTViewer` - Slideshow viewer for PowerPoint files
- `TestViewer` - Test taking interface
- `RepositoryViewer` - File repository browser

**Management Components:**
- `CourseEditor` - Create/edit course interface
- `LearningPlanEditor` - Create/edit learning plan interface
- `ContentItemEditor` - Add/edit content items (videos, PDFs, PPTs, tests)
- `TestEditor` - Create/edit tests and questions
- `EnrollmentManager` - Manage enrollments (bulk, individual, dates)
- `UserManager` - User management interface
- `GroupManager` - Group management interface

**Analytics Components:**
- `AnalyticsDashboard` - Overview charts and metrics
- `CourseAnalytics` - Per-course analytics (completion rates, test scores, time spent)
- `LearnerAnalytics` - Per-learner analytics (progress, scores, time spent)
- `TestAnalytics` - Test performance analytics
- `VideoAnalytics` - Video watch time and completion analytics
- `ReportExporter` - Export reports to CSV

**Form Components:**
- `LoginForm` - User login
- `RegisterForm` - User registration
- `ProfileForm` - Edit user profile
- `CourseForm` - Create/edit course
- `TestForm` - Create/edit test
- `QuestionForm` - Create/edit question

**UI Components:**
- `Button` - Reusable button component
- `Input` - Form input component
- `Select` - Dropdown select component
- `Modal` - Modal dialog component
- `Toast` - Toast notification component
- `Table` - Data table component
- `Chart` - Chart wrapper component
- `ProgressBar` - Progress indicator
- `Badge` - Badge/status indicator
- `Avatar` - User avatar component

### Backend API Routes

**Authentication Routes:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

**User Routes:**
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user profile
- `GET /api/users` - List users (admin/instructor)
- `POST /api/users` - Create user (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (admin)
- `DELETE /api/users/:id` - Delete user (admin)
- `POST /api/users/bulk-import` - Bulk import users (admin)
- `GET /api/users/bulk-export` - Export users to CSV (admin)

**Course Routes:**
- `GET /api/courses` - List courses (with filters)
- `POST /api/courses` - Create course (instructor/admin)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course (instructor/admin)
- `DELETE /api/courses/:id` - Delete course (admin)
- `GET /api/courses/:id/analytics` - Get course analytics
- `POST /api/courses/:id/publish` - Publish course
- `POST /api/courses/:id/archive` - Archive course

**Learning Plan Routes:**
- `GET /api/learning-plans` - List learning plans
- `POST /api/learning-plans` - Create learning plan (instructor/admin)
- `GET /api/learning-plans/:id` - Get learning plan details
- `PUT /api/learning-plans/:id` - Update learning plan
- `DELETE /api/learning-plans/:id` - Delete learning plan (admin)
- `POST /api/learning-plans/:id/courses` - Add course to plan
- `DELETE /api/learning-plans/:id/courses/:courseId` - Remove course from plan
- `PUT /api/learning-plans/:id/courses/order` - Reorder courses in plan

**Content Item Routes:**
- `GET /api/courses/:courseId/content` - List content items
- `POST /api/courses/:courseId/content` - Add content item
- `GET /api/content/:id` - Get content item
- `PUT /api/content/:id` - Update content item
- `DELETE /api/content/:id` - Delete content item
- `PUT /api/content/:id/order` - Update content item order/priority

**Enrollment Routes:**
- `GET /api/enrollments` - List enrollments (filtered by user/course/plan)
- `POST /api/enrollments` - Create enrollment
- `POST /api/enrollments/self` - Self-enroll
- `POST /api/enrollments/bulk` - Bulk enroll
- `GET /api/enrollments/:id` - Get enrollment details
- `PUT /api/enrollments/:id` - Update enrollment
- `DELETE /api/enrollments/:id` - Remove enrollment
- `POST /api/enrollments/:id/approve` - Approve enrollment request

**Progress Routes:**
- `GET /api/progress/course/:courseId` - Get course progress
- `GET /api/progress/learning-plan/:planId` - Get learning plan progress
- `POST /api/progress/video` - Update video progress
- `GET /api/progress/video/:contentItemId` - Get video progress
- `POST /api/progress/test` - Submit test attempt
- `GET /api/progress/test/:testId` - Get test attempts and scores

**Test Routes:**
- `GET /api/tests/:id` - Get test details
- `POST /api/tests` - Create test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test
- `GET /api/tests/:id/questions` - Get test questions
- `POST /api/tests/:id/questions` - Add question to test
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `GET /api/tests/:id/analytics` - Get test analytics

**File Routes:**
- `POST /api/files/upload` - Upload file (video, PDF, PPT, repository file)
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file
- `POST /api/files/folder` - Create folder
- `GET /api/files/repository/:courseId` - Get repository files
- `POST /api/files/bulk-upload` - Bulk upload files

**Analytics Routes:**
- `GET /api/analytics/overview` - System overview analytics (admin)
- `GET /api/analytics/course/:id` - Course analytics
- `GET /api/analytics/learning-plan/:id` - Learning plan analytics
- `GET /api/analytics/user/:id` - User analytics
- `GET /api/analytics/test/:id` - Test analytics
- `GET /api/analytics/video/:id` - Video analytics
- `POST /api/analytics/export` - Export analytics to CSV

**Notification Routes:**
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification
- `PUT /api/notifications/read-all` - Mark all as read

**Category/Tag Routes:**
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

**Group Routes:**
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group (admin)
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group (admin)
- `DELETE /api/groups/:id` - Delete group (admin)
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members/:userId` - Remove member from group

**Repository Routes:**
- `GET /api/repository/questions` - List question repository items
- `POST /api/repository/questions` - Add to question repository
- `GET /api/repository/content` - List content repository items
- `POST /api/repository/content` - Add to content repository
- `GET /api/repository/content/:id` - Get content repository item

**Certificate Routes:**
- `GET /api/certificates/:completionId` - Generate/download certificate
- `POST /api/certificates/template` - Create certificate template (admin)
- `GET /api/certificates/templates` - List certificate templates

**System Routes:**
- `GET /api/system/settings` - Get system settings (admin)
- `PUT /api/system/settings` - Update system settings (admin)
- `GET /api/system/audit-logs` - Get audit logs (admin)

## Data Flow & State Management

### Server-Side State (Database)

**Source of Truth:** PostgreSQL database via Prisma
- All persistent data stored in database
- Prisma Client provides type-safe access
- Transactions ensure data consistency

### Client-Side State Management

**Zustand Stores:**
- `authStore` - Authentication state (user, token, roles)
- `uiStore` - UI state (sidebar open/closed, theme, notifications)
- `courseStore` - Current course viewing state
- `progressStore` - Client-side progress tracking (optimistic updates)

**React Server Components:**
- Initial page loads use Server Components
- Data fetched directly from database
- No client-side JavaScript for static content

**React Query / SWR (Optional):**
- For client-side data fetching and caching
- Automatic refetching and cache invalidation
- Optimistic updates for better UX

### Real-Time Updates

**Video Progress:**
- Polling: Client polls progress API every 5-10 seconds
- WebSocket (Optional): Real-time progress updates via WebSocket
- Debouncing: Batch progress updates to reduce API calls

**Notifications:**
- Polling: Check for new notifications every 30 seconds
- WebSocket (Optional): Real-time notification delivery
- Server-Sent Events (SSE): Alternative to WebSocket for one-way updates

## File Storage Architecture

### File Serving Endpoints

**Content Item Files (VIDEO, PDF, PPT):**
- **Endpoint:** `GET /api/files/serve?path={relativePath}`
- **Purpose:** Serve files for content items (videos, PDFs, PPTs) with authentication and course access checks
- **Authentication:** Required - validates user JWT token
- **Authorization:** Checks user has access to the course containing the content item
- **Features:**
  - Path validation to prevent directory traversal attacks
  - Course access verification
  - Proper MIME type headers
  - Range request support for video streaming
  - File size limits (1GB max for uploads)

**Repository Files:**
- **Endpoint:** `GET /api/files/{id}/download`
- **Purpose:** Download repository files with tracking
- **Authentication:** Required
- **Authorization:** Checks user has access to the course
- **Features:**
  - Download tracking for analytics
  - File metadata from database

### File Upload Flow

1. **File Upload:** `POST /api/files/upload`
   - Accepts `FormData` with file and metadata
   - Validates file type and size (1GB max)
   - Saves to organized directory structure: `/storage/{type}/{courseId}/{filename}`
   - Returns file URL for content items: `/api/files/serve?path={relativePath}`
   - Returns download URL for repository files: `/api/files/{id}/download`

2. **File Storage Structure:**
   ```
   storage/
   ├── avatars/
   │   └── {userId}/
   │       └── {filename}
   ├── videos/
   │   └── {courseId}/
   │       └── {filename}
   ├── pdfs/
   │   └── {courseId}/
   │       └── {filename}
   ├── ppts/
   │   └── {courseId}/
   │       └── {filename}
   └── repository/
       └── {courseId}/
           └── {folderPath}/
               └── {filename}
   ```

3. **Content Item File URLs:**
   - Videos: `/api/files/serve?path=/videos/{courseId}/{filename}`
   - PDFs: `/api/files/serve?path=/pdfs/{courseId}/{filename}`
   - PPTs: `/api/files/serve?path=/ppts/{courseId}/{filename}`

## File Storage Architecture

### Directory Structure

```
/storage
  /videos
    /course-{courseId}
      /content-{contentId}
        video.mp4
  /pdfs
    /course-{courseId}
      /content-{contentId}
        document.pdf
  /ppts
    /course-{courseId}
      /content-{contentId}
        presentation.pptx
        /converted
          slide-001.jpg
          slide-002.jpg
          ...
  /repository
    /course-{courseId}
      /folder1
        file1.pdf
        file2.docx
      /folder2
        file3.xlsx
      file4.pdf (root level)
  /avatars
    /user-{userId}
      avatar.jpg
  /certificates
    /completion-{completionId}
      certificate.pdf
  /thumbnails
    /course-{courseId}
      thumbnail.jpg
    /learning-plan-{planId}
      thumbnail.jpg
  /badges
    /badge-{badgeId}
      badge.png
```

### File Upload Process

1. **Client:** User selects file(s) via file input
2. **API Route:** `/api/files/upload` receives multipart/form-data
3. **Validation:** Check file type, size (max 100MB), permissions
4. **Storage:** Save file to appropriate directory
5. **Database:** Create record in `RepositoryFile` or update `ContentItem`
6. **Response:** Return file metadata (ID, URL, size, etc.)

### File Serving

**Static Files:**
- Next.js serves static files from `/public` directory
- For user-uploaded files, use API route: `/api/files/:id/download`
- Check authentication and permissions before serving

**Video Streaming:**
- Use HTTP range requests for video streaming
- Support seeking, pause, resume
- Track watch progress in database

**PPT Conversion:**
- Convert PPT to images on upload (using libreoffice or similar)
- Store converted images in `/ppts/course-{id}/content-{id}/converted/`
- Serve images in slideshow viewer

### File Security

- All file access requires authentication
- Check user permissions (enrolled, instructor, admin)
- Validate file paths to prevent directory traversal
- Rate limit file downloads
- Log all file access for audit trail

## Video Streaming Architecture

### Video Format & Encoding

**Format:** MP4 (H.264 video, AAC audio)
- Widely supported across browsers
- Good compression ratio
- Hardware acceleration support

**Encoding Recommendations:**
- Resolution: 1080p (1920x1080) or 720p (1280x720)
- Bitrate: 2-5 Mbps for 1080p, 1-2 Mbps for 720p
- Frame rate: 30 fps
- Audio: AAC, 128 kbps

### Streaming Strategy

**HTTP Range Requests:**
- Browser requests specific byte ranges
- Server responds with 206 Partial Content
- Enables seeking, pause, resume
- No special streaming server needed

**Implementation:**
```typescript
// API Route: /api/files/:id/stream
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const range = request.headers.get('range');
  if (!range) {
    // Return full file
    return new Response(fileBuffer, { headers: { 'Content-Type': 'video/mp4' } });
  }
  
  // Parse range header
  const [start, end] = parseRange(range, fileSize);
  
  // Return partial content
  return new Response(fileBuffer.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'video/mp4',
      'Content-Length': (end - start + 1).toString(),
    },
  });
}
```

### Progress Tracking

**Client-Side:**
- Video player fires `timeupdate` event every 1-2 seconds
- Debounce progress updates (send every 5-10 seconds)
- Store last position in localStorage as backup

**Server-Side:**
- API endpoint: `POST /api/progress/video`
- Update `VideoProgress` record
- Calculate completion: `watchTime / totalDuration >= completionThreshold`
- Unlock next content item if current is completed

### Video Analytics

**Track:**
- Watch time (total seconds watched)
- Completion percentage
- Times watched
- Last position (for resume)
- Drop-off points (where users stop watching)

**Analytics Queries:**
- Average watch time per video
- Completion rates
- Most watched videos
- Least watched videos
- Watch time distribution

## Assessment Engine Architecture

### Question Types

**1. Single Choice:**
- One correct answer from multiple options
- Radio button interface
- Auto-graded

**2. Multiple Choice:**
- Multiple correct answers from options
- Checkbox interface
- Auto-graded (all or nothing, or partial credit)

**3. True/False:**
- Binary choice
- Radio button interface
- Auto-graded

**4. Short Answer:**
- Text input
- Manual or auto-graded (fuzzy matching against correct answers)
- Case-sensitive or case-insensitive

**5. Fill in the Blank:**
- Text with blanks to fill
- Multiple text inputs
- Auto-graded (fuzzy matching)

### Test Delivery Flow

1. **Load Test:**
   - Fetch test and questions from database
   - Randomize questions/answers if enabled
   - Start timer if time limit exists

2. **Answer Questions:**
   - User selects/enters answers
   - Store answers in client state
   - Auto-save periodically (optional)

3. **Submit Test:**
   - Validate all required questions answered
   - Calculate score (points earned / total points)
   - Check if passed (score >= passingScore)
   - Check retake limit
   - Save attempt to database
   - Return results

4. **Display Results:**
   - Show score and pass/fail status
   - Show correct answers (if enabled)
   - Show explanations (if provided)
   - Show retake option (if available)

### Grading Logic

**Objective Questions (Auto-graded):**
```typescript
function gradeQuestion(question: Question, answer: Answer): number {
  switch (question.type) {
    case 'SINGLE_CHOICE':
      return answer.selectedOption === question.correctOption ? question.points : 0;
    
    case 'MULTIPLE_CHOICE':
      const correct = question.correctOptions.sort();
      const selected = answer.selectedOptions.sort();
      return arraysEqual(correct, selected) ? question.points : 0;
    
    case 'TRUE_FALSE':
      return answer.value === question.correctAnswer ? question.points : 0;
    
    case 'SHORT_ANSWER':
    case 'FILL_BLANK':
      const normalized = answer.text.toLowerCase().trim();
      const matches = question.correctAnswers.some(correct => 
        normalized === correct.toLowerCase().trim()
      );
      return matches ? question.points : 0;
  }
}
```

**Subjective Questions (Manual grading):**
- Marked for instructor review
- Instructor assigns points manually
- Can add feedback/comments

### Question Repository

**Purpose:** Reusable question bank
- Create questions in repository
- Categorize questions
- Import questions into tests
- Share questions across tests/courses

**Implementation:**
- `QuestionRepository` table stores repository metadata
- `Question.repositoryId` links questions to repository
- Questions can belong to both repository and specific test

## Analytics & Reporting Architecture

### Analytics Data Model

**Aggregated Metrics:**
- Completion rates (per course, per learning plan, overall)
- Average scores (per test, per course)
- Average time to complete
- Enrollment statistics
- Video watch statistics
- Test performance statistics

**Real-Time Metrics:**
- Active learners
- Courses in progress
- Recent completions
- Recent enrollments

### Reporting Queries

**Course Analytics:**
```sql
-- Completion rate
SELECT 
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*) as completion_rate
FROM enrollments
WHERE courseId = ?;

-- Average score
SELECT AVG(score) as avg_score
FROM completions
WHERE courseId = ? AND score IS NOT NULL;

-- Average time to complete
SELECT AVG(EXTRACT(EPOCH FROM (completedAt - startedAt)) / 60) as avg_minutes
FROM enrollments
WHERE courseId = ? AND completedAt IS NOT NULL;
```

**Test Analytics:**
```sql
-- Pass rate
SELECT 
  COUNT(CASE WHEN passed = true THEN 1 END) * 100.0 / COUNT(*) as pass_rate
FROM test_attempts
WHERE testId = ? AND submittedAt IS NOT NULL;

-- Average score
SELECT AVG(score) as avg_score
FROM test_attempts
WHERE testId = ? AND submittedAt IS NOT NULL;

-- Question performance
SELECT 
  q.id,
  q.questionText,
  COUNT(ta.id) as total_attempts,
  COUNT(CASE WHEN ta.isCorrect = true THEN 1 END) as correct_attempts,
  COUNT(CASE WHEN ta.isCorrect = true THEN 1 END) * 100.0 / COUNT(ta.id) as correct_rate
FROM questions q
LEFT JOIN test_answers ta ON q.id = ta.questionId
WHERE q.testId = ?
GROUP BY q.id, q.questionText;
```

### Chart Types

**Dashboard Charts:**
- Line chart: Enrollment trends over time
- Bar chart: Completion rates by course
- Pie chart: Enrollment status distribution
- Area chart: Active learners over time

**Course Analytics Charts:**
- Progress bar: Completion percentage
- Line chart: Test scores over time
- Bar chart: Average scores by test
- Heatmap: Video watch completion by learner

**Test Analytics Charts:**
- Bar chart: Question performance (correct rate)
- Distribution chart: Score distribution
- Line chart: Average scores over time
- Table: Individual attempt details

### CSV Export

**Export Formats:**
- Course completion report
- Test results report
- Learner progress report
- Enrollment report
- Video analytics report

**Implementation:**
- Use `csv-writer` or `papaparse` library
- Generate CSV on server
- Stream response to client
- Include all relevant columns and data

## Security Architecture

### Authentication Security

**JWT Tokens:**
- Access token: 3-day expiration
- Refresh token: 30-day expiration, stored in database
- HTTP-only cookies for token storage
- CSRF protection via SameSite cookies

**Password Security:**
- bcrypt hashing (10 rounds minimum)
- Password complexity requirements (configurable)
- Account lockout after failed attempts (configurable)
- Password reset via secure token

### Authorization Security

**Role-Based Access Control (RBAC):**
- Middleware checks user role before API access
- Database-level constraints prevent unauthorized access
- Frontend hides UI elements based on role (UX only, not security)

**Permission Checks:**
- Every API route validates permissions
- Database queries filtered by user permissions
- Instructors can only access assigned courses/plans

### Data Security

**Input Validation:**
- Zod schemas validate all inputs
- SQL injection prevention via Prisma (parameterized queries)
- XSS prevention via React (automatic escaping)
- File upload validation (type, size, content)

**Data Encryption:**
- HTTPS for all communications
- Passwords hashed with bcrypt
- Sensitive data encrypted at rest (if required)

### File Security

**Access Control:**
- All file access requires authentication
- Check enrollment/permissions before serving files
- Prevent directory traversal attacks
- Rate limit file downloads

**File Validation:**
- Validate file types (MIME type checking)
- Scan for malicious content (optional)
- Size limits (100MB per file)
- Virus scanning (optional, for production)

### Audit Trail

**Logged Actions:**
- User creation, update, deletion
- Course/learning plan creation, update, deletion
- Enrollment creation, approval, completion
- Content access
- File downloads
- System configuration changes

**Audit Log Fields:**
- User ID
- Action type
- Entity type and ID
- Changes made (JSON)
- IP address
- User agent
- Timestamp

## Performance Considerations

### Database Optimization

**Indexing:**
- All foreign keys indexed
- Frequently queried fields indexed
- Composite indexes for common query patterns
- Full-text search indexes for search functionality

**Query Optimization:**
- Use Prisma select to limit fields returned
- Pagination for large result sets
- Eager loading for related data (avoid N+1 queries)
- Database connection pooling

**Caching:**
- Redis for session storage (optional)
- Cache frequently accessed data (categories, system settings)
- Cache course/plan metadata
- Invalidate cache on updates

### Frontend Performance

**Code Splitting:**
- Next.js automatic code splitting
- Dynamic imports for heavy components
- Lazy load video players, charts, PDF viewers

**Image Optimization:**
- Next.js Image component for automatic optimization
- WebP format with fallbacks
- Lazy loading for images below fold
- Responsive images (srcset)

**Bundle Size:**
- Tree shaking for unused code
- Minimize dependencies
- Use lighter alternatives where possible

### Video Performance

**Streaming:**
- HTTP range requests for efficient streaming
- CDN for video delivery (future enhancement)
- Adaptive bitrate streaming (future enhancement)

**Storage:**
- Compress videos during upload (optional)
- Generate thumbnails for video previews
- Store multiple quality versions (future enhancement)

### API Performance

**Response Times:**
- Target: < 200ms for simple queries
- Target: < 500ms for complex queries
- Target: < 1s for report generation

**Optimization:**
- Database query optimization
- Response compression (gzip)
- Pagination for large datasets
- Background jobs for heavy operations (email, reports)

## Scalability Strategy

### Horizontal Scaling (Future)

**Application Servers:**
- Multiple Next.js instances behind load balancer
- Stateless application (no in-memory state)
- Shared database and file storage

**Database Scaling:**
- Read replicas for read-heavy queries
- Connection pooling
- Query optimization
- Consider sharding for very large datasets

**File Storage Scaling:**
- Move to object storage (S3, Azure Blob) for large scale
- CDN for video delivery
- Distributed file storage

### Vertical Scaling (Initial)

**VM Resources:**
- U-225VM: Monitor CPU, RAM, disk usage
- Upgrade VM specs as needed
- Optimize application before scaling

**Database Optimization:**
- Proper indexing
- Query optimization
- Connection pooling
- Regular maintenance (VACUUM, ANALYZE)

### Caching Strategy

**Application-Level:**
- Cache system settings
- Cache course/plan metadata
- Cache user permissions
- Invalidate on updates

**Database-Level:**
- PostgreSQL query cache
- Materialized views for complex reports (future)

**CDN (Future):**
- Static assets (images, thumbnails)
- Video content
- PDF/PPT files

### Background Jobs

**Heavy Operations:**
- Email sending (queue with Bull or similar)
- Report generation
- Video processing/transcoding
- Bulk imports/exports
- Certificate generation

**Job Queue:**
- Redis + Bull or similar
- Process jobs asynchronously
- Retry failed jobs
- Monitor job status

This architecture provides a solid foundation for a scalable, maintainable LMS system. The modular design allows for incremental development and future enhancements.

