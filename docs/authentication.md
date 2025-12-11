# Authentication & Authorization

Complete guide to the authentication and authorization system.

## Authentication System

The LMS uses JWT (JSON Web Tokens) for authentication with HTTP-only cookies for secure token storage.

### Authentication Flow

1. **Login:**
   - User submits email and password
   - Server validates credentials
   - Server generates access token and refresh token
   - Access token stored in HTTP-only cookie
   - Refresh token stored in database
   - User data returned to client

2. **Token Refresh:**
   - Client requests token refresh
   - Server validates refresh token
   - Server generates new access token
   - New access token stored in HTTP-only cookie

3. **Protected Routes:**
   - Client makes request to protected route
   - Server reads access token from cookie
   - Server validates token
   - Server checks user permissions
   - Request proceeds if authorized

4. **Logout:**
   - Client requests logout
   - Server clears access token cookie
   - Server invalidates refresh token
   - User session terminated

## JWT Token Structure

### Access Token

**Payload:**
```json
{
  "userId": "user_id",
  "email": "user@example.com",
  "roles": ["ADMIN", "INSTRUCTOR"],
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Storage:** HTTP-only cookie (`accessToken`)
**Expiration:** Configurable (default: 3 days)
**Usage:** Sent with every authenticated request

### Refresh Token

**Storage:** Database (`RefreshToken` table)
**Expiration:** Configurable (default: 30 days)
**Usage:** Used to obtain new access tokens

## Authorization System

### Role-Based Access Control (RBAC)

The system uses three primary roles:

#### ADMIN
- Full system access
- User management
- System configuration
- All course and learning plan management
- Analytics access
- Certificate template management

#### INSTRUCTOR
- Create and manage own courses
- View assigned courses
- Manage enrollments for own courses
- View analytics for own courses
- Create tests and questions
- Upload files

#### LEARNER
- View published courses
- Self-enroll in courses (if enabled)
- Take tests
- View own progress
- Download certificates
- View own enrollments

### Permission System

Permissions are stored in the `Role` model as a JSON array:

```json
{
  "permissions": [
    "course:create",
    "course:edit:own",
    "enrollment:create",
    "analytics:view:own"
  ]
}
```

**Permission Format:** `resource:action[:scope]`

Examples:
- `course:create` - Create any course
- `course:edit:own` - Edit own courses only
- `analytics:view:own` - View own analytics only
- `*` - All permissions (ADMIN only)

## Authentication Middleware

### Server-Side

```typescript
// lib/auth/middleware.ts
import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { prisma } from '@/lib/db/prisma';

export async function authenticate(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

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
}
```

### Usage in API Routes

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    
    // Check role
    if (!user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Proceed with request
    // ...
  } catch (error) {
    // Handle authentication errors
  }
}
```

## Client-Side Authentication

### Auth Store (Zustand)

```typescript
// store/auth-store.ts
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### Protected Routes

Routes under `app/(dashboard)/` are automatically protected by the layout:

```typescript
// app/(dashboard)/layout.tsx
export default async function ProtectedLayout({ children }) {
  const token = cookies().get('accessToken')?.value;
  
  if (!token) {
    redirect('/login');
  }
  
  try {
    verifyToken(token);
  } catch {
    redirect('/login');
  }
  
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

## Password Security

### Hashing

Passwords are hashed using bcrypt with 10 rounds:

```typescript
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash(password, 10);
```

### Validation

Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Validated using Zod schema:

```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');
```

## Security Best Practices

### Token Security

- ✅ HTTP-only cookies (prevents XSS)
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite attribute (CSRF protection)
- ✅ Short expiration times
- ✅ Refresh token rotation

### Password Security

- ✅ Bcrypt hashing (10 rounds)
- ✅ Strong password requirements
- ✅ No password storage in plain text
- ✅ Password reset functionality

### Additional Security

- ✅ Input validation (Zod)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS prevention (HTML sanitization)
- ✅ CSRF protection (SameSite cookies)
- ✅ Rate limiting (recommended for production)

## Token Refresh Flow

```typescript
// Client-side token refresh
async function refreshToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  
  if (response.ok) {
    const { user } = await response.json();
    useAuthStore.getState().login(user);
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

## Logout Flow

```typescript
// Client-side logout
async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  
  useAuthStore.getState().logout();
  router.push('/login');
}
```

## Troubleshooting

### Token Expired

- Client should automatically refresh token
- If refresh fails, redirect to login
- Check token expiration settings

### Invalid Token

- Clear cookies and re-login
- Verify JWT_SECRET is correct
- Check token format

### Permission Denied

- Verify user has required role
- Check permission assignments
- Review authorization logic

For more information, see the [API Reference](./api-reference.md) for authentication endpoints.

