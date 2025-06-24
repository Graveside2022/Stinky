const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const compression = require('compression');
const Joi = require('joi');
const SpectrumAnalyzer = require('./lib/spectrumCore');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebhookService = require('./lib/webhook');
const simpleWebhookRoutes = require('./lib/webhook/simpleRoutes');
const { corsOptions, handlePreflight, dynamicCors, logger: corsLogger } = require('./lib/corsConfig');

// Import performance modules
const WebSocketBatcher = require('./lib/websocket-batcher');
const DeviceMemoryManager = require('./lib/device-memory-manager');
const PerformanceMonitor = require('./lib/performance-monitor');

const PORT = process.env.PORT || 8003;

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
    new winston.transports.File({ filename: 'spectrum-analyzer.log' })
  ]
});

const app = express();
const server = http.createServer(app);

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor({
  sampleInterval: 5000,
  cpuThreshold: 80,
  memoryThreshold: 85,
  eventLoopThreshold: 100
});

// Initialize device memory manager
const deviceManager = new DeviceMemoryManager({
  maxDevices: 1000,
  maxHistoryPerDevice: 50,
  historyTTL: 3600000, // 1 hour
  cleanupInterval: 300000 // 5 minutes
});

// Initialize WebSocket batcher
const wsBatcher = new WebSocketBatcher({
  batchSize: 50,
  batchInterval: 100,
  maxQueueSize: 1000,
  compressionThreshold: 1024
});

// Configure Socket.IO with performance optimizations
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || corsOptions.origin === '*') {
        return callback(null, true);
      }
      corsOptions.origin(origin, callback);
    },
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
    allowedHeaders: corsOptions.allowedHeaders
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  // Performance optimizations
  perMessageDeflate: {
    threshold: 1024 // Only compress messages larger than 1KB
  },
  httpCompression: {
    threshold: 1024
  }
});

// Initialize spectrum analyzer
const spectrum = new SpectrumAnalyzer({
  fft_size: 0,
  center_freq: 145000000,
  samp_rate: 2400000,
  fft_compression: 'none',
  signal_threshold: -70
});

// Middleware with performance optimizations
app.use(compression({
  level: 6, // Balance between compression and CPU
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(helmet({
  contentSecurityPolicy: false // We'll set CSP per route
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use((req, res, next) => {
  performanceMonitor.trackRequest(req, res);
  next();
});

// CORS handling
app.use(cors(corsOptions));
app.options('*', handlePreflight);

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set longer cache for immutable assets
    if (path.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// API Routes with response caching
const apiCache = new Map();
const CACHE_TTL = 5000; // 5 seconds for dynamic data

app.get('/info', async (req, res) => {
  const cacheKey = 'system-info';
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }
  
  try {
    const info = await getSystemInfo();
    apiCache.set(cacheKey, {
      data: info,
      timestamp: Date.now()
    });
    res.json(info);
  } catch (error) {
    logger.error('Error getting system info:', error);
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

// Device endpoints with memory management
app.get('/api/devices', (req, res) => {
  const filter = {
    maxAge: parseInt(req.query.maxAge) || 300000,
    minRssi: parseInt(req.query.minRssi) || -100,
    type: req.query.type,
    ssid: req.query.ssid
  };
  
  const devices = deviceManager.getActiveDevices(filter);
  res.json({
    devices,
    stats: deviceManager.getMemoryStats()
  });
});

app.get('/api/device/:id/history', (req, res) => {
  const deviceId = req.params.id;
  const limit = parseInt(req.query.limit) || 50;
  
  const history = deviceManager.getDeviceHistory(deviceId, limit);
  res.json({ history });
});

// Performance metrics endpoint
app.get('/api/performance', (req, res) => {
  res.json(performanceMonitor.getSummary());
});

// WebSocket connection handling with performance optimizations
io.on('connection', (socket) => {
  logger.info(`New WebSocket connection: ${socket.id}`);
  performanceMonitor.trackWebSocket(socket);
  
  // Join performance room for batch updates
  socket.join('performance-updates');
  
  // Send initial device state
  const devices = deviceManager.getActiveDevices();
  socket.emit('initial-devices', devices);
  
  // Handle device updates
  socket.on('device-update', (data) => {
    if (data && data.deviceId) {
      deviceManager.addDevice(data.deviceId, data);
      
      // Add to batch queue
      wsBatcher.addMessage('device-update', data, {
        priority: data.priority || 0
      });
    }
  });
  
  // Handle spectrum data requests
  socket.on('spectrum-subscribe', () => {
    socket.join('spectrum-updates');
  });
  
  socket.on('spectrum-unsubscribe', () => {
    socket.leave('spectrum-updates');
  });
  
  // Handle performance monitoring
  socket.on('request-performance', () => {
    socket.emit('performance-update', performanceMonitor.getSummary());
  });
  
  socket.on('disconnect', () => {
    logger.info(`WebSocket disconnected: ${socket.id}`);
  });
});

// Batch processing for WebSocket messages
wsBatcher.on('batch', (batch) => {
  // Send batched updates to all clients in the performance room
  io.to('performance-updates').emit('batch-update', batch);
});

// Start batch processing
setInterval(() => {
  // Get performance metrics
  const perfStats = performanceMonitor.getSummary();
  
  // Add to batch
  wsBatcher.addMessage('performance', perfStats, {
    priority: 1
  });
  
  // Get active devices summary
  const deviceStats = deviceManager.getMemoryStats();
  wsBatcher.addMessage('device-stats', deviceStats, {
    priority: 1
  });
}, 5000);

// Spectrum data streaming with throttling
let spectrumThrottle = null;
spectrum.on('fft', (data) => {
  if (!spectrumThrottle) {
    spectrumThrottle = setTimeout(() => {
      // Send to spectrum subscribers only
      const compressedData = compressSpectrumData(data);
      io.to('spectrum-updates').emit('spectrum-data', compressedData);
      spectrumThrottle = null;
    }, 50); // Throttle to 20 updates per second max
  }
});

// Compress spectrum data for transmission
function compressSpectrumData(data) {
  // Simple compression: reduce precision and sample rate
  const compressed = {
    timestamp: data.timestamp,
    centerFreq: data.centerFreq,
    sampleRate: data.sampleRate,
    // Reduce data points by averaging
    data: downsampleArray(data.fftData, 512)
  };
  
  return compressed;
}

// Downsample array for performance
function downsampleArray(arr, targetLength) {
  if (arr.length <= targetLength) return arr;
  
  const factor = arr.length / targetLength;
  const result = new Array(targetLength);
  
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * factor);
    const end = Math.floor((i + 1) * factor);
    
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += arr[j];
    }
    
    result[i] = sum / (end - start);
  }
  
  return result;
}

// Performance alerts
performanceMonitor.on('alert', (alert) => {
  logger.warn('Performance alert:', alert);
  
  // Notify connected clients
  io.emit('performance-alert', alert);
  
  // Take action based on alert type
  if (alert.type === 'memory' && alert.value > 90) {
    // Trigger aggressive cleanup
    deviceManager.aggressiveCleanup();
    logger.info('Triggered aggressive memory cleanup');
  }
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('Graceful shutdown initiated...');
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Clean up resources
  wsBatcher.destroy();
  deviceManager.destroy();
  performanceMonitor.destroy();
  spectrum.stop();
  
  // Close all WebSocket connections
  io.close(() => {
    logger.info('WebSocket server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
server.listen(PORT, () => {
  logger.info(`Kismet Operations Center (Optimized) running on http://localhost:${PORT}`);
  logger.info('Performance monitoring enabled');
  logger.info(`Device capacity: ${deviceManager.maxDevices} devices`);
  logger.info(`WebSocket batching: ${wsBatcher.batchInterval}ms interval`);
});

// Export for testing
module.exports = { app, server, deviceManager, performanceMonitor };