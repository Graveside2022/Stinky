/**
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
                console.log(`🗑️  Periodic GC: freed ${freedMB}MB in ${gcTime}ms`);
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
                    console.log(`⚠️ Heap usage high: ${usedMB}/${totalMB}MB (limit: ${limitMB}MB)`);
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

module.exports = gcOptimizer;