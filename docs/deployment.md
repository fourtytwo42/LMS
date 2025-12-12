# Deployment Guide

Complete guide for deploying the LMS application to production.

## Prerequisites

- Ubuntu 22.04 LTS server (or similar Linux distribution)
- Node.js 20.x LTS installed
- PostgreSQL 15+ installed and running
- PM2 installed globally
- Nginx installed (optional, for reverse proxy)
- Domain name configured (optional)

## Production Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt install -y nginx
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/fourtytwo42/LMS.git
cd lms

# Install dependencies
npm install

# Create production environment file
cp .env.example .env.production
```

### 3. Environment Configuration

Edit `.env.production`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lms_prod?schema=public"

# JWT (USE STRONG SECRETS IN PRODUCTION!)
JWT_SECRET="production-secret-key-min-32-characters-long"
JWT_REFRESH_SECRET="production-refresh-secret-min-32-characters-long"
JWT_EXPIRES_IN="3d"
JWT_REFRESH_EXPIRES_IN="30d"

# File Storage
STORAGE_PATH="/var/lms/storage"
MAX_FILE_SIZE=104857600

# Application
NEXT_PUBLIC_APP_URL="https://lms.yourdomain.com"
NODE_ENV="production"
```

### 4. Database Setup

```bash
# Create production database
sudo -u postgres psql
CREATE DATABASE lms_prod;
CREATE USER lms_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE lms_prod TO lms_user;
\q

# Update DATABASE_URL in .env.production

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### 5. Build Application

```bash
# Build Next.js application
npm run build

# Verify build succeeded
ls -la .next

# Note: The postbuild script ensures prerender-manifest.json exists
```

### 6. Create Storage Directories

```bash
# Create storage directory
sudo mkdir -p /var/lms/storage
sudo chown -R $USER:$USER /var/lms/storage

# Create subdirectories
mkdir -p /var/lms/storage/{videos,pdfs,ppts,repository,avatars,certificates,thumbnails,badges}
```

### 7. PM2 Configuration

The project includes `ecosystem.config.js`. **For production**, use:

```javascript
module.exports = {
  apps: [
    {
      name: "lms",
      script: "npm",
      args: "start",  // Use "start" for production (requires build)
      env: {
        NODE_ENV: "production",
      },
      cwd: "/path/to/lms",
      log_file: "logs/pm2-combined.log",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      max_memory_restart: "500M",
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
```

**For development**, use:
```javascript
{
  args: "run dev",  // Use "run dev" for development
  env: {
    NODE_ENV: "development",
  },
}
```

**Important:** Production requires `npm run build` before using `npm start`. Development uses `npm run dev` which doesn't require a build.

**Start with PM2:**
```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided
```

### 8. Nginx Configuration (Optional)

Create `/etc/nginx/sites-available/lms`:

```nginx
server {
    listen 80;
    server_name lms.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lms.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/lms.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lms.yourdomain.com/privkey.pem;

    # File upload size limit
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d lms.yourdomain.com

# Auto-renewal is set up automatically
```

## Monitoring

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs lms

# Monitor resources
pm2 monit

# View detailed info
pm2 show lms
```

### Application Health

Check application health:
```bash
curl http://localhost:3000/api/auth/me
```

## Backup Strategy

### Database Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# /usr/local/bin/backup-lms-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/lms"
mkdir -p $BACKUP_DIR

pg_dump -U lms_user lms_prod > $BACKUP_DIR/lms_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "lms_*.sql" -mtime +30 -delete
```

**Cron Job:**
```bash
# Add to crontab: crontab -e
0 2 * * * /usr/local/bin/backup-lms-db.sh
```

### File Storage Backup

```bash
# Backup storage directory
tar -czf /backups/lms/storage_$(date +%Y%m%d).tar.gz /var/lms/storage
```

## Updates & Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations if schema changed
npx prisma migrate deploy
npx prisma generate

# Rebuild application
npm run build

# Restart PM2
pm2 restart lms
```

### Log Rotation

PM2 handles log rotation automatically. To configure:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Troubleshooting

### Application Won't Start

1. Check PM2 logs: `pm2 logs lms`
2. Verify environment variables
3. Check database connection
4. Verify build exists: `ls -la .next`

### Database Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check DATABASE_URL format
3. Verify user permissions
4. Check firewall settings

### File Upload Issues

1. Verify storage directory exists and is writable
2. Check MAX_FILE_SIZE setting
3. Verify Nginx client_max_body_size
4. Check disk space: `df -h`

## Performance Optimization

### Database

- Add indexes for frequently queried fields
- Use connection pooling (Prisma handles this)
- Monitor slow queries
- Regular VACUUM and ANALYZE

### Application

- Enable Next.js caching
- Use CDN for static assets
- Optimize images
- Implement Redis caching (optional)

### Monitoring

- Set up application monitoring (e.g., PM2 Plus)
- Monitor server resources
- Set up alerts for errors
- Track performance metrics

## Security Checklist

- [ ] Strong JWT secrets (32+ characters)
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Database user has minimal privileges
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Error logging configured
- [ ] Rate limiting implemented (recommended)
- [ ] CORS configured properly
- [ ] Environment variables secured

## Support

For deployment issues, refer to:
- [Troubleshooting Guide](./troubleshooting.md)
- [Maintenance Guide](./maintenance.md)
- GitHub Issues: https://github.com/fourtytwo42/LMS/issues

