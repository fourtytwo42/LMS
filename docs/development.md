# Development Guide

Complete guide for developing and contributing to the LMS application.

## Development Setup

### Prerequisites

- Node.js 20.x LTS
- PostgreSQL 15+
- npm/yarn/pnpm
- Git

### Initial Setup

1. **Clone and Install:**
```bash
git clone https://github.com/fourtytwo42/LMS.git
cd lms
npm install
```

2. **Environment Configuration:**
Create `.env.local` with required variables (see [Configuration](./configuration.md))

3. **Database Setup:**
```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

**Reset Database (for demo/testing):**
```bash
npm run db:reset
```
This will wipe all data and reseed with 4 demo accounts:
- `admin@lms.com` / `admin123` (Admin)
- `instructor@lms.com` / `instructor123` (Instructor)
- `learner@lms.com` / `learner123` (Learner - Public group)
- `learner2@lms.com` / `learner123` (Learner - Staff group)

4. **Start Development Server:**
```bash
npm run dev
```

**Using PM2 for Development:**
```bash
# PM2 is configured for development mode by default
pm2 start ecosystem.config.js
pm2 logs lms
```

**Note:** The `ecosystem.config.js` uses `npm run dev` for development, not `npm start`. This ensures hot reloading and doesn't require a build step.

## Project Structure

```
lms/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # UI components
│   │   ├── layout/       # Layout components
│   │   ├── forms/        # Form components
│   │   └── ...
│   ├── lib/              # Utilities and helpers
│   │   ├── auth/         # Authentication utilities
│   │   ├── db/           # Database utilities
│   │   └── storage/      # File storage utilities
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript types
├── prisma/               # Prisma schema and migrations
├── storage/              # File storage (gitignored)
├── __tests__/            # Test files
└── docs/                 # Documentation
```

## Coding Standards

### TypeScript

- Use strict mode
- Define types in `src/types/`
- Use interfaces for object shapes
- Use types for unions and intersections

### Component Structure

**Server Components** (default):
```typescript
// app/courses/page.tsx
import { prisma } from '@/lib/db/prisma';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany();
  return <div>{/* ... */}</div>;
}
```

**Client Components** (when needed):
```typescript
// src/components/course-card.tsx
'use client';

import { useState } from 'react';

export function CourseCard({ course }: { course: Course }) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

### API Routes

**Structure:**
```typescript
// app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    // Authorization check
    // Query logic
    return NextResponse.json({ courses });
  } catch (error) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
```

**Next.js 16 Async Params:**
```typescript
// For dynamic routes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Must await in Next.js 16
  // ...
}
```

### Form Handling

Use React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(255),
  description: z.string(),
});

type FormData = z.infer<typeof schema>;

export function CourseForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  // ...
}
```

## Development Workflow

### Making Changes

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run tests: `npm test`
5. Check coverage: `npm run test:coverage`
6. Build: `npm run build`
7. Commit and push

### Testing

**Run Tests:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

**Test Structure:**
- Unit tests: `__tests__/unit/`
- Integration tests: `__tests__/integration/`
- E2E tests: `__tests__/e2e/`

### Code Quality

**Linting:**
```bash
npm run lint
```

**Type Checking:**
```bash
npx tsc --noEmit
```

## Common Tasks

### Adding a New API Endpoint

1. Create route file: `app/api/feature/route.ts`
2. Implement GET/POST/PUT/DELETE handlers
3. Add authentication middleware
4. Add authorization checks
5. Write integration tests
6. Update API documentation

### Adding a New Page

1. Create page file: `app/(dashboard)/feature/page.tsx`
2. Add to navigation menu if needed
3. Implement page component
4. Add responsive design
5. Test on different screen sizes

### Adding a New Component

1. Create component: `src/components/feature/component.tsx`
2. Add to appropriate directory
3. Export from index if needed
4. Write component tests
5. Add to Storybook (if applicable)

### Using Reusable Table Components

All table pages should use the reusable table components for consistency:

**Components:**
- `DataTable` - Main table component with selection, bulk actions, and customizable columns
- `TableToolbar` - Toolbar with search, filters, and custom actions
- `TablePagination` - Pagination component

**Example:**
```typescript
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";

// Define columns
const columns: Record<string, Column<Item>> = {
  name: {
    key: "name",
    header: "Name",
    render: (item) => <div>{item.name}</div>,
  },
  status: {
    key: "status",
    header: "Status",
    render: (item) => <Badge>{item.status}</Badge>,
  },
  actions: {
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (item) => (
      <IconButton
        icon={<Edit />}
        label="Edit"
        onClick={() => handleEdit(item.id)}
      />
    ),
  },
};

// Use in page
<TableToolbar
  search={{
    value: search,
    onChange: setSearch,
    placeholder: "Search...",
  }}
  filters={[
    {
      value: filter,
      onChange: setFilter,
      options: [
        { value: "", label: "All" },
        { value: "active", label: "Active" },
      ],
    },
  ]}
/>

<DataTable
  data={items}
  columns={columns}
  loading={loading}
  emptyMessage="No items found"
  selectedIds={selectedIds}
  onSelectAll={handleSelectAll}
  onSelectItem={handleSelectItem}
  getId={(item) => item.id}
  bulkActions={[
    {
      label: "Delete",
      onClick: handleBulkDelete,
      variant: "danger",
      show: isAdmin,
    },
  ]}
/>

{pagination.totalPages > 1 && (
  <TablePagination
    pagination={pagination}
    onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
    itemName="items"
  />
)}
```

**Benefits:**
- Consistent UI/UX across all table pages
- Reduced code duplication
- Easy to maintain and update
- Built-in selection and bulk actions support

### Database Changes

1. Update Prisma schema: `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name migration-name`
3. Generate Prisma Client: `npx prisma generate`
4. Update TypeScript types
5. Update related code

## Best Practices

### Performance

- Use Server Components for data fetching
- Use Client Components only when needed
- Implement proper loading states
- Use Next.js Image component
- Lazy load heavy components
- Optimize database queries

### Security

- Always validate input with Zod
- Use parameterized queries (Prisma handles this)
- Check permissions before operations
- Sanitize user input
- Use HTTP-only cookies for tokens
- Hash passwords with bcrypt

### Error Handling

- Use try-catch blocks
- Return appropriate HTTP status codes
- Provide user-friendly error messages
- Log errors for debugging
- Use error boundaries for React errors

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast ratios

## Debugging

### Common Issues

**Build Errors:**
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all imports are correct
- Check for unused variables

**Runtime Errors:**
- Check browser console
- Check server logs
- Verify environment variables
- Check database connection

**Database Issues:**
- Verify DATABASE_URL is correct
- Check Prisma Client is generated
- Verify migrations are applied

### Debug Tools

- **Next.js Dev Tools:** Built-in debugging
- **React DevTools:** Component inspection
- **Prisma Studio:** Database GUI: `npx prisma studio`
- **PM2 Logs:** Production logs: `pm2 logs lms`

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/documentation-update` - Documentation
- `refactor/component-name` - Refactoring

### Commit Messages

Follow conventional commits:
- `feat: add user profile page`
- `fix: resolve login redirect issue`
- `docs: update API documentation`
- `refactor: improve course card component`

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

