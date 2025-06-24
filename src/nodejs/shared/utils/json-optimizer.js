/**
 * JSON Serialization Optimizer
 * Pre-compiled schemas and fast serialization for common responses
 */

class JsonOptimizer {
    constructor() {
        this.schemas = new Map();
        this.setupCommonSchemas();
    }

    setupCommonSchemas() {
        // Status response schema
        this.schemas.set('status', {
            properties: {
                broadcasting: { type: 'boolean' },
                takServerIp: { type: 'string' },
                takServerPort: { type: 'number' },
                analysisMode: { type: 'string' },
                antennaSensitivity: { type: 'string' },
                directory: { type: 'string' },
                processedMacs: { type: 'number' },
                processedEntries: { type: 'number' }
            }
        });

        // File list schema
        this.schemas.set('fileList', {
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string' }
                }
            }
        });

        // Config response schema
        this.schemas.set('config', {
            properties: {
                fft_size: { type: 'number' },
                center_freq: { type: 'number' },
                samp_rate: { type: 'number' },
                signal_threshold: { type: 'number' }
            }
        });
    }

    optimizedStringify(data, schemaName = null) {
        try {
            // For known schemas, use optimized serialization
            if (schemaName && this.schemas.has(schemaName)) {
                return this.fastStringify(data, this.schemas.get(schemaName));
            }
            
            // Fallback to standard JSON.stringify with optimizations
            return JSON.stringify(data, this.jsonReplacer, 0);
            
        } catch (error) {
            // Fallback to standard stringify if optimization fails
            return JSON.stringify(data);
        }
    }

    fastStringify(data, schema) {
        // Simple fast serialization for known structures
        if (!data || typeof data !== 'object') {
            return JSON.stringify(data);
        }

        const parts = [];
        parts.push('{');
        
        let first = true;
        for (const [key, prop] of Object.entries(schema.properties)) {
            if (data.hasOwnProperty(key)) {
                if (!first) parts.push(',');
                parts.push(`"${key}":`);
                
                const value = data[key];
                if (prop.type === 'string') {
                    parts.push(`"${String(value).replace(/"/g, '\\"')}"`);
                } else if (prop.type === 'number') {
                    parts.push(String(Number(value) || 0));
                } else if (prop.type === 'boolean') {
                    parts.push(String(Boolean(value)));
                } else if (prop.type === 'array') {
                    parts.push(JSON.stringify(value));
                } else {
                    parts.push(JSON.stringify(value));
                }
                first = false;
            }
        }
        
        parts.push('}');
        return parts.join('');
    }

    jsonReplacer(key, value) {
        // Remove undefined values
        if (value === undefined) {
            return null;
        }
        
        // Optimize number precision
        if (typeof value === 'number' && !Number.isInteger(value)) {
            return Math.round(value * 1000) / 1000; // 3 decimal places max
        }
        
        return value;
    }

    createMiddleware() {
        return (req, res, next) => {
            const originalJson = res.json;
            
            res.json = (data) => {
                const startTime = Date.now();
                
                // Determine schema based on endpoint
                let schemaName = null;
                if (req.path.includes('/api/status')) {
                    schemaName = 'status';
                } else if (req.path.includes('list_wigle_files')) {
                    schemaName = 'fileList';
                } else if (req.path.includes('/api/config')) {
                    schemaName = 'config';
                }
                
                const jsonString = this.optimizedStringify(data, schemaName);
                const serializationTime = Date.now() - startTime;
                
                res.set('Content-Type', 'application/json');
                res.set('X-Serialization-Time', serializationTime + 'ms');
                res.end(jsonString);
            };
            
            next();
        };
    }
}

module.exports = JsonOptimizer;