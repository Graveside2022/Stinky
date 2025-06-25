/**
 * Connection Optimization for Express.js
 * Optimizes HTTP connections and keep-alive for better performance
 */

const http = require('http');

class ConnectionOptimizer {
    constructor(options = {}) {
        this.options = {
            keepAliveTimeout: options.keepAliveTimeout || 5000,
            headersTimeout: options.headersTimeout || 6000,
            maxHeaderSize: options.maxHeaderSize || 8192,
            timeout: options.timeout || 30000,
            ...options
        };
    }

    optimizeServer(server) {
        // HTTP server optimizations
        server.keepAliveTimeout = this.options.keepAliveTimeout;
        server.headersTimeout = this.options.headersTimeout;
        server.maxHeaderSize = this.options.maxHeaderSize;
        server.timeout = this.options.timeout;

        // Set max listeners to prevent memory leaks
        server.setMaxListeners(100);

        // Optimize socket settings
        server.on('connection', (socket) => {
            socket.setNoDelay(true);
            socket.setKeepAlive(true, this.options.keepAliveTimeout);
        });

        return server;
    }

    createMiddleware() {
        return (req, res, next) => {
            // Set response headers for optimization
            res.set({
                'Connection': 'keep-alive',
                'Keep-Alive': `timeout=${Math.floor(this.options.keepAliveTimeout / 1000)}`,
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            });

            // Remove unnecessary headers
            res.removeHeader('X-Powered-By');
            
            next();
        };
    }

    getOptimizedHttpAgent() {
        return new http.Agent({
            keepAlive: true,
            keepAliveMsecs: this.options.keepAliveTimeout,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: this.options.timeout
        });
    }
}

module.exports = ConnectionOptimizer;