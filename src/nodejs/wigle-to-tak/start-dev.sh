#!/bin/bash
# Development startup script for wigle-to-tak with memory debugging
# Generated: 2025-06-15T21:40:45.737Z

set -e

# Development environment
export NODE_ENV=development
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size --gc-interval=100 --max-semi-space-size=64 --initial-old-space-size=256 --v8-pool-size=2 --expose-gc --incremental-marking --concurrent-sweeping --trace-warnings --trace-deprecation --trace-warnings --trace-gc"
export DEBUG="*"

# Memory monitoring
export NODE_PERF_HOOKS=1
export V8_TRACE_GC=1

echo "🛠️  Starting wigle-to-tak in development mode"
echo "📊 Memory debugging enabled"
echo "🔧 Node flags: $NODE_OPTIONS"
echo ""

# Use nodemon for development
if command -v nodemon &> /dev/null; then
    exec nodemon --inspect=0.0.0.0:9229 server.js "$@"
else
    exec node --inspect=0.0.0.0:9229 server.js "$@"
fi
