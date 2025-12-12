# Troubleshooting Guide

Common issues and their solutions.

## Installation Issues

### Node.js Version

**Issue:** Application won't start or build fails.

**Solution:**
```bash
# Check Node.js version
node --version  # Should be 20.x

# Update Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Database Connection

**Issue:** `Can't reach database server`

**Solutions:**
1. Verify PostgreSQL is running:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

2. Check DATABASE_URL format:
```
postgresql://user:password@localhost:5432/lms?schema=public
```

3. Verify database exists:
```bash
psql -U postgres -l
```

4. Check user permissions:
```bash
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE lms TO lms_user;
```

### Prisma Client Not Generated

**Issue:** `PrismaClient is not defined`

**Solution:**
```bash
npx prisma generate
```

## Build Issues

### TypeScript Errors

**Issue:** Build fails with TypeScript errors.

**Solutions:**
1. Check for type errors:
```bash
npx tsc --noEmit
```

2. Fix unused variables/imports
3. Verify all types are imported correctly
4. Check for Next.js 16 async params issues

### Tailwind CSS Not Working

**Issue:** Styles not applying.

**Solutions:**
1. Verify PostCSS config:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

2. Check globals.css:
```css
@import "tailwindcss";
```

3. Rebuild:
```bash
rm -rf .next
npm run build
```

### Module Not Found

**Issue:** `Module not found: Can't resolve '...'`

**Solutions:**
1. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Check import paths (use `@/` alias)
3. Verify file exists
4. Check tsconfig.json paths configuration

## Runtime Issues

### Application Won't Start

**Issue:** PM2 shows error or application crashes.

**Solutions:**
1. Check PM2 logs:
```bash
pm2 logs lms --lines 50
```

2. Verify environment variables are set
3. Check database connection
4. Verify build exists:
```bash
ls -la .next
```

### 500 Internal Server Error

**Issue:** API routes return 500 errors.

**Solutions:**
1. Check server logs for detailed error
2. Verify database connection
3. Check Prisma Client is generated
4. Verify all required environment variables
5. Check file permissions for storage directory

### Authentication Issues

**Issue:** Can't log in or getting unauthorized errors.

**Solutions:**
1. Verify JWT secrets are set
2. Clear browser cookies
3. Check token expiration settings
4. Verify user exists in database:
```bash
npx prisma studio
```

**Issue:** Login succeeds but redirects back to login page.

**Solutions:**
1. Check if cookies are being set (use browser DevTools → Application → Cookies)
2. Verify cookie settings in `app/api/auth/login/route.ts`:
   - `secure: false` for development (localhost)
   - `sameSite: "lax"` for better compatibility
   - `httpOnly: true` for security
3. Check middleware is not blocking requests
4. Verify PM2 is using development mode:
```javascript
// ecosystem.config.js
args: "run dev",  // Not "start" for development
env: {
  NODE_ENV: "development",
}
```
5. Use `window.location.href` instead of `router.push()` for login redirect to ensure full page reload

### File Upload Fails

**Issue:** File uploads return errors.

**Solutions:**
1. Check storage directory exists and is writable:
```bash
ls -la storage/
chmod -R 755 storage/
```

2. Verify MAX_FILE_SIZE setting
3. Check disk space:
```bash
df -h
```

4. Check Nginx client_max_body_size (if using reverse proxy)

## Database Issues

### Migration Errors

**Issue:** `Migration failed`

**Solutions:**
1. Check database connection
2. Verify user has migration permissions
3. Review migration files for errors
4. Reset database if in development:
```bash
npx prisma migrate reset
```

### Connection Pool Exhausted

**Issue:** `Too many connections`

**Solutions:**
1. Increase PostgreSQL max_connections
2. Configure Prisma connection pool:
```
DATABASE_URL="...?connection_limit=10&pool_timeout=20"
```

3. Close unused connections
4. Restart PostgreSQL

## Performance Issues

### Slow Page Loads

**Solutions:**
1. Check database query performance
2. Add indexes for frequently queried fields
3. Enable Next.js caching
4. Optimize images
5. Use Server Components for data fetching

### High Memory Usage

**Solutions:**
1. Check PM2 memory limit
2. Enable PM2 auto-restart:
```javascript
max_memory_restart: "500M"
```

3. Review for memory leaks
4. Optimize database queries

## Browser Issues

### Styles Not Loading

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check browser console for errors
4. Verify CSS file is being served
5. Verify PostCSS config uses Tailwind v4 syntax:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```
6. Check `app/globals.css` uses `@import "tailwindcss";`

### Input Text Not Visible (White on White)

**Issue:** Input fields have white text on white background, making text invisible.

**Solution:**
The Input component should have explicit text colors. Verify `src/components/ui/input.tsx` includes:
```typescript
className={cn(
  "text-gray-900 bg-white placeholder:text-gray-400",
  // ... other classes
)}
```

If issue persists:
1. Clear browser cache and hard refresh
2. Verify Tailwind CSS is compiling correctly
3. Check for CSS conflicts in browser DevTools

### JavaScript Errors

**Solutions:**
1. Check browser console for errors
2. Verify all dependencies are installed
3. Check for CORS issues
4. Verify API endpoints are accessible

## Production Issues

### PM2 Process Crashes

**Solutions:**
1. Check error logs:
```bash
pm2 logs lms --err
```

2. Verify environment variables
3. Check system resources:
```bash
pm2 monit
```

4. Review application logs

**Issue:** PM2 shows "Could not find a production build" error.

**Solution:**
For development, use `npm run dev` instead of `npm start`:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "lms",
    script: "npm",
    args: "run dev",  // Use "run dev" for development
    env: {
      NODE_ENV: "development",  // Not "production"
    },
  }],
};
```

For production, build first:
```bash
npm run build
# Then use "start" in production
```

### SSL Certificate Issues

**Issue:** HTTPS not working.

**Solutions:**
1. Verify certificate is valid:
```bash
sudo certbot certificates
```

2. Renew certificate:
```bash
sudo certbot renew
```

3. Check Nginx SSL configuration
4. Verify certificate paths in Nginx config

## Getting Help

If you encounter issues not covered here:

1. Check application logs
2. Review error messages carefully
3. Search GitHub issues
4. Check documentation
5. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

## Log Locations

- **PM2 Logs:** `logs/pm2-*.log`
- **Application Logs:** Check PM2 output
- **Database Logs:** PostgreSQL logs (system dependent)
- **Nginx Logs:** `/var/log/nginx/`

## Common Error Messages

### "UNAUTHORIZED"
- Token missing or invalid
- Token expired
- User not found

### "FORBIDDEN"
- Insufficient permissions
- Role not allowed
- Resource access denied

### "NOT_FOUND"
- Resource doesn't exist
- Invalid ID
- Route not found

### "VALIDATION_ERROR"
- Invalid input data
- Missing required fields
- Type mismatch

### "INTERNAL_ERROR"
- Server-side error
- Database error
- Unexpected exception

Check server logs for detailed error information.

