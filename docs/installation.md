# Installation Guide

This guide will help you install and set up the LMS application.

## Prerequisites

Before installing the LMS, ensure you have the following installed:

- **Node.js:** 20.x LTS or higher
- **PostgreSQL:** 15+ (or use Docker)
- **npm/yarn/pnpm:** Latest version
- **Git:** For version control
- **LibreOffice:** For PowerPoint to PDF conversion (required for PPT viewing)
- **Python 3:** With python3-uno package (for LibreOffice UNO API)
- **Microsoft Core Fonts:** Required for proper font rendering in PPT conversions
- **cabextract and unzip:** Required for installing Microsoft fonts

### Installing LibreOffice

LibreOffice is required for converting PowerPoint presentations (PPTX) to PDF for viewing in the LMS.

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y libreoffice python3-uno
```

**macOS:**
```bash
brew install --cask libreoffice
# Python UNO API is typically included with LibreOffice on macOS
```

**Windows:**
Download and install from [LibreOffice.org](https://www.libreoffice.org/download/)
- Python UNO API is typically included with LibreOffice on Windows

After installation, verify it's working:
```bash
libreoffice --version
```

### Installing Microsoft Core Fonts

**IMPORTANT:** Microsoft Core Fonts are required for proper font rendering when converting PowerPoint presentations. Without these fonts, LibreOffice will substitute fonts which can cause:
- Weird character rendering (e.g., "s" characters appearing as special symbols)
- Text appearing too thin or distorted
- Layout and spacing issues

**Ubuntu/Debian:**
```bash
# Install required tools
sudo apt-get update
sudo apt-get install -y cabextract unzip ttf-mscorefonts-installer

# Accept the EULA non-interactively
echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula boolean true" | sudo debconf-set-selections

# Reconfigure to trigger font download
sudo dpkg-reconfigure -f noninteractive ttf-mscorefonts-installer

# If fonts don't download automatically, manually download and extract:
sudo mkdir -p /usr/share/fonts/truetype/msttcorefonts
cd /tmp
for exe in arial32.exe comic32.exe courie32.exe georgi32.exe impact32.exe times32.exe trebuc32.exe verdan32.exe webdin32.exe; do
  wget "http://downloads.sourceforge.net/corefonts/$exe" -O "$exe"
  cabextract -F "*.ttf" "$exe" -d /usr/share/fonts/truetype/msttcorefonts/
done
rm -f *.exe

# Install Carlito (free Calibri substitute) for better compatibility
sudo wget "https://github.com/google/fonts/raw/main/ofl/carlito/Carlito-Regular.ttf" -O /usr/share/fonts/truetype/carlito.ttf
sudo wget "https://github.com/google/fonts/raw/main/ofl/carlito/Carlito-Bold.ttf" -O /usr/share/fonts/truetype/carlito-bold.ttf
sudo wget "https://github.com/google/fonts/raw/main/ofl/carlito/Carlito-Italic.ttf" -O /usr/share/fonts/truetype/carlito-italic.ttf
sudo wget "https://github.com/google/fonts/raw/main/ofl/carlito/Carlito-BoldItalic.ttf" -O /usr/share/fonts/truetype/carlito-bolditalic.ttf

# Set proper permissions and refresh font cache
sudo chmod 644 /usr/share/fonts/truetype/msttcorefonts/*.ttf
sudo fc-cache -fv

# Verify fonts are installed
fc-list : family | grep -iE "arial|times|verdana|comic|trebuchet|courier|georgia|impact|carlito"
```

**macOS:**
```bash
# Install via Homebrew
brew install --cask font-microsoft-core-fonts

# Or manually download and install from:
# https://github.com/microsoft/cascadia-code/releases
# Extract and copy .ttf files to ~/Library/Fonts/
```

**Windows:**
Microsoft Core Fonts are typically pre-installed on Windows. If not, download from Microsoft's website.

**Verification:**
After installation, verify fonts are available:
```bash
fc-list : family | grep -iE "arial|times|verdana|comic|trebuchet|courier|georgia|impact"
```

You should see: Arial, Times New Roman, Verdana, Comic Sans MS, Trebuchet MS, Courier New, Georgia, Impact, and others.

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/fourtytwo42/LMS.git
cd lms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lms?schema=public"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="3d"
JWT_REFRESH_EXPIRES_IN="30d"

# File Storage
STORAGE_PATH="./storage"
MAX_FILE_SIZE=104857600  # 100MB in bytes

# Email (Optional)
SMTP_ENABLED=false
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@lms.com"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with initial data
npx prisma db seed
```

### 5. Create Storage Directories

```bash
mkdir -p storage/{videos,pdfs,ppts,repository,avatars,certificates,thumbnails,badges}
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Accounts

After seeding the database, you can log in with:

- **Email:** `admin@lms.com`
- **Password:** `admin123`
- **Role:** ADMIN

## Production Installation

For production installation, see the [Deployment Guide](./deployment.md).

## Troubleshooting

If you encounter issues during installation, see the [Troubleshooting Guide](./troubleshooting.md).

