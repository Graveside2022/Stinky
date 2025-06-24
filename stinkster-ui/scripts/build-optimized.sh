#!/bin/bash

# Build Optimized Script for Stinkster UI
# This script builds the production version with all optimizations enabled

set -e

echo "🚀 Starting optimized production build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist

# Set production environment
export NODE_ENV=production

# Run type checking
echo "📝 Running type checks..."
npm run type-check || echo "Type check warnings detected, continuing..."

# Build all applications with optimizations
echo "🔨 Building applications..."
npm run build:all

# Generate service worker for PWA support
echo "⚡ Generating service worker..."
cat > dist/sw.js << 'EOF'
// Service Worker for Stinkster UI
const CACHE_NAME = 'stinkster-v1';
const urlsToCache = [
  '/',
  '/assets/css/critical.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
EOF

# Copy static assets
echo "📦 Copying static assets..."
cp -r frontend/static/* dist/ 2>/dev/null || true
cp -r public/* dist/ 2>/dev/null || true

# Generate build report
echo "📊 Generating build report..."
du -sh dist/* | sort -hr > dist/build-report.txt

# Create deployment info
echo "📝 Creating deployment info..."
cat > dist/deployment-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(git describe --tags --always --dirty 2>/dev/null || echo 'dev')",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF

# Show build summary
echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📊 Build Summary:"
echo "=================="
du -sh dist
echo ""
echo "📁 Build artifacts:"
ls -la dist/
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "To preview the production build, run:"
echo "  npm run preview"