#!/bin/bash

# Reset and Reseed Database Script
# This script wipes the database and reseeds it with demo data
# Can be run manually or scheduled (e.g., daily via cron)

set -e

echo "=========================================="
echo "Resetting and Reseeding Database"
echo "=========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Load environment variables from .env files if they exist
if [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  source "$PROJECT_DIR/.env.local"
  set +a
elif [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  echo "Please set it in .env.local or .env file"
  exit 1
fi

echo "Step 1: Resetting database..."
npx prisma migrate reset --force --skip-seed

echo ""
echo "Step 2: Running migrations..."
npx prisma migrate deploy

echo ""
echo "Step 3: Seeding database..."
npx prisma db seed

echo ""
echo "=========================================="
echo "✅ Database reset and seeded successfully!"
echo "=========================================="
echo ""
echo "Demo accounts:"
echo "  - admin@lms.com / admin123 (Admin)"
echo "  - instructor@lms.com / instructor123 (Instructor)"
echo "  - learner@lms.com / learner123 (Learner - Public)"
echo "  - learner2@lms.com / learner123 (Learner - Staff)"
echo ""

