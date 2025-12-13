# LMS - Implementation & Build Plan

**Complete implementation guide, development setup, coding patterns, and deployment strategy for the Learning Management System.**

## Table of Contents

1. [Project Structure](#project-structure)
2. [Development Setup](#development-setup)
3. [Database Setup](#database-setup)
4. [Development Phases](#development-phases)
5. [Coding Patterns & Conventions](#coding-patterns--conventions)
6. [Component Development](#component-development)
7. [API Development](#api-development)
8. [File Upload & Storage](#file-upload--storage)
9. [Video Player Implementation](#video-player-implementation)
10. [Test Engine Implementation](#test-engine-implementation)
11. [Analytics Implementation](#analytics-implementation)
12. [Deployment Strategy](#deployment-strategy)
13. [Testing Strategy](#testing-strategy)
14. [Performance Optimization](#performance-optimization)

## Project Structure

```
lms/
├── .env.local                    # Local environment variables
├── .env.example                  # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js          # Configured for Tailwind CSS v4 with @tailwindcss/postcss
├── ecosystem.config.js         # PM2 configuration for production deployment
├── prisma/
│   ├── schema.prisma            # Prisma schema
│   └── migrations/               # Database migrations
├── public/
│   ├── images/
│   └── icons/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   ├── learner/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── instructor/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── admin/
│   │   │   │       └── page.tsx
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── learning-plans/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── catalog/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── register/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── refresh/
│   │   │   │   │   └── route.ts
│   │   │   │   └── logout/
│   │   │   │       └── route.ts
│   │   │   ├── users/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── courses/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── analytics/
│   │   │   │           └── route.ts
│   │   │   ├── learning-plans/
│   │   │   │   └── route.ts
│   │   │   ├── enrollments/
│   │   │   │   └── route.ts
│   │   │   ├── progress/
│   │   │   │   ├── video/
│   │   │   │   │   └── route.ts
│   │   │   │   └── test/
│   │   │   │       └── route.ts
│   │   │   ├── files/
│   │   │   │   ├── upload/
│   │   │   │   │   └── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── download/
│   │   │   │           └── route.ts
│   │   │   ├── analytics/
│   │   │   │   └── route.ts
│   │   │   └── notifications/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx              # Landing page
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   └── chart.tsx
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── dashboard-layout.tsx
│   │   ├── dashboard/
│   │   │   ├── learner-dashboard.tsx
│   │   │   ├── instructor-dashboard.tsx
│   │   │   └── admin-dashboard.tsx
│   │   ├── courses/
│   │   │   ├── course-card.tsx
│   │   │   ├── course-catalog.tsx
│   │   │   ├── course-viewer.tsx
│   │   │   ├── course-editor.tsx
│   │   │   └── content-item-viewer.tsx
│   │   ├── video/
│   │   │   ├── video-player.tsx
│   │   │   └── video-progress-tracker.tsx
│   │   ├── pdf/
│   │   │   └── pdf-viewer.tsx
│   │   ├── ppt/
│   │   │   └── ppt-viewer.tsx
│   │   ├── test/
│   │   │   ├── test-viewer.tsx
│   │   │   ├── test-editor.tsx
│   │   │   ├── question-editor.tsx
│   │   │   └── question-types/
│   │   │       ├── single-choice.tsx
│   │   │       ├── multiple-choice.tsx
│   │   │       ├── true-false.tsx
│   │   │       ├── short-answer.tsx
│   │   │       └── fill-blank.tsx
│   │   ├── enrollment/
│   │   │   ├── enrollment-manager.tsx
│   │   │   └── enrollment-card.tsx
│   │   ├── analytics/
│   │   │   ├── analytics-dashboard.tsx
│   │   │   ├── course-analytics.tsx
│   │   │   ├── test-analytics.tsx
│   │   │   └── video-analytics.tsx
│   │   └── forms/
│   │       ├── login-form.tsx
│   │       ├── register-form.tsx
│   │       ├── course-form.tsx
│   │       └── test-form.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   └── prisma.ts          # Prisma client instance
│   │   ├── auth/
│   │   │   ├── jwt.ts             # JWT utilities
│   │   │   ├── middleware.ts      # Auth middleware
│   │   │   └── password.ts        # Password hashing
│   │   ├── api/
│   │   │   └── client.ts          # API client utilities
│   │   ├── utils/
│   │   │   ├── validation.ts      # Zod schemas
│   │   │   ├── formatting.ts      # Date, number formatting
│   │   │   └── errors.ts          # Error handling utilities
│   │   └── storage/
│   │       ├── file-upload.ts     # File upload utilities
│   │       └── file-serve.ts      # File serving utilities
│   ├── store/
│   │   ├── auth-store.ts          # Zustand auth store
│   │   ├── ui-store.ts            # UI state store
│   │   └── course-store.ts        # Course viewing state
│   ├── types/
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── enrollment.ts
│   │   ├── test.ts
│   │   └── api.ts
│   └── hooks/
│       ├── use-auth.ts
│       ├── use-progress.ts
│       └── use-video-player.ts
├── storage/                       # File storage (gitignored)
│   ├── videos/
│   ├── pdfs/
│   ├── ppts/
│   ├── repository/
│   ├── avatars/
│   └── certificates/
└── README.md
```

## Development Setup

### Prerequisites

- **Node.js:** 20.x LTS or higher
- **PostgreSQL:** 15+ (or use Docker)
- **npm/yarn/pnpm:** Latest version
- **Git:** For version control

### Initial Setup

1. **Clone and Install:**
```bash
# Create project directory
mkdir lms && cd lms

# Initialize Next.js project (Next.js 16)
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install dependencies
npm install prisma @prisma/client
npm install zod react-hook-form @hookform/resolvers
npm install zustand
npm install jsonwebtoken bcryptjs
npm install @types/jsonwebtoken @types/bcryptjs
npm install lucide-react
npm install recharts
npm install react-pdf
npm install formidable @types/formidable
npm install nodemailer @types/nodemailer
npm install csv-writer
npm install date-fns

# Install dev dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D prisma
npm install -D eslint eslint-config-next
npm install -D @tailwindcss/postcss  # For Tailwind CSS v4
```

**Note:** The project uses Next.js 16.0.8 and Tailwind CSS 4.1.17. Dynamic route parameters in Next.js 16 are now async and must be awaited.

2. **Environment Variables:**
Create `.env.local`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lms?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="3d"
JWT_REFRESH_EXPIRES_IN="30d"

# File Storage
STORAGE_PATH="./storage"
MAX_FILE_SIZE=104857600  # 100MB in bytes

# Email (Optional)
SMTP_ENABLED=false
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@lms.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

3. **Initialize Prisma:**
```bash
# Initialize Prisma
npx prisma init

# Create initial migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

4. **Create Storage Directories:**
```bash
mkdir -p storage/{videos,pdfs,ppts,repository,avatars,certificates,thumbnails,badges}
```

## Database Setup

### Prisma Schema

Create `prisma/schema.prisma` based on the database schema in `lms-architecture.md`. Key points:

1. **Database Provider:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. **Generator:**
```prisma
generator client {
  provider = "prisma-client-js"
}
```

3. **Models:**
- Copy all models from architecture document
- Ensure proper relationships and indexes
- Add `@@map` directives for custom table names if needed

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client after schema changes
npx prisma generate
```

### Seed Data

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default roles
  const learnerRole = await prisma.role.upsert({
    where: { name: 'LEARNER' },
    update: {},
    create: {
      name: 'LEARNER',
      description: 'Learner role',
      permissions: ['course:view', 'enrollment:self']
    }
  });

  const instructorRole = await prisma.role.upsert({
    where: { name: 'INSTRUCTOR' },
    update: {},
    create: {
      name: 'INSTRUCTOR',
      description: 'Instructor role',
      permissions: ['course:create', 'course:edit:own', 'enrollment:create', 'analytics:view:own']
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator role',
      permissions: ['*'] // All permissions
    }
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.com' },
    update: {},
    create: {
      email: 'admin@lms.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      roles: {
        create: {
          roleId: adminRole.id
        }
      }
    }
  });

  console.log('Seed data created:', { admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
npx prisma db seed
```

## Development Phases

### Phase 1: Foundation (Week 1-2) ✅ COMPLETE

**Goals:**
- Set up project structure
- Configure database and Prisma
- Implement authentication system
- Create basic UI components

**Tasks:**
1. ✅ Project initialization
2. ✅ Database schema and migrations
3. ✅ Authentication (login, register, JWT)
4. ✅ Basic UI components (Button, Input, Modal, etc.)
5. ✅ Layout components (Header, Sidebar, Footer)
6. ✅ Role-based routing middleware
7. ✅ Next.js 16 upgrade and async params migration
8. ✅ Tailwind CSS v4 configuration
9. ✅ PostCSS configuration for Tailwind v4
10. ✅ CSS base styles and page constraints

**Deliverables:**
- ✅ Working authentication flow
- ✅ Basic dashboard layout
- ✅ User can login/register
- ✅ Protected routes working
- ✅ Enhanced dashboard pages (admin, instructor, learner)
- ✅ Role-based navigation menu
- ✅ Production deployment with PM2

### Phase 2: User Management (Week 3)

**Goals:**
- User CRUD operations
- Profile management
- Group management
- User bulk import/export

**Tasks:**
1. User list and detail pages
2. User creation/editing forms
3. Profile page with avatar upload
4. Group management interface
5. CSV import/export functionality

**Deliverables:**
- Admin can manage users
- Users can edit profiles
- Groups can be created and managed
- Bulk user operations working

### Phase 3: Course Management (Week 4-5)

**Goals:**
- Course CRUD operations
- Content item management
- File upload system
- Course versioning

**Tasks:**
1. Course list and catalog
2. Course creation/editing
3. Content item management (add, edit, reorder)
4. File upload (videos, PDFs, PPTs)
5. Course status management (draft, published, archived)
6. Version history

**Deliverables:**
- Instructors can create/edit courses
- Content items can be added
- Files can be uploaded
- Course publishing workflow

### Phase 4: Learning Plans (Week 6)

**Goals:**
- Learning plan CRUD
- Course assignment to plans
- Plan ordering

**Tasks:**
1. Learning plan list and creation
2. Add/remove courses from plans
3. Reorder courses in plans
4. Plan publishing

**Deliverables:**
- Learning plans can be created
- Courses can be organized into plans
- Plans can be published

### Phase 5: Enrollment System (Week 7)

**Goals:**
- Enrollment creation
- Self-enrollment
- Approval workflows
- Bulk enrollment

**Tasks:**
1. Enrollment API endpoints
2. Self-enrollment interface
3. Approval workflow
4. Bulk enrollment tool
5. Enrollment management interface

**Deliverables:**
- Learners can self-enroll (if enabled)
- Instructors can enroll learners
- Approval workflow working
- Bulk operations functional

### Phase 6: Content Viewing (Week 8-9)

**Goals:**
- Video player with tracking
- PDF viewer
- PPT viewer
- Progress tracking

**Tasks:**
1. Video player component
2. Video progress tracking
3. PDF viewer integration
4. PPT conversion and viewer
5. Progress API endpoints
6. Content unlocking logic

**Deliverables:**
- Learners can watch videos
- Progress is tracked
- PDFs can be viewed
- PPTs can be viewed
- Sequential unlocking works

### Phase 7: Assessment Engine (Week 10-11)

**Goals:**
- Test creation and editing
- Question management
- Test delivery
- Auto-grading
- Question repository

**Tasks:**
1. Test creation interface
2. Question editor (all types)
3. Test delivery interface
4. Grading logic
5. Test results display
6. Question repository
7. Retake logic

**Deliverables:**
- Tests can be created
- All question types supported
- Tests can be taken
- Auto-grading works
- Results are displayed

### Phase 8: Analytics & Reporting (Week 12)

**Goals:**
- Analytics dashboards
- Charts and visualizations
- Report generation
- CSV export

**Tasks:**
1. Analytics API endpoints
2. Dashboard components
3. Chart components (Recharts)
4. Report generation
5. CSV export functionality

**Deliverables:**
- Analytics dashboards functional
- Charts display correctly
- Reports can be generated
- CSV export works

### Phase 9: Notifications (Week 13)

**Goals:**
- In-app notifications
- Email notifications (optional)
- Notification management

**Tasks:**
1. Notification system
2. Toast notifications
3. Notification center
4. Email service integration
5. Notification preferences

**Deliverables:**
- Notifications appear in UI
- Email notifications work (if enabled)
- Users can manage notifications

### Phase 10: Certificates & Badges (Week 14)

**Goals:**
- Certificate generation
- Badge system
- Completion tracking

**Tasks:**
1. Certificate template system
2. PDF certificate generation
3. Badge creation and assignment
4. Completion tracking
5. Certificate download

**Deliverables:**
- Certificates can be generated
- Badges can be awarded
- Completion records maintained

### Phase 11: Polish & Optimization (Week 15-16) 🔄 IN PROGRESS

**Goals:**
- UI/UX improvements
- Performance optimization
- Accessibility audit
- Mobile responsiveness
- Security audit
- Test coverage improvements

**Tasks:**
1. ✅ UI refinement and styling fixes
2. ✅ Dashboard page enhancements
3. ✅ Navigation menu improvements
4. ✅ CSS configuration fixes (Tailwind v4)
5. ✅ Build error fixes (Next.js 16 async params)
6. ✅ TypeScript error fixes
7. ✅ Production deployment setup (PM2)
8. 🔄 Test coverage improvements (targeting 90%+)
9. 🔄 Branch coverage optimization
10. [ ] Performance profiling and optimization
11. [ ] Accessibility testing
12. [ ] Mobile testing and fixes
13. [ ] Security review
14. [ ] Error handling improvements

**Deliverables:**
- ✅ Polished UI with proper styling
- ✅ Enhanced dashboard pages with stats
- ✅ Role-based navigation menu
- ✅ Production-ready deployment
- 🔄 Comprehensive test coverage (80%+ achieved, targeting 90%+)
- [ ] Optimized performance
- [ ] Accessible interface
- [ ] Mobile-responsive
- [ ] Secure system

## Recent Updates & Changes

### Next.js 16 Migration (December 2025)

**Breaking Change:** Dynamic route parameters are now async in Next.js 16.

**Before (Next.js 15):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // Direct access
  // ...
}
```

**After (Next.js 16):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Must await
  // ...
}
```

**All dynamic route handlers updated:**
- `app/api/**/[id]/route.ts`
- `app/api/**/[courseId]/route.ts`
- `app/api/**/[testId]/route.ts`
- `app/(dashboard)/**/[id]/page.tsx`
- All other dynamic routes

### Tailwind CSS v4 Configuration

**CSS Import Syntax:**
```css
/* app/globals.css */
@import "tailwindcss";  /* New v4 syntax */
```

**PostCSS Configuration:**
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // Tailwind v4 plugin
    autoprefixer: {},
  },
}
```

**Base Styles Added:**
- Box-sizing reset
- Overflow-x hidden for page constraints
- Proper font family fallbacks
- Body and HTML constraints

### Dashboard Enhancements

**Admin Dashboard:**
- Comprehensive stats cards (users, courses, learning plans, enrollments)
- Quick action buttons
- System overview section
- Links to all major sections

**Instructor Dashboard:**
- Course statistics
- Enrollment tracking
- Pending approvals
- Recent courses list
- Quick actions for course management

**Learner Dashboard:**
- Enrollment statistics
- Progress tracking
- Continue learning section
- Quick access to catalog and certificates

### Navigation Updates

**Role-Based Menu Items:**
- All roles: Dashboard, Notifications, Profile
- Admin: Courses, Learning Plans, Users, Groups, Enrollments, Categories, Analytics
- Instructor: Courses, Enrollments, Catalog, Analytics
- Learner: Catalog, My Courses, Certificates

### Production Deployment

**Status:** ✅ Deployed and running
- PM2 process manager configured
- Application running on port 3000
- Production build successful
- All CSS and styling working correctly

## Coding Patterns & Conventions

### TypeScript

**Strict Mode:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Type Definitions:**
- Create types in `src/types/` directory
- Use interfaces for object shapes
- Use types for unions and intersections
- Export types from index files

**Example:**
```typescript
// src/types/course.ts
export interface Course {
  id: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  // ...
}

export type CourseStatus = Course['status'];
```

### API Routes

**Structure (Next.js 16 with async params):**
```typescript
// src/app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string(),
  // ...
});

// For routes with dynamic params (Next.js 16)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Must await params in Next.js 16
    const user = await authenticate(request);
    
    // Authorization check
    if (!user.roles.includes('INSTRUCTOR') && !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Query logic
    const courses = await prisma.course.findMany({
      where: {
        // Filter by permissions
        OR: [
          { createdById: user.id },
          { publicAccess: true },
          { instructorAssignments: { some: { userId: user.id } } }
        ]
      },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    
    // Authorization
    if (!user.roles.includes('INSTRUCTOR') && !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate input
    const body = await request.json();
    const data = createCourseSchema.parse(body);

    // Create course
    const course = await prisma.course.create({
      data: {
        ...data,
        createdById: user.id,
        status: 'DRAFT'
      },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entityType: 'COURSE',
        entityId: course.id,
        changes: data
      }
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create course' },
      { status: 500 }
    );
  }
}
```

### Server Components

**Use Server Components for:**
- Data fetching
- Database queries
- Server-side rendering
- SEO-important content

**Example:**
```typescript
// src/app/courses/page.tsx
import { prisma } from '@/lib/db/prisma';
import { authenticate } from '@/lib/auth/middleware';
import { CourseCard } from '@/components/courses/course-card';

export default async function CoursesPage() {
  const user = await authenticate();
  
  const courses = await prisma.course.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { publicAccess: true },
        { enrollments: { some: { userId: user.id } } }
      ]
    },
    include: {
      category: true,
      _count: { select: { enrollments: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Courses</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
```

### Client Components

**Use Client Components for:**
- Interactive UI (buttons, forms, modals)
- State management (Zustand)
- Browser APIs (localStorage, WebSocket)
- Event handlers

**Example:**
```typescript
// src/components/courses/course-card.tsx
'use client';

import { useState } from 'react';
import { Course } from '@/types/course';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const response = await fetch('/api/enrollments/self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id })
      });
      
      if (response.ok) {
        router.push(`/courses/${course.id}`);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
      <p className="text-gray-600 mb-4">{course.shortDescription}</p>
      <Button onClick={handleEnroll} disabled={isEnrolling}>
        {isEnrolling ? 'Enrolling...' : 'Enroll'}
      </Button>
    </div>
  );
}
```

### Form Handling

**Use React Hook Form + Zod:**
```typescript
// src/components/forms/course-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional()
});

type CourseFormData = z.infer<typeof courseSchema>;

export function CourseForm({ onSubmit }: { onSubmit: (data: CourseFormData) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title">Title</label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-red-500">{errors.title.message}</p>}
      </div>
      
      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" {...register('description')} />
        {errors.description && <p className="text-red-500">{errors.description.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Course'}
      </Button>
    </form>
  );
}
```

## Component Development

### UI Components

**Create reusable components in `src/components/ui/`:**

```typescript
// src/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg font-medium transition-colors',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'bg-transparent hover:bg-gray-100': variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg'
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

### Layout Components

**Dashboard Layout:**
```typescript
// src/components/layout/dashboard-layout.tsx
'use client';

import { Header } from './header';
import { Sidebar } from './sidebar';
import { Footer } from './footer';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
```

## API Development

### Authentication Middleware

```typescript
// src/lib/auth/middleware.ts
import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { prisma } from '@/lib/db/prisma';

export async function authenticate(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      throw new Error('UNAUTHORIZED');
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map(ur => ur.role.name)
    };
  } catch (error) {
    throw new Error('UNAUTHORIZED');
  }
}
```

### Error Handling

```typescript
// src/lib/utils/errors.ts
import { NextResponse } from 'next/server';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  }

  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    { status: 500 }
  );
}
```

## File Upload & Storage

### File Upload Handler

```typescript
// src/app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { parseFormData } from '@/lib/storage/file-upload';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const courseId = formData.get('courseId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'File too large (max 100MB)' },
        { status: 400 }
      );
    }

    // Determine storage path
    const storagePath = process.env.STORAGE_PATH || './storage';
    let filePath: string;
    
    switch (type) {
      case 'VIDEO':
        filePath = join(storagePath, 'videos', `course-${courseId}`, `content-${Date.now()}`);
        break;
      case 'PDF':
        filePath = join(storagePath, 'pdfs', `course-${courseId}`, `content-${Date.now()}`);
        break;
      case 'PPT':
        filePath = join(storagePath, 'ppts', `course-${courseId}`, `content-${Date.now()}`);
        break;
      case 'REPOSITORY':
        const folderPath = formData.get('folderPath') as string | null;
        filePath = join(storagePath, 'repository', `course-${courseId}`, folderPath || '');
        break;
      default:
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid file type' },
          { status: 400 }
        );
    }

    // Create directory if it doesn't exist
    await mkdir(filePath, { recursive: true });

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const finalPath = join(filePath, file.name);
    await writeFile(finalPath, buffer);

    // Save to database
    const fileRecord = await prisma.repositoryFile.create({
      data: {
        courseId: courseId!,
        fileName: file.name,
        filePath: finalPath,
        fileSize: file.size,
        mimeType: file.type,
        folderPath: formData.get('folderPath') as string | null,
        uploadedById: user.id
      }
    });

    return NextResponse.json({
      file: {
        id: fileRecord.id,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        mimeType: fileRecord.mimeType,
        url: `/api/files/${fileRecord.id}/download`
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
```

## Video Player Implementation

### Video Player Component

**Location:** `src/components/video/video-player.tsx`

**Features:**
- Progress tracking with 5-second interval updates
- Duration detection from video metadata with fallback to stored duration
- Completion detection based on configurable threshold (default 80%)
- Resume from last position
- Progress display (percentage and time)
- Fullscreen support via native HTML5 controls
- Stored duration support from content item `videoDuration` field

**Props:**
```typescript
interface VideoPlayerProps {
  contentItemId: string;
  videoUrl: string;
  videoDuration?: number; // Duration in seconds from content item
  completionThreshold?: number; // Default 0.8 (80%)
  allowSeeking?: boolean; // Default true
  onProgressUpdate?: (progress: {
    watchTime: number;
    totalDuration: number;
    lastPosition: number;
    completed: boolean;
  }) => void;
}
```

**Progress Tracking:**
- Updates every 5 seconds via `setInterval`
- UI updates on `timeupdate` event for smooth display
- Sends progress to `/api/progress/video` endpoint
- Uses stored `videoDuration` if video metadata not available
- Calculates completion percentage and unlocks next content

### Video Player Component

```typescript
// src/components/video/video-player.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useVideoProgress } from '@/hooks/use-video-progress';

interface VideoPlayerProps {
  contentItemId: string;
  videoUrl: string;
  completionThreshold: number;
  allowSeeking: boolean;
}

export function VideoPlayer({ contentItemId, videoUrl, completionThreshold, allowSeeking }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { progress, updateProgress } = useVideoProgress(contentItemId);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Resume from last position
    if (progress.lastPosition > 0) {
      video.currentTime = progress.lastPosition * video.duration;
    }

    // Track progress
    const handleTimeUpdate = () => {
      const watchTime = video.currentTime;
      const totalDuration = video.duration;
      const lastPosition = watchTime / totalDuration;

      updateProgress({
        watchTime: Math.floor(watchTime),
        totalDuration: Math.floor(totalDuration),
        lastPosition,
        timesWatched: progress.timesWatched + (watchTime >= totalDuration * 0.9 ? 1 : 0)
      });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [contentItemId, progress, updateProgress]);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList={allowSeeking ? undefined : 'nodownload nofullscreen'}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full"
      />
      {progress.completed && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          Video completed! Next content unlocked.
        </div>
      )}
    </div>
  );
}
```

### Progress Tracking Hook

```typescript
// src/hooks/use-video-progress.ts
'use client';

import { useState, useEffect } from 'react';

interface VideoProgress {
  watchTime: number;
  totalDuration: number;
  lastPosition: number;
  timesWatched: number;
  completed: boolean;
}

export function useVideoProgress(contentItemId: string) {
  const [progress, setProgress] = useState<VideoProgress>({
    watchTime: 0,
    totalDuration: 0,
    lastPosition: 0,
    timesWatched: 0,
    completed: false
  });

  useEffect(() => {
    // Load initial progress
    fetch(`/api/progress/video/${contentItemId}`)
      .then(res => res.json())
      .then(data => setProgress(data));
  }, [contentItemId]);

  const updateProgress = async (newProgress: Partial<VideoProgress>) => {
    const updated = { ...progress, ...newProgress };
    
    // Check completion
    if (updated.totalDuration > 0) {
      const completionPercentage = updated.watchTime / updated.totalDuration;
      updated.completed = completionPercentage >= 0.8; // completionThreshold
    }

    setProgress(updated);

    // Debounce API calls (every 5 seconds)
    const timeoutId = setTimeout(() => {
      fetch('/api/progress/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentItemId,
          ...updated
        })
      });
    }, 5000);

    return () => clearTimeout(timeoutId);
  };

  return { progress, updateProgress };
}
```

## Test Engine Implementation

### Test Viewer Component

```typescript
// src/components/test/test-viewer.tsx
'use client';

import { useState } from 'react';
import { Test, Question, TestAnswer } from '@/types/test';
import { SingleChoiceQuestion } from './question-types/single-choice';
import { MultipleChoiceQuestion } from './question-types/multiple-choice';
import { TrueFalseQuestion } from './question-types/true-false';
import { ShortAnswerQuestion } from './question-types/short-answer';
import { FillBlankQuestion } from './question-types/fill-blank';

interface TestViewerProps {
  test: Test;
  onSubmit: (answers: TestAnswer[]) => Promise<void>;
}

export function TestViewer({ test, onSubmit }: TestViewerProps) {
  const [answers, setAnswers] = useState<Record<string, TestAnswer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  const handleAnswer = (questionId: string, answer: TestAnswer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    try {
      await onSubmit(Object.values(answers), timeSpent);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const props = {
      question,
      answer: answers[question.id],
      onChange: (answer: TestAnswer) => handleAnswer(question.id, answer)
    };

    switch (question.type) {
      case 'SINGLE_CHOICE':
        return <SingleChoiceQuestion key={question.id} {...props} />;
      case 'MULTIPLE_CHOICE':
        return <MultipleChoiceQuestion key={question.id} {...props} />;
      case 'TRUE_FALSE':
        return <TrueFalseQuestion key={question.id} {...props} />;
      case 'SHORT_ANSWER':
        return <ShortAnswerQuestion key={question.id} {...props} />;
      case 'FILL_BLANK':
        return <FillBlankQuestion key={question.id} {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="test-viewer">
      <h2 className="text-2xl font-bold mb-6">{test.title}</h2>
      <div className="space-y-6">
        {test.questions.map(renderQuestion)}
      </div>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || Object.keys(answers).length !== test.questions.length}
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Test'}
      </button>
    </div>
  );
}
```

## Analytics Implementation

### Analytics Dashboard

```typescript
// src/components/analytics/analytics-dashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  enrollments: { date: string; count: number }[];
  completionRates: { course: string; rate: number }[];
  statusDistribution: { status: string; count: number }[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Enrollment Trends</h2>
          <LineChart width={400} height={300} data={data.enrollments}>
            <Line type="monotone" dataKey="count" stroke="#8884d8" />
          </LineChart>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Completion Rates</h2>
          <BarChart width={400} height={300} data={data.completionRates}>
            <Bar dataKey="rate" fill="#8884d8" />
          </BarChart>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Status Distribution</h2>
          <PieChart width={400} height={300}>
            <Pie data={data.statusDistribution} dataKey="count" cx={200} cy={150}>
              {data.statusDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </div>
      </div>
    </div>
  );
}
```

## Deployment Strategy

### Production Build

```bash
# Build Next.js application
npm run build

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
```

### Environment Setup

**Production `.env`:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lms_prod"
JWT_SECRET="production-secret-key-change-this"
JWT_REFRESH_SECRET="production-refresh-secret-change-this"
STORAGE_PATH="/var/lms/storage"
NEXT_PUBLIC_APP_URL="https://lms.yourdomain.com"
NODE_ENV="production"
```

### Process Management

**Use PM2:**
```bash
# Install PM2
npm install -g pm2

# Build application first
npm run build

# Start application using ecosystem config
pm2 start ecosystem.config.js

# Or start directly
pm2 start npm --name "lms" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**PM2 Ecosystem Configuration (`ecosystem.config.js`):**
```javascript
module.exports = {
  apps: [
    {
      name: "lms",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
      cwd: "/home/hendo420/lms",
      log_file: "logs/pm2-combined.log",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      max_memory_restart: "500M",
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name lms.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload size limit
    client_max_body_size 100M;
}
```

### Database Backup

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres lms_prod > /backups/lms_$DATE.sql

# Restore
psql -U postgres lms_prod < /backups/lms_20251209_120000.sql
```

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/auth/jwt.test.ts
import { generateToken, verifyToken } from '@/lib/auth/jwt';

describe('JWT', () => {
  it('should generate and verify token', () => {
    const payload = { userId: '123', email: 'test@example.com' };
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('123');
  });
});
```

### Integration Tests

```typescript
// __tests__/api/courses.test.ts
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/courses/route';

describe('/api/courses', () => {
  it('should create course', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test Course',
        description: 'Test Description'
      }
    });

    await POST(req);
    expect(res._getStatusCode()).toBe(201);
  });
});
```

## Performance Optimization

### Database Queries

- Use Prisma `select` to limit fields
- Add proper indexes
- Use pagination for large datasets
- Eager load related data to avoid N+1 queries

### Caching

- Cache system settings in memory
- Cache course/plan metadata
- Use Next.js caching for static content
- Implement Redis for session storage (optional)

### Code Splitting

- Use dynamic imports for heavy components
- Lazy load video players, charts, PDF viewers
- Split routes by role

### Image Optimization

- Use Next.js Image component
- Generate thumbnails for videos
- Compress images before storage

## Test Coverage Status

**Current Coverage (December 2025):**
- **Lines:** 80.32% (target: 90%+)
- **Functions:** 94.88% ✅ (above target)
- **Branches:** 68.17% (target: 80%+)
- **Statements:** 80.41% (target: 90%+)

**Test Suite:**
- 465+ tests passing
- Comprehensive integration tests for API routes
- Test helpers and utilities in place
- Coverage reporting configured with Vitest

**Focus Areas:**
- Branch coverage improvement (testing all conditional paths)
- Edge case coverage
- Error path testing
- Permission combination testing

## Seed Account Information

**Default Admin Account:**
- **Email:** `admin@lms.com`
- **Password:** `admin123`
- **Role:** ADMIN (full permissions)

To seed the database:
```bash
npx prisma db seed
```

---

This implementation guide provides a comprehensive roadmap for building the LMS system. Follow the phases sequentially, and refer to the architecture and API documents for detailed specifications.

**Last Updated:** December 11, 2025
**Status:** Production deployment complete, test coverage improvements in progress

