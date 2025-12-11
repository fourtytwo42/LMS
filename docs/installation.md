# Installation Guide

This guide will help you install and set up the LMS application.

## Prerequisites

Before installing the LMS, ensure you have the following installed:

- **Node.js:** 20.x LTS or higher
- **PostgreSQL:** 15+ (or use Docker)
- **npm/yarn/pnpm:** Latest version
- **Git:** For version control

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/fourtytwo42/LMS.git
cd lms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lms?schema=public"

# JWT Authentication
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

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with initial data
npx prisma db seed
```

### 5. Create Storage Directories

```bash
mkdir -p storage/{videos,pdfs,ppts,repository,avatars,certificates,thumbnails,badges}
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Accounts

After seeding the database, you can log in with:

- **Email:** `admin@lms.com`
- **Password:** `admin123`
- **Role:** ADMIN

## Production Installation

For production installation, see the [Deployment Guide](./deployment.md).

## Troubleshooting

If you encounter issues during installation, see the [Troubleshooting Guide](./troubleshooting.md).

