#!/bin/bash
# Optimized startup script for wigle-to-tak
# Target memory usage: 70MB
# Generated: 2025-06-15T21:40:45.725Z

set -e

# Pi-specific environment variables
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size --gc-interval=100 --max-semi-space-size=64 --initial-old-space-size=256 --v8-pool-size=2 --expose-gc --incremental-marking --concurrent-sweeping --no-warnings --no-deprecation"
export UV_THREADPOOL_SIZE=2
export V8_MAX_OLD_SPACE_SIZE=1024

# Memory optimization environment
export MALLOC_ARENA_MAX=2
export MALLOC_MMAP_THRESHOLD_=1024
export MALLOC_TRIM_THRESHOLD_=1024

# Enable performance monitoring
export NODE_PERF_HOOKS=1

# Log startup configuration
echo "🚀 Starting wigle-to-tak with memory optimizations"
echo "📊 Target memory: 70MB"
echo "🔧 Node flags: $NODE_OPTIONS"
echo "🔧 Thread pool: $UV_THREADPOOL_SIZE"
echo ""

# Start the service
exec node server.js "$@"
