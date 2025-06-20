/**
 * Response Compression Middleware
 * Optimized for Raspberry Pi performance with intelligent compression
 */

const zlib = require('zlib');

class CompressionMiddleware {
    constructor(options = {}) {
        this.compressionLevel = options.level || 6; // Balance speed vs size
        this.threshold = options.threshold || 1024; // Only compress > 1KB
        this.enableBrotli = options.enableBrotli || false; // Brotli might be slow on Pi
        
        this.stats = {
            compressed: 0,
            uncompressed: 0,
            totalSaved: 0
        };
    }

    middleware() {
        return (req, res, next) => {
            const acceptEncoding = req.headers['accept-encoding'] || '';
            
            // Skip if client doesn't support compression
            if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('br')) {
                this.stats.uncompressed++;
                return next();
            }

            const originalJson = res.json;
            const originalSend = res.send;
            
            // Override json method
            res.json = (data) => {
                const jsonString = JSON.stringify(data);
                return this.compressResponse(res, jsonString, 'application/json');
            };
            
            // Override send method for other responses
            res.send = (data) => {
                if (typeof data === 'string' && data.length > this.threshold) {
                    return this.compressResponse(res, data, 'text/html');
                }
                return originalSend.call(res, data);
            };

            next();
        };
    }

    compressResponse(res, data, contentType) {
        const originalSize = Buffer.byteLength(data, 'utf8');
        
        // Skip compression for small responses
        if (originalSize < this.threshold) {
            this.stats.uncompressed++;
            res.set('Content-Type', contentType);
            return res.end(data);
        }

        // Use gzip compression (faster than brotli on Pi)
        zlib.gzip(data, { level: this.compressionLevel }, (err, compressed) => {
            if (err) {
                this.stats.uncompressed++;
                res.set('Content-Type', contentType);
                return res.end(data);
            }

            const compressedSize = compressed.length;
            const savedBytes = originalSize - compressedSize;
            const compressionRatio = Math.round((savedBytes / originalSize) * 100);

            // Only use compression if it saves significant space
            if (compressionRatio > 10) {
                this.stats.compressed++;
                this.stats.totalSaved += savedBytes;
                
                res.set('Content-Encoding', 'gzip');
                res.set('Content-Type', contentType);
                res.set('X-Compression-Ratio', compressionRatio + '%');
                res.set('Content-Length', compressedSize);
                res.end(compressed);
            } else {
                this.stats.uncompressed++;
                res.set('Content-Type', contentType);
                res.end(data);
            }
        });
    }

    getStats() {
        const total = this.stats.compressed + this.stats.uncompressed;
        const compressionRate = total > 0 ? Math.round((this.stats.compressed / total) * 100) : 0;
        
        return {
            ...this.stats,
            compressionRate: compressionRate + '%',
            averageSaving: this.stats.compressed > 0 
                ? Math.round(this.stats.totalSaved / this.stats.compressed) + ' bytes'
                : '0 bytes'
        };
    }
}

module.exports = CompressionMiddleware;