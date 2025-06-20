/**
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
        
        console.log(`🔍 Memory monitoring started - Target: ${this.targetMemoryMB}MB`);
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
            console.log(`🗑️  Garbage collection: freed ${freedMB}MB (${beforeMB}MB → ${afterMB}MB)`);
            
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

module.exports = MemoryMonitor;