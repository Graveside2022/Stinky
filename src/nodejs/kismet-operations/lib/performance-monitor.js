/**
 * Performance Monitor
 * Tracks application performance metrics and provides insights
 */

const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.sampleInterval = options.sampleInterval || 5000; // 5 seconds
        this.historySize = options.historySize || 100;
        this.alertThresholds = {
            cpu: options.cpuThreshold || 80,
            memory: options.memoryThreshold || 80,
            eventLoop: options.eventLoopThreshold || 100, // ms
            ...options.alertThresholds
        };
        
        // Metrics storage
        this.metrics = {
            cpu: [],
            memory: [],
            eventLoop: [],
            requests: [],
            websockets: [],
            custom: new Map()
        };
        
        // Performance marks
        this.marks = new Map();
        this.measures = new Map();
        
        // Request tracking
        this.activeRequests = 0;
        this.totalRequests = 0;
        this.requestErrors = 0;
        
        // WebSocket tracking
        this.activeConnections = 0;
        this.totalConnections = 0;
        this.messagesSent = 0;
        this.messagesReceived = 0;
        
        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        // CPU and Memory monitoring
        this.monitoringTimer = setInterval(() => {
            this.collectMetrics();
        }, this.sampleInterval);
        
        // Event loop monitoring
        this.monitorEventLoop();
    }

    /**
     * Collect system metrics
     */
    collectMetrics() {
        const timestamp = Date.now();
        
        // Memory metrics
        const memUsage = process.memoryUsage();
        const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        
        this.addMetric('memory', {
            timestamp,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            percent: memoryPercent
        });
        
        // CPU metrics (simplified - in production use proper CPU monitoring)
        const cpuUsage = process.cpuUsage();
        this.addMetric('cpu', {
            timestamp,
            user: cpuUsage.user,
            system: cpuUsage.system
        });
        
        // Request metrics
        this.addMetric('requests', {
            timestamp,
            active: this.activeRequests,
            total: this.totalRequests,
            errors: this.requestErrors,
            errorRate: this.totalRequests > 0 ? 
                (this.requestErrors / this.totalRequests) * 100 : 0
        });
        
        // WebSocket metrics
        this.addMetric('websockets', {
            timestamp,
            connections: this.activeConnections,
            totalConnections: this.totalConnections,
            messagesSent: this.messagesSent,
            messagesReceived: this.messagesReceived
        });
        
        // Check thresholds
        this.checkThresholds({
            memory: memoryPercent,
            activeRequests: this.activeRequests,
            connections: this.activeConnections
        });
    }

    /**
     * Monitor event loop lag
     */
    monitorEventLoop() {
        let lastCheck = Date.now();
        
        setInterval(() => {
            const now = Date.now();
            const lag = now - lastCheck - 1000; // Expected 1 second interval
            
            if (lag > 0) {
                this.addMetric('eventLoop', {
                    timestamp: now,
                    lag
                });
                
                if (lag > this.alertThresholds.eventLoop) {
                    this.emit('alert', {
                        type: 'eventLoop',
                        value: lag,
                        threshold: this.alertThresholds.eventLoop,
                        message: `Event loop lag detected: ${lag}ms`
                    });
                }
            }
            
            lastCheck = now;
        }, 1000);
    }

    /**
     * Add metric to history
     * @param {string} type - Metric type
     * @param {Object} data - Metric data
     */
    addMetric(type, data) {
        const metrics = this.metrics[type] || [];
        
        metrics.push(data);
        
        // Trim to history size
        if (metrics.length > this.historySize) {
            metrics.splice(0, metrics.length - this.historySize);
        }
        
        if (type !== 'cpu' && type !== 'memory' && 
            type !== 'eventLoop' && type !== 'requests' && 
            type !== 'websockets') {
            this.metrics.custom.set(type, metrics);
        } else {
            this.metrics[type] = metrics;
        }
    }

    /**
     * Check if any thresholds are exceeded
     * @param {Object} currentMetrics - Current metric values
     */
    checkThresholds(currentMetrics) {
        for (const [metric, value] of Object.entries(currentMetrics)) {
            const threshold = this.alertThresholds[metric];
            
            if (threshold && value > threshold) {
                this.emit('alert', {
                    type: metric,
                    value,
                    threshold,
                    message: `${metric} threshold exceeded: ${value.toFixed(2)} > ${threshold}`
                });
            }
        }
    }

    /**
     * Mark a performance point
     * @param {string} name - Mark name
     */
    mark(name) {
        this.marks.set(name, Date.now());
    }

    /**
     * Measure between two marks
     * @param {string} name - Measure name
     * @param {string} startMark - Start mark name
     * @param {string} endMark - End mark name
     * @returns {number} Duration in milliseconds
     */
    measure(name, startMark, endMark) {
        const start = this.marks.get(startMark);
        const end = endMark ? this.marks.get(endMark) : Date.now();
        
        if (!start) {
            console.warn(`Start mark '${startMark}' not found`);
            return -1;
        }
        
        const duration = end - start;
        
        if (!this.measures.has(name)) {
            this.measures.set(name, []);
        }
        
        const measures = this.measures.get(name);
        measures.push({
            timestamp: Date.now(),
            duration,
            start,
            end
        });
        
        // Keep only recent measures
        if (measures.length > 100) {
            measures.splice(0, measures.length - 100);
        }
        
        return duration;
    }

    /**
     * Track HTTP request
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    trackRequest(req, res) {
        this.activeRequests++;
        this.totalRequests++;
        
        const start = Date.now();
        
        // Track response
        const originalEnd = res.end;
        res.end = (...args) => {
            this.activeRequests--;
            
            const duration = Date.now() - start;
            const statusCode = res.statusCode;
            
            if (statusCode >= 400) {
                this.requestErrors++;
            }
            
            // Add custom metric for request duration
            this.addMetric('requestDuration', {
                timestamp: Date.now(),
                duration,
                method: req.method,
                path: req.path || req.url,
                statusCode
            });
            
            originalEnd.apply(res, args);
        };
    }

    /**
     * Track WebSocket connection
     * @param {Object} socket - Socket instance
     */
    trackWebSocket(socket) {
        this.activeConnections++;
        this.totalConnections++;
        
        socket.on('message', () => {
            this.messagesReceived++;
        });
        
        const originalSend = socket.send;
        socket.send = (...args) => {
            this.messagesSent++;
            return originalSend.apply(socket, args);
        };
        
        socket.on('close', () => {
            this.activeConnections--;
        });
    }

    /**
     * Get current performance summary
     * @returns {Object} Performance summary
     */
    getSummary() {
        const now = Date.now();
        const recentMemory = this.metrics.memory.slice(-10);
        const recentEventLoop = this.metrics.eventLoop.slice(-10);
        
        return {
            timestamp: now,
            memory: {
                current: recentMemory[recentMemory.length - 1] || {},
                average: this.calculateAverage(recentMemory, 'percent'),
                trend: this.calculateTrend(recentMemory, 'percent')
            },
            eventLoop: {
                current: recentEventLoop[recentEventLoop.length - 1] || {},
                average: this.calculateAverage(recentEventLoop, 'lag'),
                maxLag: Math.max(...recentEventLoop.map(m => m.lag || 0))
            },
            requests: {
                active: this.activeRequests,
                total: this.totalRequests,
                errorRate: this.totalRequests > 0 ? 
                    (this.requestErrors / this.totalRequests) * 100 : 0
            },
            websockets: {
                active: this.activeConnections,
                total: this.totalConnections,
                messageRate: this.calculateMessageRate()
            },
            measures: this.getMeasuresSummary()
        };
    }

    /**
     * Calculate average of metric values
     * @param {Array} metrics - Metric array
     * @param {string} field - Field to average
     * @returns {number} Average value
     */
    calculateAverage(metrics, field) {
        if (metrics.length === 0) return 0;
        
        const sum = metrics.reduce((total, metric) => 
            total + (metric[field] || 0), 0
        );
        
        return sum / metrics.length;
    }

    /**
     * Calculate trend (positive = increasing, negative = decreasing)
     * @param {Array} metrics - Metric array
     * @param {string} field - Field to analyze
     * @returns {number} Trend value
     */
    calculateTrend(metrics, field) {
        if (metrics.length < 2) return 0;
        
        const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
        const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
        
        const firstAvg = this.calculateAverage(firstHalf, field);
        const secondAvg = this.calculateAverage(secondHalf, field);
        
        return secondAvg - firstAvg;
    }

    /**
     * Calculate message rate (messages per second)
     * @returns {number} Message rate
     */
    calculateMessageRate() {
        const recentWebsockets = this.metrics.websockets.slice(-2);
        
        if (recentWebsockets.length < 2) return 0;
        
        const timeDiff = recentWebsockets[1].timestamp - recentWebsockets[0].timestamp;
        const messageDiff = (recentWebsockets[1].messagesSent + recentWebsockets[1].messagesReceived) -
                          (recentWebsockets[0].messagesSent + recentWebsockets[0].messagesReceived);
        
        return (messageDiff / timeDiff) * 1000; // Messages per second
    }

    /**
     * Get measures summary
     * @returns {Object} Measures summary
     */
    getMeasuresSummary() {
        const summary = {};
        
        for (const [name, measures] of this.measures.entries()) {
            if (measures.length > 0) {
                const durations = measures.map(m => m.duration);
                summary[name] = {
                    count: measures.length,
                    average: durations.reduce((a, b) => a + b, 0) / durations.length,
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                    last: durations[durations.length - 1]
                };
            }
        }
        
        return summary;
    }

    /**
     * Export metrics for analysis
     * @returns {Object} All metrics
     */
    exportMetrics() {
        return {
            ...this.metrics,
            custom: Object.fromEntries(this.metrics.custom),
            measures: Object.fromEntries(this.measures),
            summary: this.getSummary()
        };
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = {
            cpu: [],
            memory: [],
            eventLoop: [],
            requests: [],
            websockets: [],
            custom: new Map()
        };
        this.marks.clear();
        this.measures.clear();
    }

    /**
     * Destroy the monitor
     */
    destroy() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        this.removeAllListeners();
    }
}

module.exports = PerformanceMonitor;