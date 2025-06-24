const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const winston = require('winston');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORT || 8889;
const ORIGINAL_SERVER_PORT = process.env.ORIGINAL_SERVER_PORT || 8003;
const ORIGINAL_SERVER_HOST = process.env.ORIGINAL_SERVER_HOST || 'localhost';

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'mobile-server.log' })
  ]
});

const app = express();

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the mobile-optimized HTML file
const mobileOptimizedHtmlPath = path.join(__dirname, 'index_mobile_optimized.html');

// Root route - serve the mobile-optimized HTML
app.get('/', (req, res) => {
  logger.info('Serving mobile-optimized interface');
  res.sendFile(mobileOptimizedHtmlPath, (err) => {
    if (err) {
      logger.error('Failed to serve mobile-optimized HTML', { error: err.message });
      res.status(404).send('Mobile-optimized interface not found. Please ensure the HTML file exists.');
    }
  });
});

// Serve MGRS library (referenced in the HTML)
app.get('/mgrs.min.js', (req, res) => {
  // First try to serve from the original server's public directory
  const mgrsPath = path.join(__dirname, '..', 'kismet-operations', 'public', 'js', 'mgrs.min.js');
  res.sendFile(mgrsPath, (err) => {
    if (err) {
      logger.error('Failed to serve MGRS library', { error: err.message });
      // Return a minimal MGRS stub if the actual file is not found
      res.type('application/javascript');
      res.send(`
        // MGRS library stub
        window.MGRS = {
          forward: function(coords) { return 'N/A'; },
          inverse: function(mgrs) { return [0, 0]; }
        };
      `);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'kismet-mobile-server',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Proxy configuration for API endpoints
const apiProxyOptions = {
  target: `http://${ORIGINAL_SERVER_HOST}:${ORIGINAL_SERVER_PORT}`,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    logger.debug('Proxying API request', {
      method: req.method,
      originalUrl: req.originalUrl,
      target: `http://${ORIGINAL_SERVER_HOST}:${ORIGINAL_SERVER_PORT}${req.originalUrl}`
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    
    logger.debug('Received API response', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error', {
      error: err.message,
      originalUrl: req.originalUrl
    });
    res.status(502).json({
      error: 'Failed to connect to backend service',
      details: err.message
    });
  }
};

// Proxy all API endpoints to the original server
app.use('/info', createProxyMiddleware(apiProxyOptions));
app.use('/kismet-data', createProxyMiddleware(apiProxyOptions));
app.use('/script-status', createProxyMiddleware(apiProxyOptions));
app.use('/run-script', createProxyMiddleware(apiProxyOptions));
app.use('/stop-script', createProxyMiddleware(apiProxyOptions));

// Proxy for Kismet iframe
app.use('/kismet', createProxyMiddleware({
  target: `http://${ORIGINAL_SERVER_HOST}:${ORIGINAL_SERVER_PORT}`,
  changeOrigin: true,
  ws: true, // Enable WebSocket support
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    logger.debug('Proxying Kismet iframe request', {
      method: req.method,
      originalUrl: req.originalUrl
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Remove X-Frame-Options to allow iframe embedding
    delete proxyRes.headers['x-frame-options'];
    proxyRes.headers['content-security-policy'] = "frame-ancestors 'self' *;";
    
    logger.debug('Received Kismet iframe response', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('Kismet iframe proxy error', {
      error: err.message,
      originalUrl: req.originalUrl
    });
    res.status(502).send(`
      <html>
        <body style="margin: 20px; font-family: Arial;">
          <h2>Unable to connect to Kismet</h2>
          <p>The Kismet service is not available.</p>
          <p>Error: ${err.message}</p>
        </body>
      </html>
    `);
  }
}));

// Fallback route for any other static assets that might be referenced
app.use('/assets', express.static(path.join(__dirname, '..', '..', '..', '..', 'assets')));
app.use('/css', express.static(path.join(__dirname, '..', '..', '..', '..', 'assets', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', '..', '..', '..', 'assets', 'js')));

// 404 handler
app.use((req, res, next) => {
  logger.warn('404 Not Found', { url: req.url });
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.url} was not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Mobile-optimized Kismet Operations Center running on port ${PORT}`);
  logger.info(`Proxying API requests to http://${ORIGINAL_SERVER_HOST}:${ORIGINAL_SERVER_PORT}`);
  logger.info(`Serving mobile-optimized interface from: ${mobileOptimizedHtmlPath}`);
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   📱 Mobile-Optimized Kismet Operations Center               ║
║                                                              ║
║   Server running at: http://localhost:${PORT}                  ║
║   Proxying to: http://${ORIGINAL_SERVER_HOST}:${ORIGINAL_SERVER_PORT}                       ║
║                                                              ║
║   Mobile Features:                                           ║
║   ✓ Responsive grid layout                                  ║
║   ✓ Touch event support                                     ║
║   ✓ Mobile-friendly controls                                ║
║   ✓ Optimized scrolling                                     ║
║   ✓ Pinch-to-zoom support                                   ║
║                                                              ║
║   Access at: http://localhost:${PORT}                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

module.exports = app;