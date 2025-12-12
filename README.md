# Learning Management System (LMS)

A comprehensive, enterprise-grade Learning Management System built with Next.js 16, React 19, PostgreSQL, and Prisma.

## 🚀 Quick Start

Get up and running in minutes:

```bash
# Clone the repository
git clone https://github.com/fourtytwo42/LMS.git
cd lms

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Setup database
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` and log in with:
- **Email:** `admin@lms.com`
- **Password:** `admin123`

For detailed setup instructions, see the [Quick Start Guide](./docs/quick-start.md).

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

### Getting Started
- **[Quick Start Guide](./docs/quick-start.md)** - Get up and running quickly
- **[Installation Guide](./docs/installation.md)** - Detailed installation instructions
- **[Configuration Guide](./docs/configuration.md)** - Environment variables and configuration

### Architecture & Design
- **[System Architecture](./docs/architecture.md)** - High-level system design and components
- **[Database Schema](./docs/database-schema.md)** - Complete database structure and relationships
- **[API Reference](./docs/api-reference.md)** - Complete API endpoint documentation
- **[Authentication & Authorization](./docs/authentication.md)** - Auth system and RBAC

### Development
- **[Development Guide](./docs/development.md)** - Development setup and workflows
- **[Coding Standards](./docs/coding-standards.md)** - Code style and conventions
- **[Testing Guide](./docs/testing.md)** - Testing strategies and coverage
- **[Deployment Guide](./docs/deployment.md)** - Production deployment instructions

### User Guides
- **[Admin Guide](./docs/admin-guide.md)** - Administrator user manual
- **[Instructor Guide](./docs/instructor-guide.md)** - Instructor user manual
- **[Learner Guide](./docs/learner-guide.md)** - Learner user manual

### Operations
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions
- **[Maintenance](./docs/maintenance.md)** - System maintenance procedures
- **[Backup & Recovery](./docs/backup-recovery.md)** - Backup and recovery procedures

## ✨ Features

- ✅ **User Management** - Role-based access control (Admin, Instructor, Learner)
- ✅ **Course Management** - Create, manage, and publish courses
- ✅ **Learning Plans** - Organize courses into structured learning paths
- ✅ **Content Management** - Videos, PDFs, PowerPoint presentations
- ✅ **Assessment Engine** - Tests with auto-grading and multiple question types
- ✅ **Progress Tracking** - Track learner progress through courses
- ✅ **Analytics Dashboard** - Comprehensive analytics and reporting
- ✅ **Certificate Generation** - Automated certificate creation
- ✅ **Notifications System** - Real-time notifications for users
- ✅ **File Repository** - Centralized file management system
- ✅ **Self-Enrollment** - Public courses with self-enrollment
- ✅ **Comprehensive Testing** - 80%+ test coverage

## 🛠️ Technology Stack

- **Frontend:** Next.js 16.0.8, React 19.2.1, Tailwind CSS 4.1.17
- **Backend:** Next.js API Routes, Node.js 20.x
- **Database:** PostgreSQL 15+ with Prisma 6.19.0
- **Authentication:** JWT with HTTP-only cookies
- **File Storage:** Local filesystem (configurable)
- **Testing:** Vitest, Playwright

## 📋 Prerequisites

- Node.js 20.x LTS or higher
- PostgreSQL 15+ (or Docker)
- npm/yarn/pnpm

## 🏗️ Project Structure

```
lms/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── src/
│   ├── components/        # React components
│   ├── lib/              # Utilities and helpers
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript types
├── prisma/               # Prisma schema and migrations
├── storage/              # File storage (gitignored)
├── __tests__/            # Test files
└── docs/                 # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🚢 Deployment

For production deployment, see the [Deployment Guide](./docs/deployment.md).

Quick production setup:
```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio

## 🔒 Security

- JWT authentication with HTTP-only cookies
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation with Zod
- SQL injection prevention (Prisma)
- XSS protection
- CSRF protection

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License

## 🐛 Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/fourtytwo42/LMS/issues).

## 📞 Support

For support and questions:
- Check the [Documentation](./docs/README.md)
- Review the [Troubleshooting Guide](./docs/troubleshooting.md)
- Open an issue on GitHub

## 🙏 Acknowledgments

Built with modern web technologies and best practices.

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** December 12, 2025

## Recent Updates

- ✅ Fixed input text color visibility issues
- ✅ Improved global CSS and theming
- ✅ Enhanced login experience with demo accounts
- ✅ Fixed authentication redirect issues
- ✅ Updated PM2 configuration for development
- ✅ Improved E2E test coverage (75+ tests passing)

