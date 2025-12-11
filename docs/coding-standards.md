# Coding Standards

Code style, conventions, and best practices for the LMS project.

## TypeScript Standards

### Type Definitions

- Use interfaces for object shapes
- Use types for unions and intersections
- Export types from `src/types/` directory
- Use strict mode (`strict: true` in tsconfig.json)

**Example:**
```typescript
// src/types/course.ts
export interface Course {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export type CourseStatus = Course['status'];
```

### Naming Conventions

- **Variables:** `camelCase`
- **Functions:** `camelCase`
- **Components:** `PascalCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Files:** `kebab-case.tsx` or `PascalCase.tsx` for components

### Code Organization

```typescript
// 1. Imports (external, then internal)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 2. Type definitions
interface RequestBody {
  title: string;
}

// 3. Constants
const MAX_TITLE_LENGTH = 255;

// 4. Functions
export async function POST(request: NextRequest) {
  // Implementation
}
```

## React/Next.js Standards

### Component Structure

**Server Component (default):**
```typescript
// app/courses/page.tsx
import { prisma } from '@/lib/db/prisma';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany();
  return <div>{/* ... */}</div>;
}
```

**Client Component:**
```typescript
// src/components/course-card.tsx
'use client';

import { useState } from 'react';

export function CourseCard({ course }: { course: Course }) {
  // Component logic
}
```

### Hooks Usage

- Use hooks at the top of component
- Don't call hooks conditionally
- Use custom hooks for reusable logic
- Name custom hooks with `use` prefix

### Props

- Use TypeScript interfaces for props
- Destructure props in function signature
- Provide default values when appropriate

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  // ...
}
```

## API Route Standards

### Structure

```typescript
// app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// Schema definition
const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
});

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await authenticate(request);
    
    // 2. Authorize
    if (!user.roles.includes('ADMIN') && !user.roles.includes('INSTRUCTOR')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // 3. Query
    const courses = await prisma.course.findMany();
    
    // 4. Return
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
```

### Next.js 16 Async Params

For dynamic routes, always await params:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Must await
  // Use id instead of params.id
}
```

## Error Handling

### API Routes

```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: error.errors },
      { status: 400 }
    );
  }
  
  if (error.message === 'UNAUTHORIZED') {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    { status: 500 }
  );
}
```

### Client Components

```typescript
try {
  const response = await fetch('/api/courses');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
}
```

## Form Handling

### React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CourseForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
    },
  });
  
  const onSubmit = async (data: FormData) => {
    // Submit logic
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Database Queries

### Prisma Best Practices

**Use select to limit fields:**
```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
});
```

**Use include for relations:**
```typescript
const course = await prisma.course.findUnique({
  where: { id },
  include: {
    category: true,
    createdBy: {
      select: { id: true, firstName: true, lastName: true },
    },
  },
});
```

**Use transactions for multiple operations:**
```typescript
await prisma.$transaction([
  prisma.course.create({ data: courseData }),
  prisma.enrollment.create({ data: enrollmentData }),
]);
```

## File Organization

### Directory Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── layout/          # Layout components
│   ├── forms/           # Form components
│   └── feature/         # Feature-specific components
├── lib/
│   ├── auth/            # Authentication utilities
│   ├── db/              # Database utilities
│   └── utils/           # General utilities
├── store/               # Zustand stores
└── types/               # TypeScript types
```

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `kebab-case.ts`
- Tests: `*.test.ts` or `*.spec.ts`

## Comments & Documentation

### Code Comments

```typescript
// Good: Explains why, not what
// Use bcrypt with 10 rounds for password hashing
const hash = await bcrypt.hash(password, 10);

// Bad: States the obvious
// Hash the password
const hash = await bcrypt.hash(password, 10);
```

### Function Documentation

```typescript
/**
 * Creates a new course with the provided data.
 * 
 * @param data - Course creation data
 * @param userId - ID of the user creating the course
 * @returns Created course with relations
 * @throws {Error} If user doesn't have permission
 */
async function createCourse(data: CreateCourseInput, userId: string) {
  // Implementation
}
```

## Testing Standards

### Test Structure

```typescript
describe('Course API', () => {
  describe('GET /api/courses', () => {
    it('should return courses for authenticated user', async () => {
      // Test implementation
    });
    
    it('should return 401 for unauthenticated request', async () => {
      // Test implementation
    });
  });
});
```

### Test Naming

- Use descriptive test names
- Follow pattern: `should [expected behavior] when [condition]`
- Group related tests with `describe` blocks

## Git Standards

### Commit Messages

Follow conventional commits:
- `feat: add user profile page`
- `fix: resolve login redirect issue`
- `docs: update API documentation`
- `refactor: improve course card component`
- `test: add tests for enrollment API`
- `chore: update dependencies`

### Branch Naming

- `feature/feature-name`
- `fix/bug-name`
- `docs/documentation-update`
- `refactor/component-name`

## Performance Standards

### Optimization

- Use Server Components for data fetching
- Lazy load heavy components
- Optimize images with Next.js Image
- Use proper database indexes
- Implement pagination for large datasets
- Cache frequently accessed data

### Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

## Security Standards

### Input Validation

- Always validate input with Zod
- Sanitize user input
- Use parameterized queries (Prisma handles this)
- Check permissions before operations

### Authentication

- Always check authentication
- Verify user roles
- Use HTTP-only cookies for tokens
- Implement proper token refresh

## Accessibility Standards

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Maintain color contrast
- Test with screen readers

## Code Review Checklist

- [ ] Code follows TypeScript standards
- [ ] Components are properly structured
- [ ] Error handling is implemented
- [ ] Input validation is present
- [ ] Authentication/authorization checks
- [ ] Tests are written
- [ ] Documentation is updated
- [ ] No console.logs in production code
- [ ] No hardcoded values
- [ ] Responsive design considered

