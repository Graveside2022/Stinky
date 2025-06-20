/**
 * Shared Utility Functions for Stinkster Node.js
 * 
 * Common utility functions used across all services
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class StinksterUtils {
    // Math utilities for signal processing
    static math = {
        // Convert dB to linear scale
        dbToLinear(db) {
            return Math.pow(10, db / 10);
        },

        // Convert linear to dB
        linearToDb(linear) {
            return 10 * Math.log10(linear);
        },

        // Calculate moving average
        movingAverage(data, windowSize) {
            if (data.length < windowSize) return data;
            
            const result = [];
            for (let i = windowSize - 1; i < data.length; i++) {
                const sum = data.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
                result.push(sum / windowSize);
            }
            return result;
        },

        // Find peaks in data above threshold
        findPeaks(data, threshold = 0, minDistance = 1) {
            const peaks = [];
            
            for (let i = 1; i < data.length - 1; i++) {
                if (data[i] > threshold && 
                    data[i] > data[i - 1] && 
                    data[i] > data[i + 1]) {
                    
                    // Check minimum distance from other peaks
                    const tooClose = peaks.some(peak => 
                        Math.abs(peak.index - i) < minDistance);
                    
                    if (!tooClose) {
                        peaks.push({
                            index: i,
                            value: data[i]
                        });
                    }
                }
            }
            
            return peaks.sort((a, b) => b.value - a.value);
        },

        // Calculate bandwidth at -3dB points
        calculateBandwidth(data, peakIndex, binWidth) {
            const peakValue = data[peakIndex];
            const threshold = peakValue - 3; // -3dB point
            
            let leftIndex = peakIndex;
            let rightIndex = peakIndex;
            
            // Find left -3dB point
            while (leftIndex > 0 && data[leftIndex] >= threshold) {
                leftIndex--;
            }
            
            // Find right -3dB point
            while (rightIndex < data.length - 1 && data[rightIndex] >= threshold) {
                rightIndex++;
            }
            
            // Calculate bandwidth including the peak point
            return (rightIndex - leftIndex + 1) * binWidth;
        },

        // Statistical functions
        mean(data) {
            return data.reduce((sum, val) => sum + val, 0) / data.length;
        },

        standardDeviation(data) {
            const mean = this.mean(data);
            const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
            return Math.sqrt(variance);
        },

        percentile(data, percentile) {
            const sorted = [...data].sort((a, b) => a - b);
            const index = (percentile / 100) * (sorted.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index % 1;
            
            if (upper >= sorted.length) return sorted[sorted.length - 1];
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        }
    };

    // File system utilities
    static async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    static async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    static async readFileIfExists(filePath, defaultValue = null) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content;
        } catch {
            return defaultValue;
        }
    }

    static async writeFileAtomic(filePath, content) {
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await fs.writeFile(tempPath, content, 'utf8');
            await fs.rename(tempPath, filePath);
        } catch (error) {
            // Clean up temp file if it exists
            try {
                await fs.unlink(tempPath);
            } catch {}
            throw error;
        }
    }

    // Data format utilities
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatFrequency(hz, decimals = 3) {
        if (hz === 0) return '0 Hz';
        
        const units = [
            { threshold: 1e9, suffix: 'GHz' },
            { threshold: 1e6, suffix: 'MHz' },
            { threshold: 1e3, suffix: 'kHz' },
            { threshold: 1, suffix: 'Hz' }
        ];
        
        for (const unit of units) {
            if (Math.abs(hz) >= unit.threshold) {
                return (hz / unit.threshold).toFixed(decimals) + ' ' + unit.suffix;
            }
        }
        
        return hz.toFixed(decimals) + ' Hz';
    }

    static formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }

    // Network utilities
    static isValidIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    static isValidPort(port) {
        const num = parseInt(port, 10);
        return !isNaN(num) && num >= 1 && num <= 65535;
    }

    static parseHostPort(hostPort, defaultPort = 80) {
        if (!hostPort.includes(':')) {
            return { host: hostPort, port: defaultPort };
        }
        
        const parts = hostPort.split(':');
        const port = parseInt(parts[parts.length - 1], 10);
        
        if (isNaN(port)) {
            return { host: hostPort, port: defaultPort };
        }
        
        const host = parts.slice(0, -1).join(':');
        return { host, port };
    }

    // String utilities
    static generateId(length = 8) {
        return crypto.randomBytes(length).toString('hex');
    }

    static sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9\-_.]/g, '_');
    }

    static truncateString(str, maxLength, suffix = '...') {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    static slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Array utilities
    static chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static uniqueArray(array) {
        return [...new Set(array)];
    }

    static groupBy(array, keyFunction) {
        return array.reduce((groups, item) => {
            const key = keyFunction(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }

    // Object utilities
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static mergeDeep(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.mergeDeep(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    static getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return defaultValue;
            }
        }
        
        return result;
    }

    // Time utilities
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static timeout(promise, ms, errorMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(errorMessage)), ms)
            )
        ]);
    }

    static retry(fn, maxAttempts = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const attempt = async () => {
                attempts++;
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    if (attempts >= maxAttempts) {
                        reject(error);
                    } else {
                        setTimeout(attempt, delay * attempts); // Exponential backoff
                    }
                }
            };
            
            attempt();
        });
    }

    // Validation utilities
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidMAC(mac) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    }

    static isValidSSID(ssid) {
        return typeof ssid === 'string' && ssid.length > 0 && ssid.length <= 32;
    }

    // Performance utilities
    static createProfiler(name) {
        const start = process.hrtime.bigint();
        
        return {
            end() {
                const end = process.hrtime.bigint();
                const duration = Number(end - start) / 1000000; // Convert to milliseconds
                return { name, duration };
            }
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static debounce(func, delay) {
        let timeoutId;
        return function() {
            const args = arguments;
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Memory management utilities
    static getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024),
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024)
        };
    }

    static forceGarbageCollection() {
        if (global.gc) {
            global.gc();
            return true;
        }
        return false;
    }
}

module.exports = StinksterUtils;