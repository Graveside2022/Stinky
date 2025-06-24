#!/bin/bash
# Production build script for WigleToTAK
# This script builds both frontend and backend for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/pi/projects/stinkster_christian/stinkster/stinkster-ui"
DEPLOY_DIR="${PROJECT_ROOT}/deploy"
BUILD_LOG="${DEPLOY_DIR}/build.log"
BUILD_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to log messages
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "${BUILD_LOG}"
}

# Function to handle errors
handle_error() {
    log "Error occurred in build process!" $RED
    log "Check ${BUILD_LOG} for details" $RED
    exit 1
}

# Trap errors
trap handle_error ERR

# Start build process
log "Starting production build for WigleToTAK..."
log "Build timestamp: ${BUILD_TIMESTAMP}"

# Ensure we're in the project root
cd "${PROJECT_ROOT}"

# Check Node.js version
log "Checking Node.js version..."
NODE_VERSION=$(node --version)
log "Node.js version: ${NODE_VERSION}"

# Clean previous builds
log "Cleaning previous builds..."
npm run clean
rm -rf backend/dist

# Install dependencies if needed
log "Checking dependencies..."
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    log "Installing frontend dependencies..."
    npm ci --production=false
fi

if [ ! -d "backend/node_modules" ] || [ backend/package.json -nt backend/node_modules ]; then
    log "Installing backend dependencies..."
    cd backend
    npm ci --production=false
    cd ..
fi

# Run tests before building
log "Running tests..."
npm run test:run || {
    log "Tests failed! Fix issues before deploying." $RED
    exit 1
}

# Build frontend
log "Building frontend..."
NODE_ENV=production npm run build:wigle

# Check if frontend build succeeded
if [ ! -d "dist/wigle" ]; then
    log "Frontend build failed!" $RED
    exit 1
fi

# Build backend
log "Building backend..."
cd backend
npm run build

# Check if backend build succeeded
if [ ! -d "dist" ]; then
    log "Backend build failed!" $RED
    exit 1
fi
cd ..

# Create build artifact
log "Creating build artifact..."
BUILD_ARTIFACT="${DEPLOY_DIR}/builds/wigletotak_${BUILD_TIMESTAMP}.tar.gz"
mkdir -p "${DEPLOY_DIR}/builds"

# Create temporary directory for artifact
TEMP_BUILD_DIR="/tmp/wigletotak_build_${BUILD_TIMESTAMP}"
mkdir -p "${TEMP_BUILD_DIR}"

# Copy built files
cp -r dist/wigle "${TEMP_BUILD_DIR}/frontend"
cp -r backend/dist "${TEMP_BUILD_DIR}/backend"
cp -r backend/package.json backend/package-lock.json "${TEMP_BUILD_DIR}/backend/"

# Copy deployment configs
cp -r "${DEPLOY_DIR}/config" "${TEMP_BUILD_DIR}/"
cp -r "${DEPLOY_DIR}/systemd" "${TEMP_BUILD_DIR}/"
cp -r "${DEPLOY_DIR}/nginx" "${TEMP_BUILD_DIR}/"

# Create version file
cat > "${TEMP_BUILD_DIR}/version.json" <<EOF
{
  "version": "$(cat package.json | grep '"version"' | cut -d'"' -f4)",
  "buildTimestamp": "${BUILD_TIMESTAMP}",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "nodeVersion": "${NODE_VERSION}",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF

# Create tarball
log "Creating deployment package..."
tar -czf "${BUILD_ARTIFACT}" -C "${TEMP_BUILD_DIR}" .

# Clean up temp directory
rm -rf "${TEMP_BUILD_DIR}"

# Calculate checksum
CHECKSUM=$(sha256sum "${BUILD_ARTIFACT}" | cut -d' ' -f1)
echo "${CHECKSUM}" > "${BUILD_ARTIFACT}.sha256"

# Log build info
log "Build completed successfully!"
log "Build artifact: ${BUILD_ARTIFACT}"
log "Checksum: ${CHECKSUM}"
log "Size: $(du -h "${BUILD_ARTIFACT}" | cut -f1)"

# Create latest symlink
ln -sf "${BUILD_ARTIFACT}" "${DEPLOY_DIR}/builds/wigletotak_latest.tar.gz"
ln -sf "${BUILD_ARTIFACT}.sha256" "${DEPLOY_DIR}/builds/wigletotak_latest.tar.gz.sha256"

log "Build process completed!"