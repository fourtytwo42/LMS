# System Architecture

## Overview

The LMS follows a modern full-stack architecture using Next.js 16 with the App Router pattern, providing both frontend UI and backend API functionality in a single application.

## High-Level Architecture

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

## Technology Stack

### Frontend
- **Framework:** Next.js 16.0.8 (App Router)
- **UI Library:** React 19.2.1
- **Styling:** Tailwind CSS 4.1.17
- **Icons:** Lucide React 0.556.0
- **Forms:** React Hook Form 7.68.0 + Zod 4.1.13
- **State Management:** Zustand 5.0.9 (client state)
- **Charts:** Recharts 3.5.1
- **PDF Viewer:** react-pdf 10.2.0

### Backend
- **Runtime:** Node.js 20.x LTS
- **Framework:** Next.js 16.0.8 API Routes
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 6.19.0
- **Authentication:** Custom JWT (jsonwebtoken 9.0.3)
- **Password Hashing:** bcryptjs 3.0.3
- **File Upload:** formidable 3.5.4
- **Email:** nodemailer 7.0.11

### Infrastructure
- **Hosting:** Ubuntu 22.04 LTS VM
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx (optional)

## Component Architecture

### Frontend Components

**Layout Components:**
- `DashboardLayout` - Main dashboard wrapper
- `Header` - Top navigation bar
- `Sidebar` - Side navigation menu
- `Footer` - Page footer

**UI Components:**
- `Button`, `Input`, `Select`, `Textarea` - Form controls
- `Card`, `Modal`, `Badge`, `Avatar` - UI elements
- `Table` - Data tables

**Feature Components:**
- `VideoPlayer` - Video playback with progress tracking
- `PDFViewer` - PDF document viewer
- `TestViewer` - Assessment interface
- `AnalyticsDashboard` - Analytics visualizations
- `NotificationCenter` - Notification management

### Backend Architecture

**API Routes Structure:**
```
app/api/
├── auth/          # Authentication endpoints
├── users/         # User management
├── courses/       # Course management
├── learning-plans/# Learning plan management
├── enrollments/   # Enrollment management
├── progress/      # Progress tracking
├── files/         # File management
├── analytics/     # Analytics endpoints
├── notifications/ # Notifications
└── certificates/  # Certificate generation
```

**Authentication Flow:**
1. User submits credentials
2. Server validates and generates JWT tokens
3. Access token stored in HTTP-only cookie
4. Refresh token stored in database
5. Middleware validates token on protected routes

**Authorization:**
- Role-based access control (RBAC)
- Three roles: ADMIN, INSTRUCTOR, LEARNER
- Permission-based access to resources
- Middleware checks roles before route access

## Data Flow

### Request Flow
1. User action → Client Component
2. Client Component → API Route
3. API Route validates JWT and role
4. API Route queries/updates database via Prisma
5. Database returns data
6. API Route returns JSON response
7. Client Component updates UI

### State Management
- **Server State:** Database (source of truth)
- **Client State:** Zustand stores for UI state
- **Form State:** React Hook Form
- **Real-time Updates:** Polling or WebSocket (future)

## Database Schema

See [Database Schema Documentation](./database-schema.md) for detailed information.

Key models:
- User, Role, UserRole
- Course, ContentItem, LearningPlan
- Enrollment, Progress, Completion
- Test, Question, TestAttempt
- File, Certificate, Notification

## File Storage

Files are stored in a local filesystem with organized directory structure:
```
storage/
├── videos/        # Video content
├── pdfs/          # PDF documents
├── ppts/          # PowerPoint files
├── repository/    # Repository files
├── avatars/       # User avatars
├── certificates/  # Generated certificates
├── thumbnails/    # Course thumbnails
└── badges/        # Badge images
```

## Security Architecture

- **Authentication:** JWT tokens in HTTP-only cookies
- **Authorization:** Role-based access control
- **Password Security:** bcrypt hashing (10 rounds)
- **Input Validation:** Zod schemas
- **XSS Prevention:** HTML sanitization
- **CSRF Protection:** Token-based validation
- **Audit Logging:** All actions logged

## Performance Considerations

- **Server Components:** Used for data fetching and SEO
- **Client Components:** Used for interactivity
- **Code Splitting:** Dynamic imports for heavy components
- **Image Optimization:** Next.js Image component
- **Caching:** Next.js built-in caching
- **Database Indexing:** Proper indexes on frequently queried fields

## Scalability

- **Horizontal Scaling:** Stateless API routes
- **Database:** Connection pooling with Prisma
- **File Storage:** Can migrate to S3/Cloud Storage
- **Caching:** Can add Redis for session storage
- **Load Balancing:** Nginx reverse proxy

## Deployment Architecture

- **Process Management:** PM2
- **Build:** Next.js standalone build
- **Database:** PostgreSQL on same or separate server
- **Storage:** Local filesystem (can migrate to cloud)
- **Monitoring:** PM2 monitoring + logs

For detailed deployment information, see [Deployment Guide](./deployment.md).

