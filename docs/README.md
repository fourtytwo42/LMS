# LMS Documentation

Welcome to the Learning Management System (LMS) documentation. This documentation provides comprehensive information about the application, its architecture, setup, usage, and development.

## Documentation Index

### Getting Started
- [Installation Guide](./installation.md) - How to set up and install the LMS
- [Quick Start Guide](./quick-start.md) - Get up and running quickly
- [Configuration](./configuration.md) - Environment variables and configuration

### Architecture & Design
- [System Architecture](./architecture.md) - High-level system design and components
- [Database Schema](./database-schema.md) - Database structure and relationships
- [API Reference](./api-reference.md) - Complete API endpoint documentation
- [Authentication & Authorization](./authentication.md) - Auth system and RBAC

### Development
- [Development Guide](./development.md) - Development setup and workflows
- [Coding Standards](./coding-standards.md) - Code style and conventions
- [Testing Guide](./testing.md) - Testing strategies and coverage
- [Deployment Guide](./deployment.md) - Production deployment instructions

### User Guides
- [Admin Guide](./admin-guide.md) - Administrator user manual
- [Instructor Guide](./instructor-guide.md) - Instructor user manual
- [Learner Guide](./learner-guide.md) - Learner user manual

### Operations
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Maintenance](./maintenance.md) - System maintenance procedures
- [Backup & Recovery](./backup-recovery.md) - Backup and recovery procedures

## Project Overview

The LMS is an enterprise-grade learning management system built with:
- **Frontend:** Next.js 16.0.8, React 19.2.1, Tailwind CSS 4.1.17
- **Backend:** Next.js API Routes, Node.js 20.x
- **Database:** PostgreSQL 15+ with Prisma 6.19.0
- **Authentication:** JWT-based with HTTP-only cookies
- **File Storage:** Local filesystem

## Current Status

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** December 13, 2025

### Features
- ✅ User management with role-based access control
- ✅ Course and learning plan management
- ✅ Content management (videos, PDFs, PPTs, YouTube, HTML, external links)
- ✅ Expandable content items with inline players (video, PDF, PPT)
- ✅ Assessment engine with auto-grading
- ✅ Video progress tracking with duration detection and periodic DB updates
- ✅ Progress tracking and analytics with enrolled users details
- ✅ Certificate generation
- ✅ Notifications system
- ✅ File repository system with secure file serving
- ✅ Avatar upload with auto-save and full URL generation
- ✅ Dark/light mode toggle with persistent preferences and centralized theme management
- ✅ Collapsible sidebar with unique icons, tooltips, and localStorage persistence (defaults to collapsed)
- ✅ UI spacing and padding improvements across all pages
- ✅ Header layout: LMS on left, navigation items on right
- ✅ Footer: Fixed at bottom, spanning full page width
- ✅ Courses listing: Full-width expandable grid with pagination (up to 5 columns on large screens)
- ✅ Course/learning plan detail pages: Max-width constraints for optimal readability
- ✅ Learning plan creation: Optional fields (estimated time, difficulty, max enrollments)
- ✅ Global UI scaling: 87.5% zoom for better content fit
- ✅ Comprehensive test coverage (80%+)
- ✅ Demo accounts for quick testing
- ✅ E2E testing with Playwright (75+ tests passing)

## Quick Links

- **GitHub Repository:** https://github.com/fourtytwo42/LMS
- **API Base URL:** `/api`
- **Default Admin Account:** `admin@lms.com` / `admin123`

## Support

For issues, questions, or contributions, please refer to the relevant documentation section or open an issue on GitHub.

