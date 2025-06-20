#!/usr/bin/env node
/**
 * Memory Optimization Implementation - Raspberry Pi Node.js Services
 * 
 * Implements specific memory optimizations for maximum efficiency on Pi hardware.
 * Targets 35% memory reduction vs Flask baseline (70MB vs 105MB).
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MemoryOptimizer {
    constructor() {
        this.optimizations = {
            node_flags: {
                '--max-old-space-size': '1024',         // Limit heap to 1GB (Pi-appropriate)
                '--optimize-for-size': true,            // Favor memory over speed
                '--gc-interval': '100',                 // More frequent GC
                '--max-semi-space-size': '64',          // Smaller new generation
                '--initial-old-space-size': '256',      // Smaller initial old space
                '--v8-pool-size': '2'                   // Smaller thread pool for Pi
            },
            gc_tuning: {
                '--expose-gc': true,                    // Allow manual GC
                '--trace-gc': false,                    // Disable GC tracing in production
                '--incremental-marking': true,          // Enable incremental marking
                '--concurrent-sweeping': true           // Enable concurrent sweeping
            },
            memory_efficiency: {
                object_pooling: true,
                buffer_reuse: true,
                string_deduplication: true,
                weak_references: true
            }
        };
        
        this.services = [
            {
                name: 'wigle-to-tak',
                path: 'src/nodejs/wigle-to-tak',
                main: 'server.js',
                target_memory_mb: 70
            },
            {
                name: 'spectrum-analyzer', 
                path: 'src/nodejs/spectrum-analyzer',
                main: 'server.js',
                target_memory_mb: 85
            }
        ];
    }

    async optimizeAll() {
        console.log('🧠 Memory Optimization Implementation for Raspberry Pi');
        console.log('====================================================');
        console.log('🎯 Target: 35% memory reduction vs Flask baseline\n');

        try {
            // 1. Generate optimized startup scripts
            await this.generateOptimizedStartupScripts();
            
            // 2. Implement object pooling utilities
            await this.implementObjectPooling();
            
            // 3. Add memory monitoring utilities
            await this.addMemoryMonitoring();
            
            // 4. Configure garbage collection optimization
            await this.configureGarbageCollection();
            
            // 5. Create systemd service overrides
            await this.createSystemdOptimizations();
            
            // 6. Implement caching strategies
            await this.implementCachingStrategies();
            
            console.log('\n✅ Memory optimization implementation complete!');
            this.printOptimizationSummary();
            
        } catch (error) {
            console.error('❌ Memory optimization failed:', error);
            throw error;
        }
    }

    async generateOptimizedStartupScripts() {
        console.log('📜 1. Generating optimized startup scripts...');
        
        for (const service of this.services) {
            const serviceDir = path.join(process.cwd(), service.path);
            
            // Generate optimized start script
            const startScript = this.generateStartScript(service);
            const scriptPath = path.join(serviceDir, 'start-optimized.sh');
            
            await fs.writeFile(scriptPath, startScript);
            await fs.chmod(scriptPath, '755');
            
            console.log(`  ✓ Created ${scriptPath}`);
            
            // Generate development script (with debugging)
            const devScript = this.generateDevScript(service);
            const devScriptPath = path.join(serviceDir, 'start-dev.sh');
            
            await fs.writeFile(devScriptPath, devScript);
            await fs.chmod(devScriptPath, '755');
            
            console.log(`  ✓ Created ${devScriptPath}`);
        }
    }

    generateStartScript(service) {
        const nodeFlags = this.buildNodeFlags('production');
        
        return `#!/bin/bash
# Optimized startup script for ${service.name}
# Target memory usage: ${service.target_memory_mb}MB
# Generated: ${new Date().toISOString()}

set -e

# Pi-specific environment variables
export NODE_ENV=production
export NODE_OPTIONS="${nodeFlags}"
export UV_THREADPOOL_SIZE=2
export V8_MAX_OLD_SPACE_SIZE=1024

# Memory optimization environment
export MALLOC_ARENA_MAX=2
export MALLOC_MMAP_THRESHOLD_=1024
export MALLOC_TRIM_THRESHOLD_=1024

# Enable performance monitoring
export NODE_PERF_HOOKS=1

# Log startup configuration
echo "🚀 Starting ${service.name} with memory optimizations"
echo "📊 Target memory: ${service.target_memory_mb}MB"
echo "🔧 Node flags: \$NODE_OPTIONS"
echo "🔧 Thread pool: \$UV_THREADPOOL_SIZE"
echo ""

# Start the service
exec node ${service.main} "\$@"
`;
    }

    generateDevScript(service) {
        const nodeFlags = this.buildNodeFlags('development');
        
        return `#!/bin/bash
# Development startup script for ${service.name} with memory debugging
# Generated: ${new Date().toISOString()}

set -e

# Development environment
export NODE_ENV=development
export NODE_OPTIONS="${nodeFlags} --trace-warnings --trace-gc"
export DEBUG="*"

# Memory monitoring
export NODE_PERF_HOOKS=1
export V8_TRACE_GC=1

echo "🛠️  Starting ${service.name} in development mode"
echo "📊 Memory debugging enabled"
echo "🔧 Node flags: \$NODE_OPTIONS"
echo ""

# Use nodemon for development
if command -v nodemon &> /dev/null; then
    exec nodemon --inspect=0.0.0.0:9229 ${service.main} "\$@"
else
    exec node --inspect=0.0.0.0:9229 ${service.main} "\$@"
fi
`;
    }

    buildNodeFlags(environment) {
        let flags = [];
        
        // Core memory flags
        Object.entries(this.optimizations.node_flags).forEach(([flag, value]) => {
            if (typeof value === 'boolean' && value) {
                flags.push(flag);
            } else if (typeof value === 'string' || typeof value === 'number') {
                flags.push(`${flag}=${value}`);
            }
        });
        
        // GC tuning flags
        Object.entries(this.optimizations.gc_tuning).forEach(([flag, value]) => {
            if (typeof value === 'boolean' && value) {
                flags.push(flag);
            }
        });
        
        // Environment-specific flags
        if (environment === 'production') {
            flags.push('--no-warnings');
            flags.push('--no-deprecation');
        } else {
            flags.push('--trace-warnings');
            flags.push('--trace-deprecation');
        }
        
        return flags.join(' ');
    }

    async implementObjectPooling() {
        console.log('\n🎱 2. Implementing object pooling utilities...');
        
        const poolingUtility = `/**
 * Object Pooling Utilities for Memory Optimization
 * Reuses objects to reduce garbage collection pressure
 */

class ObjectPool {
    constructor(createFn, resetFn, maxSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.pool = [];
        this.size = 0;
    }

    acquire() {
        if (this.size > 0) {
            this.size--;
            return this.pool.pop();
        }
        return this.createFn();
    }

    release(obj) {
        if (this.size < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
            this.size++;
        }
    }

    clear() {
        this.pool.length = 0;
        this.size = 0;
    }

    getStats() {
        return {
            poolSize: this.size,
            maxSize: this.maxSize,
            utilizationPercent: Math.round((this.size / this.maxSize) * 100)
        };
    }
}

// Predefined pools for common objects
const bufferPool = new ObjectPool(
    () => Buffer.alloc(1024),
    (buffer) => buffer.fill(0),
    50
);

const responsePool = new ObjectPool(
    () => ({}),
    (obj) => {
        Object.keys(obj).forEach(key => delete obj[key]);
        return obj;
    },
    20
);

const arrayPool = new ObjectPool(
    () => [],
    (arr) => {
        arr.length = 0;
        return arr;
    },
    30
);

module.exports = {
    ObjectPool,
    bufferPool,
    responsePool,
    arrayPool
};`;

        // Write to shared utilities
        const utilsDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'utils');
        await fs.mkdir(utilsDir, { recursive: true });
        await fs.writeFile(path.join(utilsDir, 'object-pooling.js'), poolingUtility);
        
        console.log('  ✓ Created object pooling utilities');
    }

    async addMemoryMonitoring() {
        console.log('\n📊 3. Adding memory monitoring utilities...');
        
        const monitoringUtility = `/**
 * Memory Monitoring Utilities for Node.js Services
 * Tracks memory usage and triggers optimization actions
 */

class MemoryMonitor {
    constructor(options = {}) {
        this.targetMemoryMB = options.targetMemoryMB || 70;
        this.warningThresholdPercent = options.warningThresholdPercent || 80;
        this.criticalThresholdPercent = options.criticalThresholdPercent || 90;
        this.checkIntervalMs = options.checkIntervalMs || 30000; // 30 seconds
        this.gcThresholdMB = options.gcThresholdMB || 50;
        
        this.isMonitoring = false;
        this.stats = {
            measurements: 0,
            gcTriggers: 0,
            warningCount: 0,
            criticalCount: 0,
            maxMemoryMB: 0
        };
        
        this.listeners = [];
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, this.checkIntervalMs);
        
        console.log(\`🔍 Memory monitoring started - Target: \${this.targetMemoryMB}MB\`);
    }

    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        console.log('🔍 Memory monitoring stopped');
    }

    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const memoryMB = Math.round(memUsage.rss / 1024 / 1024);
        
        this.stats.measurements++;
        this.stats.maxMemoryMB = Math.max(this.stats.maxMemoryMB, memoryMB);
        
        const usagePercent = (memoryMB / this.targetMemoryMB) * 100;
        
        const status = {
            memoryMB,
            targetMemoryMB: this.targetMemoryMB,
            usagePercent: Math.round(usagePercent),
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            externalMB: Math.round(memUsage.external / 1024 / 1024),
            timestamp: new Date().toISOString()
        };

        // Trigger events based on usage
        if (usagePercent >= this.criticalThresholdPercent) {
            this.stats.criticalCount++;
            this.emit('critical', status);
            this.triggerGarbageCollection();
        } else if (usagePercent >= this.warningThresholdPercent) {
            this.stats.warningCount++;
            this.emit('warning', status);
        } else {
            this.emit('normal', status);
        }

        // Auto-GC if memory usage is high
        if (memoryMB > this.gcThresholdMB && global.gc) {
            this.triggerGarbageCollection();
        }

        return status;
    }

    triggerGarbageCollection() {
        if (global.gc) {
            const beforeMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
            global.gc();
            const afterMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
            const freedMB = beforeMB - afterMB;
            
            this.stats.gcTriggers++;
            console.log(\`🗑️  Garbage collection: freed \${freedMB}MB (\${beforeMB}MB → \${afterMB}MB)\`);
            
            this.emit('gc', { beforeMB, afterMB, freedMB });
        }
    }

    getMemoryStatus() {
        const memUsage = process.memoryUsage();
        const memoryMB = Math.round(memUsage.rss / 1024 / 1024);
        
        return {
            current: {
                memoryMB,
                heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
                externalMB: Math.round(memUsage.external / 1024 / 1024)
            },
            target: {
                targetMemoryMB: this.targetMemoryMB,
                usagePercent: Math.round((memoryMB / this.targetMemoryMB) * 100),
                withinTarget: memoryMB <= this.targetMemoryMB
            },
            stats: this.stats
        };
    }

    on(event, listener) {
        this.listeners.push({ event, listener });
    }

    emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.listener(data));
    }
}

module.exports = MemoryMonitor;`;

        const utilsDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'utils');
        await fs.writeFile(path.join(utilsDir, 'memory-monitor.js'), monitoringUtility);
        
        console.log('  ✓ Created memory monitoring utilities');
    }

    async configureGarbageCollection() {
        console.log('\n🗑️  4. Configuring garbage collection optimization...');
        
        const gcConfig = `/**
 * Garbage Collection Configuration for Raspberry Pi
 * Optimizes GC behavior for low-memory environments
 */

class GCOptimizer {
    constructor() {
        this.gcStats = {
            manualTriggers: 0,
            automaticTriggers: 0,
            totalFreedMB: 0,
            avgGCTime: 0
        };
    }

    configure() {
        // Configure automatic GC optimization
        if (global.gc) {
            this.setupPeriodicGC();
            console.log('✓ Manual GC available and configured');
        } else {
            console.log('⚠️ Manual GC not available - ensure --expose-gc flag is set');
        }

        // Monitor GC events if available
        if (process.env.NODE_ENV === 'development') {
            this.setupGCMonitoring();
        }
    }

    setupPeriodicGC() {
        // Trigger GC every 2 minutes during low activity
        setInterval(() => {
            this.performOptimizedGC();
        }, 120000); // 2 minutes
    }

    performOptimizedGC() {
        if (!global.gc) return;

        const before = process.memoryUsage();
        const startTime = Date.now();
        
        try {
            global.gc();
            
            const after = process.memoryUsage();
            const gcTime = Date.now() - startTime;
            const freedMB = Math.round((before.rss - after.rss) / 1024 / 1024);
            
            this.gcStats.manualTriggers++;
            this.gcStats.totalFreedMB += freedMB;
            this.gcStats.avgGCTime = (this.gcStats.avgGCTime + gcTime) / 2;
            
            if (freedMB > 0) {
                console.log(\`🗑️  Periodic GC: freed \${freedMB}MB in \${gcTime}ms\`);
            }
        } catch (error) {
            console.error('GC error:', error);
        }
    }

    setupGCMonitoring() {
        // Hook into V8 GC events (if available)
        try {
            const v8 = require('v8');
            
            // Monitor heap statistics
            setInterval(() => {
                const heapStats = v8.getHeapStatistics();
                const usedMB = Math.round(heapStats.used_heap_size / 1024 / 1024);
                const totalMB = Math.round(heapStats.total_heap_size / 1024 / 1024);
                const limitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
                
                if (usedMB > totalMB * 0.8) {
                    console.log(\`⚠️ Heap usage high: \${usedMB}/\${totalMB}MB (limit: \${limitMB}MB)\`);
                }
            }, 60000); // Check every minute
            
        } catch (error) {
            // V8 module not available or error accessing heap stats
        }
    }

    getGCStats() {
        return {
            ...this.gcStats,
            heapStatistics: this.getHeapStatistics()
        };
    }

    getHeapStatistics() {
        try {
            const v8 = require('v8');
            const stats = v8.getHeapStatistics();
            
            return {
                usedMB: Math.round(stats.used_heap_size / 1024 / 1024),
                totalMB: Math.round(stats.total_heap_size / 1024 / 1024),
                limitMB: Math.round(stats.heap_size_limit / 1024 / 1024),
                availableMB: Math.round(stats.total_available_size / 1024 / 1024),
                mallocedMB: Math.round(stats.malloced_memory / 1024 / 1024),
                peakMallocedMB: Math.round(stats.peak_malloced_memory / 1024 / 1024)
            };
        } catch (error) {
            return { error: 'V8 heap statistics not available' };
        }
    }
}

// Auto-configure GC optimization
const gcOptimizer = new GCOptimizer();
gcOptimizer.configure();

module.exports = gcOptimizer;`;

        const utilsDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'utils');
        await fs.writeFile(path.join(utilsDir, 'gc-optimizer.js'), gcConfig);
        
        console.log('  ✓ Created GC optimization configuration');
    }

    async createSystemdOptimizations() {
        console.log('\n⚙️  5. Creating systemd service optimizations...');
        
        for (const service of this.services) {
            const systemdOverride = this.generateSystemdOverride(service);
            const overridePath = path.join(process.cwd(), 'systemd', `${service.name}-optimized.service`);
            
            await fs.writeFile(overridePath, systemdOverride);
            console.log(`  ✓ Created ${overridePath}`);
        }
    }

    generateSystemdOverride(service) {
        const nodeFlags = this.buildNodeFlags('production');
        
        return `[Unit]
Description=${service.name} - Memory Optimized
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/projects/stinkster_malone/stinkster/${service.path}
ExecStart=/bin/bash start-optimized.sh

# Memory optimization environment
Environment=NODE_ENV=production
Environment=NODE_OPTIONS="${nodeFlags}"
Environment=UV_THREADPOOL_SIZE=2
Environment=V8_MAX_OLD_SPACE_SIZE=1024
Environment=MALLOC_ARENA_MAX=2

# Resource limits (Pi-appropriate)
LimitNOFILE=4096
LimitNPROC=512
MemoryHigh=${service.target_memory_mb}M
MemoryMax=${Math.round(service.target_memory_mb * 1.2)}M

# Restart policy
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=15

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${service.name}-optimized

# Security (optional)
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
`;
    }

    async implementCachingStrategies() {
        console.log('\n💾 6. Implementing caching strategies...');
        
        const cachingUtility = `/**
 * Memory-Efficient Caching Strategies
 * Implements TTL-based caching with memory management
 */

class MemoryEfficientCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 100;
        this.defaultTTL = options.defaultTTL || 60000; // 1 minute
        this.checkInterval = options.checkInterval || 30000; // 30 seconds
        
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0
        };
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.checkInterval);
    }

    set(key, value, ttl = this.defaultTTL) {
        // Remove existing entry if it exists
        if (this.cache.has(key)) {
            this.delete(key);
        }
        
        // Check size limit
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        // Set value with metadata
        const entry = {
            value,
            timestamp: Date.now(),
            ttl,
            accessed: Date.now(),
            hits: 0
        };
        
        this.cache.set(key, entry);
        this.stats.size = this.cache.size;
        
        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);
        
        this.timers.set(key, timer);
        
        return true;
    }

    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }
        
        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            this.stats.misses++;
            return undefined;
        }
        
        // Update access info
        entry.accessed = Date.now();
        entry.hits++;
        this.stats.hits++;
        
        return entry.value;
    }

    has(key) {
        return this.cache.has(key) && this.get(key) !== undefined;
    }

    delete(key) {
        const had = this.cache.has(key);
        this.cache.delete(key);
        
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        
        this.stats.size = this.cache.size;
        return had;
    }

    clear() {
        this.cache.clear();
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.stats.size = 0;
    }

    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.accessed < oldestTime) {
                oldestTime = entry.accessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    cleanup() {
        const now = Date.now();
        const toDelete = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                toDelete.push(key);
            }
        }
        
        toDelete.forEach(key => this.delete(key));
    }

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
            : 0;
            
        return {
            ...this.stats,
            hitRate: hitRate + '%',
            maxSize: this.maxSize,
            utilizationPercent: Math.round((this.stats.size / this.maxSize) * 100) + '%'
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Pre-configured caches for common use cases
const apiResponseCache = new MemoryEfficientCache({
    maxSize: 50,
    defaultTTL: 30000 // 30 seconds
});

const fileListCache = new MemoryEfficientCache({
    maxSize: 20,
    defaultTTL: 60000 // 1 minute
});

const configCache = new MemoryEfficientCache({
    maxSize: 10,
    defaultTTL: 300000 // 5 minutes
});

module.exports = {
    MemoryEfficientCache,
    apiResponseCache,
    fileListCache,
    configCache
};`;

        const utilsDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'utils');
        await fs.writeFile(path.join(utilsDir, 'memory-cache.js'), cachingUtility);
        
        console.log('  ✓ Created memory-efficient caching utilities');
    }

    printOptimizationSummary() {
        console.log('\n📋 MEMORY OPTIMIZATION SUMMARY');
        console.log('===============================');
        
        console.log('🎯 Optimization Targets:');
        this.services.forEach(service => {
            console.log(`  • ${service.name}: ${service.target_memory_mb}MB target`);
        });
        
        console.log('\n🔧 Implemented Optimizations:');
        console.log('  ✓ Node.js memory flags (--max-old-space-size=1024, --optimize-for-size)');
        console.log('  ✓ Garbage collection tuning (--gc-interval=100, --expose-gc)');
        console.log('  ✓ Object pooling for frequent allocations');
        console.log('  ✓ Memory monitoring with automatic GC triggers');
        console.log('  ✓ TTL-based caching with memory management');
        console.log('  ✓ Pi-specific environment variables');
        console.log('  ✓ Systemd resource limits and optimizations');
        
        console.log('\n📊 Expected Results:');
        console.log('  • 35% memory reduction vs Flask baseline');
        console.log('  • Reduced garbage collection pressure');
        console.log('  • Better memory stability on Pi hardware');
        console.log('  • Automatic memory monitoring and optimization');
        
        console.log('\n🚀 Next Steps:');
        console.log('  1. Test optimized services: ./src/nodejs/*/start-optimized.sh');
        console.log('  2. Monitor memory usage: check logs for memory statistics');
        console.log('  3. Validate performance targets with load testing');
        console.log('  4. Deploy systemd optimized services if satisfied');
    }
}

// Run optimization if called directly
if (require.main === module) {
    const optimizer = new MemoryOptimizer();
    optimizer.optimizeAll().catch(error => {
        console.error('Memory optimization failed:', error);
        process.exit(1);
    });
}

module.exports = MemoryOptimizer;