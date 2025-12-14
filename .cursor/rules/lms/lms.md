---
title: Learning Management System (LMS)
status: production-ready
category: SaaS / Education
tags: [lms, nextjs, postgresql, education, e-learning, tailwind]
created: 2025-12-09
---

# Learning Management System (LMS)

**Enterprise-grade learning management system** - Comprehensive platform for creating, managing, and delivering online courses with advanced tracking, analytics, and multi-role support.

## Concept

**Problem Statement:** Organizations need a modern, feature-rich learning management system that provides comprehensive course management, progress tracking, assessments, and analytics. Existing solutions are either too expensive, lack customization, or don't provide the granular control needed for enterprise training programs.

**Solution Vision:** A self-hosted, white-label LMS built on modern web technologies that provides instructors and administrators with complete control over content, enrollment, and learner progress while offering learners an intuitive, engaging learning experience.

**Core Philosophy:**
- **Flexibility First:** Courses can be organized into learning plans, reused across multiple plans, and configured with granular permissions
- **Progress Tracking:** Comprehensive tracking of video watch time, test scores, completion status, and time-to-complete metrics
- **Role-Based Access:** Clear separation between learners, instructors, and administrators with appropriate permissions
- **Best Practices:** Modern UI/UX that exceeds industry standards, mobile-responsive, accessible, and performant

**Target Users:**
- **Learners:** Students, employees, or trainees who need to complete courses and track their progress
- **Instructors:** Content creators who build courses, manage enrollments, and view analytics for their assigned content
- **Administrators:** System managers who oversee all content, users, and system configuration

**Success Metrics:**
- User engagement (completion rates, time spent)
- Content creation velocity (courses/learning plans created)
- System performance (page load times, video streaming quality)
- User satisfaction (ratings, reviews)

## Core Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                      │
│  (React 19, Tailwind 4, Server Components, Client Components)│
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/WebSocket
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Next.js API Routes                       │
│  (JWT Auth, Role-Based Access Control, File Upload)         │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  PostgreSQL  │ │  File System│ │   SMTP      │
│  Database    │ │  Storage    │ │   (Optional)│
│  (Prisma)    │ │  (Videos,   │ │             │
│              │ │   PDFs, PPT)│ │             │
└──────────────┘ └─────────────┘ └─────────────┘
```

**Architecture Diagram:** The system follows a modern Next.js full-stack architecture with server-side rendering, API routes for backend logic, PostgreSQL for data persistence, local filesystem for media storage, and optional SMTP for email notifications.

### Component Breakdown

**Component 1: Next.js Application**
- **Responsibility:** Serves as both frontend UI and API backend using Next.js App Router
- **Technology:** Next.js 15.x, React 19, TypeScript 5.x
- **Interactions:** 
  - Server Components for initial page loads and SEO
  - Client Components for interactive features (video player, forms, real-time updates)
  - API Routes for backend logic, authentication, file uploads
- **Dependencies:** 
  - Tailwind CSS 4 for styling
  - Icons library (Lucide React or Heroicons) for UI icons
  - React Hook Form + Zod for form validation
  - Zustand or React Context for client-side state
- **State Management:** 
  - Server state: Database queries via Prisma
  - Client state: Zustand stores for UI state, auth state
  - Form state: React Hook Form
- **Error Handling:** Error boundaries, try-catch in API routes, user-friendly error messages

**Component 2: Authentication & Authorization**
- **Responsibility:** JWT-based authentication with role-based access control (RBAC)
- **Technology:** NextAuth.js or custom JWT implementation, bcrypt for password hashing
- **Interactions:**
  - Login/register endpoints
  - Token refresh mechanism
  - Role verification middleware
- **Dependencies:** jsonwebtoken, bcryptjs, cookie handling
- **State Management:** JWT tokens stored in HTTP-only cookies, refresh tokens in database
- **Error Handling:** Invalid token errors, expired token handling, account lockout logic

**Component 3: Database Layer (PostgreSQL + Prisma)**
- **Responsibility:** Data persistence for users, courses, enrollments, progress, analytics
- **Technology:** PostgreSQL 15+, Prisma ORM 5.x

**Component 4: File Processing & Content Viewing**
- **Responsibility:** Process and serve various content types (videos, PDFs, PowerPoint presentations)
- **Technology:** 
  - Local filesystem for storage
  - LibreOffice for PPTX to PDF conversion (via Python UNO API)
  - react-pdf for PDF viewing (used for both PDFs and converted PPTs)
  - HTML5 video player for video playback
- **Interactions:**
  - File upload API endpoints
  - File serving with authentication
  - PPT to PDF conversion API (converts PPTX to PDF asynchronously on upload)
  - PDF viewer component (displays both PDFs and converted PPTs)
- **Dependencies:**
  - LibreOffice (system dependency for PPT conversion)
  - Python 3 with python3-uno package (for LibreOffice UNO API)
  - Microsoft Core Fonts (ttf-mscorefonts-installer) - Required for proper font rendering in PPT conversions
  - cabextract and unzip (for font installation)
  - react-pdf for PDF rendering
  - File system operations (fs/promises)
- **State Management:** File metadata in database, actual files on filesystem
- **Error Handling:** File not found errors, conversion failures, permission errors
- **Font Requirements:** Microsoft Core Fonts must be installed to prevent font substitution issues (weird characters, thin text) when converting PowerPoint presentations. Without these fonts, LibreOffice will substitute fonts which can cause rendering problems.
- **Interactions:**
  - Prisma Client for type-safe database queries
  - Migrations for schema management
  - Connection pooling for performance
- **Dependencies:** PostgreSQL server, Prisma Client
- **State Management:** Database transactions for data consistency
- **Error Handling:** Database connection errors, transaction rollbacks, constraint violations

**Component 4: File Storage System**
- **Responsibility:** Store and serve videos, PDFs, PowerPoint files, repository files
- **Technology:** Local filesystem with organized directory structure
- **Interactions:**
  - File upload API endpoints
  - File serving endpoints with proper MIME types
  - Video streaming with range requests
- **Dependencies:** Node.js fs module, multer or formidable for uploads
- **State Management:** File metadata stored in database, actual files on disk
- **Error Handling:** File size limits, storage quota checks, file corruption detection

**Component 5: Video Player & Tracking**
- **Responsibility:** Play videos, track watch progress, enforce completion thresholds
- **Technology:** HTML5 video player with custom controls, WebSocket or polling for progress updates
- **Interactions:**
  - Video file serving with range requests
  - Progress tracking API (watch time, position)
  - Completion detection based on configurable percentage
- **Dependencies:** Video.js or custom video player, WebSocket server
- **State Management:** Watch progress stored in database, synced periodically
- **Error Handling:** Video loading errors, network interruptions, resume from last position

**Component 6: Assessment Engine**
- **Responsibility:** Create and deliver tests, grade submissions, track scores
- **Technology:** Custom test engine with question types (single choice, multiple choice, true/false, short answer, fill-in-the-blank)
- **Interactions:**
  - Test creation/editing interface
  - Test delivery with timer and navigation controls
  - Automatic grading for objective questions
  - Manual grading interface for subjective questions
- **Dependencies:** Question repository, scoring algorithms
- **State Management:** Test attempts stored in database, scores calculated on submission
- **Error Handling:** Invalid answers, timeout handling, retake limit enforcement

**Component 7: Analytics & Reporting**
- **Responsibility:** Generate reports, charts, and analytics for instructors and admins
- **Technology:** Chart.js or Recharts for visualizations, CSV export functionality
- **Interactions:**
  - Analytics API endpoints
  - Report generation (per course, per learner, per learning plan)
  - Export to CSV functionality
- **Dependencies:** Charting libraries, CSV generation libraries
- **State Management:** Aggregated data calculated from database queries
- **Error Handling:** Large dataset handling, export file generation errors

### Data Flow

**Request Flow:**
1. User action (e.g., "Enroll in course") → Client Component → API Route
2. API Route validates JWT token and user role
3. API Route queries/updates database via Prisma
4. Database returns data or confirms update
5. API Route returns JSON response
6. Client Component updates UI based on response

**Event Flow:**
- Video progress updates: Video player → Progress API → Database (every 5-10 seconds)
- Course completion: All items completed → Check prerequisites → Unlock next course
- Enrollment notifications: Enrollment created → Notification service → Toast + Email (if enabled)

**State Synchronization:**
- Server state (database) is source of truth
- Client state (UI) syncs via API calls
- Real-time updates use WebSocket or polling for progress tracking
- Optimistic UI updates where appropriate (e.g., enrollment buttons)

### Technology Choices

**Why Next.js 16?**
- **Server Components:** Better performance and SEO for content-heavy pages
- **API Routes:** Unified full-stack framework, no separate backend needed
- **File-based Routing:** Intuitive organization of routes and pages
- **Built-in Optimizations:** Image optimization, code splitting, automatic static optimization
- **Async Route Params:** Dynamic route parameters are now promises (Next.js 16 change)
- **Alternatives Considered:** Remix (less mature ecosystem), SvelteKit (smaller community)
- **Trade-offs:** Some learning curve for Server Components and async params, but worth it for performance

**Demo Accounts:**
- `admin@lms.com` / `admin123` - Administrator with full system access
- `instructor@lms.com` / `instructor123` - Instructor for course management
- `learner@lms.com` / `learner123` - Learner in Public group
- `learner2@lms.com` / `learner123` - Learner in Staff group

**Database Reset:**
- Run `npm run db:reset` to wipe and reseed the database with clean demo data
- Script can be scheduled (e.g., daily via cron) for automatic resets
- Removes all users except the 4 demo accounts
- Creates fresh Public and Staff groups

**Why PostgreSQL?**
- **ACID Compliance:** Critical for enrollment, progress tracking, and financial data integrity
- **Relational Data:** Perfect for complex relationships (users, courses, enrollments, progress)
- **Scalability:** Can handle large datasets and complex queries efficiently
- **Prisma Support:** Excellent TypeScript integration, type-safe queries
- **Alternatives Considered:** MongoDB (less suitable for relational data), MySQL (PostgreSQL has better JSON support)
- **Trade-offs:** Requires more setup than NoSQL, but provides better data integrity

**Why Tailwind CSS 4?**
- **Utility-First:** Rapid UI development, consistent design system
- **Performance:** Purges unused styles, small bundle size
- **Modern Features:** Latest CSS features, excellent dark mode support
- **Developer Experience:** Great IntelliSense, easy customization
- **Alternatives Considered:** CSS Modules (more verbose), Styled Components (runtime overhead)
- **Trade-offs:** HTML can get verbose, but productivity gains are significant

**Why Local Filesystem Storage?**
- **Simplicity:** No external service dependencies, easier deployment
- **Cost:** No storage fees, full control over files
- **Performance:** Direct file access, no network latency
- **Alternatives Considered:** AWS S3 (adds complexity and cost), Cloudinary (overkill for self-hosted)
- **Trade-offs:** Need to manage backups manually, but acceptable for initial version

**Version Selection:**
- **Next.js 16.0.8:** Latest stable with App Router improvements and async route params
- **React 19.2.1:** Latest React with improved Server Components support
- **PostgreSQL 15+:** Latest stable with performance improvements
- **Prisma 6.19.0:** Latest with improved performance and TypeScript support
- **Tailwind CSS 4.1.17:** Latest with new features, improved performance, and `@import "tailwindcss"` syntax

## Status

**Current Phase:** Production Ready - Feature Complete

**Last Updated:** December 14, 2025

### Completed ✅

- ✅ Database schema design and implementation
- ✅ Development environment setup
- ✅ Project structure created
- ✅ Authentication system (JWT-based with HTTP-only cookies)
- ✅ Core course management features
- ✅ Video player with progress tracking and duration detection
- ✅ Assessment engine with auto-grading
- ✅ Analytics and reporting dashboards with enrolled users details
- ✅ File repository system
- ✅ Notifications system
- ✅ Admin dashboard with comprehensive stats
- ✅ Instructor dashboard with course management
- ✅ Learner dashboard with progress tracking
- ✅ Certificate generation system
- ✅ Bulk import/export functionality
- ✅ Test coverage improvements (80%+ coverage)
- ✅ Next.js 16 upgrade and async params migration
- ✅ Tailwind CSS v4 configuration
- ✅ PM2 production deployment
- ✅ Navigation menu with role-based access
- ✅ CSS styling fixes and base styles with proper spacing
- ✅ Dark/Light mode toggle with localStorage persistence and centralized theme management
- ✅ Collapsible sidebar with unique icons, tooltips, and localStorage persistence (defaults to collapsed)
- ✅ Expandable content items on course detail page with inline players
- ✅ Inline video player, PDF viewer, and PPT viewer with slide extraction
- ✅ File serving endpoint for content items (VIDEO, PDF, PPT) and user files (AVATAR, THUMBNAIL, COVER)
- ✅ PPT to PDF conversion: PowerPoint presentations are automatically converted to PDF using LibreOffice UNO API for reliable viewing. Conversion happens asynchronously on upload to avoid blocking. Microsoft Core Fonts are required for proper font rendering.
- ✅ Video progress tracking with stored duration support and periodic DB updates (every 5 seconds)
- ✅ Content item API endpoint fixes
- ✅ Locked content handling with user-friendly messages
- ✅ Avatar upload with auto-save and full URL generation
- ✅ Course type field removed (all courses are E-LEARNING)
- ✅ UI spacing improvements across all pages
- ✅ Dark mode color fixes for all components (badges, icons, tables, forms)
- ✅ E2E testing suite with Playwright (75+ tests)
- ✅ Header layout: LMS on left, all navigation items (theme toggle, notifications, user info, logout) on right
- ✅ Footer: Fixed at bottom of viewport, spanning full page width, centered text with GitHub link
- ✅ Sidebar: Extended to footer with proper fixed positioning
- ✅ Courses listing page: Full-width expandable grid (up to 5 columns on 2xl screens) with pagination
- ✅ Course and learning plan detail pages: Max-width constraints (max-w-7xl) for better readability
- ✅ Learning plan creation: Estimated time, difficulty level, and max enrollments are now optional fields
- ✅ Theme toggle: Moon icon changed to black for better visibility
- ✅ Global UI scaling: 87.5% zoom applied for better content fit
- ✅ Search inputs: Fixed width (w-64) and positioned on right side of all table sections
- ✅ Enrollment management pages for courses and learning plans with search, filter, and pagination
- ✅ Bulk selection and actions: Select one, multiple, or all users/enrollments with bulk delete and update operations
- ✅ Self-unenroll functionality: Learners can unenroll themselves from courses
- ✅ Auto-group assignment: Users are automatically added to "Public" group when self-enrolling
- ✅ Instructor permissions: Instructors enrolled in learning plans get admin access to all courses in the plan
- ✅ Updated seed script: Creates only 4 demo accounts (admin, instructor, 2 learners) with Public and Staff groups
- ✅ Database reset script: Automated script to wipe and reseed database for demo purposes (`npm run db:reset`)
- ✅ Course code field removed: No longer required or displayed in course forms
- ✅ Learning plan code field removed: No longer required in create form (optional in edit)
- ✅ Learning plan image uploads: Added cover image upload functionality (replaces URL inputs, single coverImage field used for both thumbnail and cover purposes)
- ✅ Optional field validation: Fixed validation for estimated time, difficulty level, and max enrollments in courses and learning plans
- ✅ Cover image path handling: Fixed file serving to handle paths with/without `/storage` prefix
- ✅ Fixed header: Header now stays fixed at top while content scrolls
- ✅ Standardized image format: All course and learning plan images use wide format (16:9) with `object-contain` to show full image without cropping
- ✅ Reusable table components: Created DataTable, TableToolbar, and TablePagination components for consistent table UI across all pages
- ✅ Table view standardization: All pages (courses, learning plans, users, groups, categories, enrollments) now use unified table template
- ✅ Card view removal: Removed card/toggle views from courses and learning plans pages, all pages now use table view only
- ✅ Bulk actions standardization: Consistent bulk action patterns across all table pages with reusable components
- ✅ Unified editor pages: Combined view and edit pages for courses and learning plans into tabbed editor interfaces (Details, Training Material/Courses, Enrollments, Settings)
- ✅ Content item modal: Reusable ContentItemModal component for adding and editing content items inline
- ✅ Categories removed: Removed categories from sidebar menu and all course/learning plan forms
- ✅ Learning plans display: Course editor shows all learning plans containing the course with clickable links to learning plan courses tab
- ✅ Courses table in learning plans: Converted courses tab in learning plan editor to table format with course images, detailed information, selection, and bulk delete actions
- ✅ Simplified learner dashboard: New learner-focused dashboard with Available, In Progress, and Completed sections, no sidebar, elegant card-based UI
- ✅ Learner course access: Learners can now access and consume course material directly from course detail pages
- ✅ Group-based access filtering: API automatically filters learning plans and courses based on learner group membership
- ✅ Conditional sidebar: Sidebar automatically hidden for learners on learner dashboard page (header and footer remain visible)

### In Progress 🔄

- 🔄 Test coverage improvements (targeting 90%+ across all metrics)
- 🔄 Branch coverage optimization (currently 68%, targeting 80%+)

### Next Steps

- [ ] Complete test coverage to 90%+ (branches, lines, functions, statements)
- [ ] Performance optimization and profiling
- [ ] Accessibility audit and improvements
- [ ] Mobile responsiveness testing and fixes
- [ ] Security audit
- [ ] Production monitoring setup
- [ ] Backup and disaster recovery procedures
- [ ] Documentation finalization

## Project Artifacts

**Architecture:**
- [Detailed Architecture](lms-architecture.md) - Complete system design, database schema, component interactions, technology stack details

**API:**
- [API Specifications](lms-api.md) - All API endpoints, request/response formats, authentication, WebSocket events

**Implementation:**
- [Build Plan & Implementation Guide](lms-implementation.md) - Phased development approach, setup instructions, coding patterns, deployment strategy

## Related Projects

- [PPT-to-Video Automation Platform](ppt-to-video-automation/ppt-to-video-automation.md) - Could integrate for automated course content generation
- [AI Hivemind System](ai-hivemind-system/ai-hivemind-system.md) - Potential integration for AI-powered course recommendations or content generation

