#!/bin/bash
# Production build script for Kismet Operations Center
# Creates optimized production build with minification and bundling

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/dist"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}Building Kismet Operations Center for Production${NC}"
echo "Project root: $PROJECT_ROOT"
echo "Build directory: $BUILD_DIR"

# Function to check command availability
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
check_command node
check_command npm
check_command tsc

# Create backup of current build
if [ -d "$BUILD_DIR" ]; then
    echo -e "\n${YELLOW}Backing up current build...${NC}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$BUILD_DIR" "$BACKUP_DIR/"
    echo "Backup created at: $BACKUP_DIR"
fi

# Clean previous build
echo -e "\n${YELLOW}Cleaning previous build...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Install dependencies
echo -e "\n${YELLOW}Installing production dependencies...${NC}"
cd "$PROJECT_ROOT"
npm ci --production=false  # Install all dependencies for build

# Compile TypeScript
echo -e "\n${YELLOW}Compiling TypeScript...${NC}"
npx tsc --build --clean
npx tsc --build

# Run linter
echo -e "\n${YELLOW}Running linter...${NC}"
npm run lint || true  # Don't fail build on lint warnings

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
if [ -f "$PROJECT_ROOT/package.json" ] && grep -q '"test"' "$PROJECT_ROOT/package.json"; then
    npm test || echo -e "${YELLOW}Warning: Some tests failed${NC}"
fi

# Bundle and minify frontend assets
echo -e "\n${YELLOW}Bundling frontend assets...${NC}"
if [ -d "$PROJECT_ROOT/public" ]; then
    # Copy static assets
    cp -r "$PROJECT_ROOT/public" "$BUILD_DIR/"
    
    # Minify CSS
    if command -v csso &> /dev/null; then
        find "$BUILD_DIR/public/css" -name "*.css" -type f | while read -r file; do
            echo "Minifying: $file"
            csso "$file" -o "$file"
        done
    else
        echo -e "${YELLOW}Warning: csso not installed, skipping CSS minification${NC}"
    fi
    
    # Minify JavaScript
    if command -v terser &> /dev/null; then
        find "$BUILD_DIR/public/js" -name "*.js" -type f | while read -r file; do
            if [[ ! "$file" =~ \.min\.js$ ]]; then
                echo "Minifying: $file"
                terser "$file" -o "$file" -c -m
            fi
        done
    else
        echo -e "${YELLOW}Warning: terser not installed, skipping JS minification${NC}"
    fi
fi

# Copy views
if [ -d "$PROJECT_ROOT/views" ]; then
    echo -e "\n${YELLOW}Copying view templates...${NC}"
    cp -r "$PROJECT_ROOT/views" "$BUILD_DIR/"
fi

# Copy configuration files
echo -e "\n${YELLOW}Copying configuration files...${NC}"
cp "$PROJECT_ROOT/package.json" "$BUILD_DIR/"
cp "$PROJECT_ROOT/package-lock.json" "$BUILD_DIR/"
[ -f "$PROJECT_ROOT/.env.example" ] && cp "$PROJECT_ROOT/.env.example" "$BUILD_DIR/"
[ -f "$PROJECT_ROOT/tsconfig.json" ] && cp "$PROJECT_ROOT/tsconfig.json" "$BUILD_DIR/"

# Install production dependencies only
echo -e "\n${YELLOW}Installing production dependencies in build...${NC}"
cd "$BUILD_DIR"
npm ci --production

# Create version file
echo -e "\n${YELLOW}Creating version file...${NC}"
cat > "$BUILD_DIR/version.json" <<EOF
{
  "version": "$(node -p "require('./package.json').version")",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "environment": "production"
}
EOF

# Create production config
echo -e "\n${YELLOW}Creating production configuration...${NC}"
cat > "$BUILD_DIR/.env.production" <<EOF
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
KISMET_HOST=localhost
KISMET_PORT=2501
KISMET_USERNAME=kismet
CORS_ORIGINS=http://localhost:3001,https://localhost:3001
WEBHOOK_TIMEOUT=30000
MAX_REQUEST_SIZE=50mb
SESSION_SECRET=$(openssl rand -base64 32)
EOF

# Optimize package.json
echo -e "\n${YELLOW}Optimizing package.json...${NC}"
node -e "
const pkg = require('./package.json');
delete pkg.devDependencies;
delete pkg.scripts.dev;
delete pkg.scripts.test;
delete pkg.scripts['test:watch'];
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

# Create deployment info
echo -e "\n${YELLOW}Creating deployment info...${NC}"
cat > "$BUILD_DIR/DEPLOYMENT.md" <<EOF
# Kismet Operations Center - Production Build

Built on: $(date)
Node version: $(node --version)
NPM version: $(npm --version)

## Deployment Steps

1. Copy this build directory to production server
2. Set environment variables or create .env file
3. Run: npm start

## Environment Variables

- NODE_ENV=production
- PORT=3001 (or desired port)
- KISMET_HOST=localhost
- KISMET_PORT=2501
- KISMET_USERNAME=kismet
- KISMET_PASSWORD=(your password)

## Service Management

Start: systemctl start kismet-operations-center
Stop: systemctl stop kismet-operations-center
Status: systemctl status kismet-operations-center
Logs: journalctl -u kismet-operations-center -f
EOF

# Calculate build size
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)

echo -e "\n${GREEN}Production build completed successfully!${NC}"
echo "Build location: $BUILD_DIR"
echo "Build size: $BUILD_SIZE"
echo -e "\nNext steps:"
echo "1. Review the build at: $BUILD_DIR"
echo "2. Deploy using: ./deploy.sh"
echo "3. Monitor logs after deployment"