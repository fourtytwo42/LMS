# Configuration Guide

Complete guide to configuring the LMS application.

## Environment Variables

All configuration is done through environment variables. Create a `.env.local` file for development or `.env.production` for production.

## Required Variables

### Database

```env
DATABASE_URL="postgresql://user:password@localhost:5432/lms?schema=public"
```

**Format:** `postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]`

### JWT Authentication

```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="3d"
JWT_REFRESH_EXPIRES_IN="30d"
```

**Security Notes:**
- Use strong, random secrets (32+ characters)
- Never commit secrets to version control
- Use different secrets for development and production
- Rotate secrets periodically

**Token Expiration:**
- `JWT_EXPIRES_IN`: Access token expiration (e.g., "3d", "24h", "1h")
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (e.g., "30d", "7d")

## Optional Variables

### File Storage

```env
STORAGE_PATH="./storage"
MAX_FILE_SIZE=104857600  # 100MB in bytes
```

**STORAGE_PATH:**
- Development: `./storage` (relative to project root)
- Production: `/var/lms/storage` (absolute path)

**MAX_FILE_SIZE:**
- Default: 100MB (104857600 bytes)
- Adjust based on server capacity
- Also configure Nginx `client_max_body_size` if using reverse proxy

### Email Configuration

```env
SMTP_ENABLED=false
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@lms.com"
```

**SMTP Configuration:**
- `SMTP_ENABLED`: Enable/disable email functionality
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (587 for TLS, 465 for SSL)
- `SMTP_USER`: SMTP username/email
- `SMTP_PASSWORD`: SMTP password or app password
- `SMTP_FROM`: From email address

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in `SMTP_PASSWORD`

### Application

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**NEXT_PUBLIC_APP_URL:**
- Development: `http://localhost:3000`
- Production: `https://lms.yourdomain.com`
- Used for generating absolute URLs (emails, links)

**NODE_ENV:**
- `development` - Development mode
- `production` - Production mode
- Affects Next.js optimizations and error handling

## Configuration Files

### Next.js Configuration

`next.config.js`:
```javascript
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  output: 'standalone',
  compress: true,
};
```

### Tailwind CSS Configuration

`tailwind.config.ts`:
```typescript
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### PostCSS Configuration

`postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### Prisma Configuration

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

## Feature Flags

Currently, there are no feature flags implemented. Consider adding feature flags for:
- Email notifications
- Certificate generation
- Badge system
- Advanced analytics

## Security Configuration

### CORS

Currently, CORS is not explicitly configured. For production with separate frontend/backend, configure CORS:

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: 'https://yourdomain.com',
        },
      ],
    },
  ];
}
```

### Rate Limiting

Rate limiting is not currently implemented. Consider adding:
- Express rate limiter middleware
- Redis-based rate limiting
- Per-endpoint rate limits

## Performance Configuration

### Database Connection Pooling

Prisma handles connection pooling automatically. Configure in `DATABASE_URL`:

```
postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=20
```

### Caching

Next.js provides built-in caching. Configure in `next.config.js`:

```javascript
const nextConfig = {
  // Cache configuration
  experimental: {
    // ...
  },
};
```

## Environment-Specific Configuration

### Development

`.env.local`:
```env
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://user:password@localhost:5432/lms_dev"
STORAGE_PATH="./storage"
```

### Production

`.env.production`:
```env
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://lms.yourdomain.com"
DATABASE_URL="postgresql://user:password@localhost:5432/lms_prod"
STORAGE_PATH="/var/lms/storage"
```

## Validation

Environment variables are validated at startup. Missing required variables will cause the application to fail to start.

## Secrets Management

**Best Practices:**
1. Never commit `.env` files to version control
2. Use `.env.example` as a template
3. Use secret management services in production (AWS Secrets Manager, HashiCorp Vault)
4. Rotate secrets regularly
5. Use different secrets per environment

## Troubleshooting

### Invalid Configuration

If the application fails to start:
1. Check all required variables are set
2. Verify DATABASE_URL format
3. Check JWT secrets are set and strong
4. Verify file paths exist and are writable

### Database Connection

If database connection fails:
1. Verify DATABASE_URL is correct
2. Check PostgreSQL is running
3. Verify user has permissions
4. Check network/firewall settings

