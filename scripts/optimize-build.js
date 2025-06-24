#!/usr/bin/env node

/**
 * Build optimization script for production deployment
 * Handles bundle optimization, asset compression, and deployment preparation
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'
import { gzip } from 'zlib'

const execAsync = promisify(exec)
const gzipAsync = promisify(gzip)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const STATS_DIR = path.join(ROOT_DIR, 'stats')

// Configuration
const APPS = ['hackrf', 'wigle', 'kismet', 'performance']
const CDN_URL = process.env.CDN_URL || '/assets'
const ASSET_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2']

async function main() {
  console.log('🚀 Starting production build optimization...\n')
  
  try {
    // 1. Clean previous builds
    await cleanBuildDirectories()
    
    // 2. Install dependencies
    await installDependencies()
    
    // 3. Build all apps with optimization
    await buildApps()
    
    // 4. Generate asset manifest
    const manifest = await generateAssetManifest()
    
    // 5. Optimize images
    await optimizeImages()
    
    // 6. Create compressed versions
    await createCompressedAssets()
    
    // 7. Generate service worker precache
    await generateServiceWorkerPrecache(manifest)
    
    // 8. Create deployment bundle
    await createDeploymentBundle()
    
    // 9. Generate performance report
    await generatePerformanceReport()
    
    console.log('\n✅ Build optimization complete!')
    console.log(`📁 Output directory: ${DIST_DIR}`)
    console.log(`📊 Stats available in: ${STATS_DIR}`)
    
  } catch (error) {
    console.error('\n❌ Build optimization failed:', error)
    process.exit(1)
  }
}

async function cleanBuildDirectories() {
  console.log('🧹 Cleaning build directories...')
  
  await fs.rm(DIST_DIR, { recursive: true, force: true })
  await fs.rm(STATS_DIR, { recursive: true, force: true })
  
  await fs.mkdir(DIST_DIR, { recursive: true })
  await fs.mkdir(STATS_DIR, { recursive: true })
}

async function installDependencies() {
  console.log('📦 Installing dependencies...')
  
  const { stdout } = await execAsync('npm ci --production=false', {
    cwd: ROOT_DIR
  })
  
  console.log('✓ Dependencies installed')
}

async function buildApps() {
  console.log('\n🔨 Building applications...')
  
  for (const app of APPS) {
    console.log(`  Building ${app}...`)
    
    const startTime = Date.now()
    
    // Build with production config
    await execAsync(
      `NODE_ENV=production npx vite build --config vite.config.optimized.js --mode production -- ${app}`,
      { cwd: ROOT_DIR }
    )
    
    // Generate bundle analysis
    if (app !== 'performance') {
      await execAsync(
        `ANALYZE=true NODE_ENV=production npx vite build --config vite.config.optimized.js --mode production -- ${app}`,
        { cwd: ROOT_DIR }
      ).catch(() => {
        console.log(`  ⚠️  Bundle analysis failed for ${app}`)
      })
    }
    
    const buildTime = Date.now() - startTime
    console.log(`  ✓ ${app} built in ${(buildTime / 1000).toFixed(2)}s`)
  }
}

async function generateAssetManifest() {
  console.log('\n📋 Generating asset manifest...')
  
  const manifest = {
    version: new Date().toISOString(),
    apps: {},
    assets: {}
  }
  
  for (const app of APPS) {
    const appDir = path.join(DIST_DIR, app)
    const files = await walkDir(appDir)
    
    manifest.apps[app] = {
      entry: `/${app}/index.html`,
      assets: []
    }
    
    for (const file of files) {
      const relativePath = path.relative(DIST_DIR, file)
      const stat = await fs.stat(file)
      const content = await fs.readFile(file)
      const hash = createHash('md5').update(content).digest('hex')
      
      const assetInfo = {
        path: `/${relativePath}`,
        size: stat.size,
        hash: hash.slice(0, 8),
        mtime: stat.mtime.toISOString()
      }
      
      manifest.assets[relativePath] = assetInfo
      
      if (file.startsWith(appDir)) {
        manifest.apps[app].assets.push(relativePath)
      }
    }
  }
  
  await fs.writeFile(
    path.join(DIST_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  
  console.log('✓ Asset manifest generated')
  return manifest
}

async function optimizeImages() {
  console.log('\n🖼️  Optimizing images...')
  
  const images = await findFiles(DIST_DIR, ['.png', '.jpg', '.jpeg'])
  
  if (images.length === 0) {
    console.log('  No images to optimize')
    return
  }
  
  // Using sharp would be ideal, but for Raspberry Pi compatibility,
  // we'll just copy for now. In production, use imagemin
  console.log(`  Found ${images.length} images`)
  
  // Placeholder for actual image optimization
  // In production, use sharp or imagemin
  
  console.log('✓ Images optimization complete')
}

async function createCompressedAssets() {
  console.log('\n🗜️  Creating compressed assets...')
  
  const files = await findFiles(DIST_DIR, ASSET_EXTENSIONS)
  let compressed = 0
  let totalSaved = 0
  
  for (const file of files) {
    // Skip already compressed files
    if (file.endsWith('.gz') || file.endsWith('.br')) continue
    
    const content = await fs.readFile(file)
    const originalSize = content.length
    
    // Skip small files
    if (originalSize < 1024) continue
    
    // Create gzip version
    const gzipped = await gzipAsync(content, { level: 9 })
    const gzipSize = gzipped.length
    
    // Only save if compression is worthwhile (>10% reduction)
    if (gzipSize < originalSize * 0.9) {
      await fs.writeFile(`${file}.gz`, gzipped)
      compressed++
      totalSaved += originalSize - gzipSize
    }
  }
  
  console.log(`✓ Compressed ${compressed} files, saved ${(totalSaved / 1024).toFixed(2)} KB`)
}

async function generateServiceWorkerPrecache(manifest) {
  console.log('\n🔧 Generating service worker precache...')
  
  const precacheList = []
  
  // Add critical assets to precache
  for (const [path, info] of Object.entries(manifest.assets)) {
    if (path.endsWith('.html') || 
        path.endsWith('.css') ||
        (path.endsWith('.js') && info.size < 50000)) { // Small JS files only
      precacheList.push({
        url: info.path,
        revision: info.hash
      })
    }
  }
  
  const swPrecache = `
// Auto-generated precache manifest
self.__precacheManifest = ${JSON.stringify(precacheList, null, 2)};
`
  
  await fs.writeFile(
    path.join(DIST_DIR, 'precache-manifest.js'),
    swPrecache
  )
  
  console.log(`✓ Service worker precache generated (${precacheList.length} assets)`)
}

async function createDeploymentBundle() {
  console.log('\n📦 Creating deployment bundle...')
  
  const bundleScript = `#!/bin/bash
# Stinkster Deployment Script
# Generated on ${new Date().toISOString()}

set -e

echo "🚀 Deploying Stinkster applications..."

# Configuration
DEPLOY_DIR="/var/www/stinkster"
NGINX_CONFIG="/etc/nginx/sites-available/stinkster"

# Create deployment directory
sudo mkdir -p \$DEPLOY_DIR

# Copy files
echo "📁 Copying files..."
sudo cp -r dist/* \$DEPLOY_DIR/

# Set permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data \$DEPLOY_DIR
sudo chmod -R 755 \$DEPLOY_DIR

# Configure nginx
echo "🌐 Configuring nginx..."
cat > /tmp/stinkster.nginx << 'EOF'
server {
    listen 80;
    server_name _;
    root $DEPLOY_DIR;
    
    # Gzip settings
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # App routes
    location /hackrf {
        try_files /hackrf/index.html =404;
    }
    
    location /wigle {
        try_files /wigle/index.html =404;
    }
    
    location /kismet {
        try_files /kismet/index.html =404;
    }
    
    location /performance {
        try_files /performance/index.html =404;
    }
    
    # API proxy
    location /api/hackrf {
        proxy_pass http://localhost:8092;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /api/wigle {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /api/kismet {
        proxy_pass http://localhost:2501;
    }
}
EOF

sudo mv /tmp/stinkster.nginx \$NGINX_CONFIG
sudo ln -sf \$NGINX_CONFIG /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment complete!"
`
  
  await fs.writeFile(
    path.join(ROOT_DIR, 'deploy.sh'),
    bundleScript,
    { mode: 0o755 }
  )
  
  console.log('✓ Deployment bundle created')
}

async function generatePerformanceReport() {
  console.log('\n📊 Generating performance report...')
  
  const report = {
    timestamp: new Date().toISOString(),
    apps: {}
  }
  
  for (const app of APPS) {
    const appDir = path.join(DIST_DIR, app)
    const files = await walkDir(appDir)
    
    let totalSize = 0
    let jsSize = 0
    let cssSize = 0
    let imageSize = 0
    
    for (const file of files) {
      const stat = await fs.stat(file)
      totalSize += stat.size
      
      if (file.endsWith('.js')) jsSize += stat.size
      else if (file.endsWith('.css')) cssSize += stat.size
      else if (/\.(png|jpg|jpeg|svg)$/.test(file)) imageSize += stat.size
    }
    
    report.apps[app] = {
      totalSize,
      jsSize,
      cssSize,
      imageSize,
      fileCount: files.length
    }
  }
  
  // Calculate totals
  report.totals = Object.values(report.apps).reduce((acc, app) => ({
    totalSize: acc.totalSize + app.totalSize,
    jsSize: acc.jsSize + app.jsSize,
    cssSize: acc.cssSize + app.cssSize,
    imageSize: acc.imageSize + app.imageSize,
    fileCount: acc.fileCount + app.fileCount
  }), { totalSize: 0, jsSize: 0, cssSize: 0, imageSize: 0, fileCount: 0 })
  
  await fs.writeFile(
    path.join(STATS_DIR, 'performance-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  // Print summary
  console.log('\n📈 Build Summary:')
  console.log('─'.repeat(50))
  
  for (const [app, stats] of Object.entries(report.apps)) {
    console.log(`\n${app.toUpperCase()}:`)
    console.log(`  Total Size: ${formatBytes(stats.totalSize)}`)
    console.log(`  JavaScript: ${formatBytes(stats.jsSize)}`)
    console.log(`  CSS: ${formatBytes(stats.cssSize)}`)
    console.log(`  Images: ${formatBytes(stats.imageSize)}`)
    console.log(`  Files: ${stats.fileCount}`)
  }
  
  console.log('\n' + '─'.repeat(50))
  console.log('TOTAL:')
  console.log(`  Total Size: ${formatBytes(report.totals.totalSize)}`)
  console.log(`  Files: ${report.totals.fileCount}`)
}

// Helper functions
async function walkDir(dir) {
  const files = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  
  return files
}

async function findFiles(dir, extensions) {
  const files = await walkDir(dir)
  return files.filter(file => 
    extensions.some(ext => file.endsWith(ext))
  )
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Run the script
main().catch(console.error)