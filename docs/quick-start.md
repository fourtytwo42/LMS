# Quick Start Guide

Get the LMS up and running in minutes.

## Prerequisites

- Node.js 20.x installed
- PostgreSQL 15+ installed and running
- Git installed

## 5-Minute Setup

### 1. Clone and Install

```bash
git clone https://github.com/fourtytwo42/LMS.git
cd lms
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lms?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_EXPIRES_IN="3d"
JWT_REFRESH_EXPIRES_IN="30d"
STORAGE_PATH="./storage"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Setup Database

```bash
# Create database
createdb lms

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### 4. Create Storage Directories

```bash
mkdir -p storage/{videos,pdfs,ppts,repository,avatars,certificates,thumbnails,badges}
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and log in with one of the demo accounts:
- **Admin:** `admin@lms.com` / `admin123`
- **Instructor:** `instructor@lms.com` / `instructor123`
- **Learner (Public):** `learner@lms.com` / `learner123`
- **Learner (Staff):** `learner2@lms.com` / `learner123`

All demo accounts are available on the login page for quick access.

## Next Steps

- Read the [Installation Guide](./installation.md) for detailed setup
- Check the [Development Guide](./development.md) for development workflows
- Review the [API Reference](./api-reference.md) for API documentation
- See the [User Guides](./admin-guide.md) for usage instructions

## Common Issues

**Port already in use:**
```bash
# Use different port
PORT=3001 npm run dev
```

**Database connection error:**
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Verify database exists

**Build errors:**
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

For more help, see the [Troubleshooting Guide](./troubleshooting.md).

