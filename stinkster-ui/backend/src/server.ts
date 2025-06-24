/**
 * WigleToTAK Backend Server - TypeScript implementation
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';
import path from 'path';

// Import services
import { WigleToTakCore } from './services/wigleToTakCore.js';
import { TAKBroadcaster } from './services/takBroadcaster.js';
import { DeviceManager } from './services/deviceManager.js';
import { WebSocketHandler } from './services/websocketHandler.js';
import { KismetWebSocketService } from './services/kismetWebSocketService.js';

// Import routes
import { createDeviceRouter } from './routes/devices.js';
import { createTAKRouter } from './routes/tak.js';
import { createScanRouter } from './routes/scan.js';
import { createStatsRouter } from './routes/stats.js';
import { createImportExportRouter } from './routes/importExport.js';
import { createAntennaRouter } from './routes/antenna.js';
import { createAlertRouter } from './routes/alerts.js';
import { createGeofenceRouter } from './routes/geofence.js';
import kismetRouter from './routes/kismet.js';
import { createKismetWebSocketRouter } from './routes/kismetWebSocket.js';
import hackrfRouter from './routes/hackrf.js';
import systemRouter from './routes/system.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiKeyAuth } from './middleware/auth.js';

// Import types
import type { WigleConfig, WSEvent, DeviceUpdateEvent, ScanStatusEvent, TAKStatusEvent } from './types/index.js';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Default configuration
const defaultConfig: WigleConfig = {
  takServer: {
    host: process.env.TAK_SERVER_HOST || '239.2.3.1',
    port: parseInt(process.env.TAK_SERVER_PORT || '6969'),
    multicast: process.env.TAK_MULTICAST === 'true',
    multicastGroup: process.env.TAK_MULTICAST_GROUP || '239.2.3.1',
    protocol: (process.env.TAK_PROTOCOL as 'TCP' | 'UDP') || 'UDP',
    secure: false
  },
  antenna: {
    height: parseFloat(process.env.ANTENNA_HEIGHT || '2'),
    gain: parseFloat(process.env.ANTENNA_GAIN || '2.15'),
    pattern: 'omnidirectional',
    sensitivity: 'standard'
  },
  scan: {
    scanInterval: parseInt(process.env.SCAN_INTERVAL || '30'),
    signalThreshold: parseInt(process.env.SIGNAL_THRESHOLD || '-95'),
    maxAge: parseInt(process.env.MAX_AGE || '300'),
    channels: [1, 6, 11],
    ignoreBSSIDs: [],
    analysisMode: 'realtime'
  },
  callsign: process.env.CALLSIGN || 'WIGLE-TAK',
  team: process.env.TEAM || 'Blue',
  role: process.env.ROLE || 'Team Member'
};

// Create Express app and server first
const app: Express = express();
const server = createServer(app);

// Initialize WebSocket handler
const wsHandler = new WebSocketHandler(server, logger, process.env.CORS_ORIGIN || '*');

// Initialize services
const wigleCore = new WigleToTakCore(defaultConfig);
const takBroadcaster = new TAKBroadcaster(defaultConfig.takServer, logger);
const deviceManager = new DeviceManager(logger);

// Initialize Kismet WebSocket service
const kismetService = new KismetWebSocketService(wsHandler, logger);

// Get Socket.IO instance from WebSocket handler
const io = wsHandler.getIO();

// Middleware - Configure helmet with relaxed CSP for SvelteKit
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger(logger));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Optional API key authentication
if (process.env.API_KEY_REQUIRED === 'true') {
  app.use('/api/', apiKeyAuth(process.env.API_KEY || ''));
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    services: {
      tak: takBroadcaster.getStatus(),
      devices: deviceManager.getStats()
    }
  });
});

// Serve static files from dist directory (frontend builds)
app.use('/hackrf', express.static('../dist/hackrf'));
app.use('/wigle', express.static('../dist/wigle'));
app.use('/kismet', express.static('../dist/kismet'));

// Serve SvelteKit app static assets
app.use('/_app', express.static(path.join(process.cwd(), '../dist/_app')));
app.use('/favicon.png', express.static(path.join(process.cwd(), '../frontend/static/favicon.png')));

// Serve static files for Kismet Operations Center
app.use('/css', express.static('public/css'));
app.use('/js', express.static('public/js'));
app.use('/public', express.static('public'));

// Serve individual apps at their respective paths
app.get('/hackrf/*', (req, res) => {
  res.sendFile('index.html', { root: '../dist/hackrf' });
});

app.get('/wigle/*', (req, res) => {
  res.sendFile('index.html', { root: '../dist/wigle' });
});

app.get('/kismet/*', (req, res) => {
  res.sendFile('index.html', { root: '../dist/kismet' });
});

// Kismet Svelte version (comparison route)
app.get('/kismet-svelte', (req, res) => {
  // Force no-cache for the comparison page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'kismet-svelte.html'));
});

// Demo page route
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../../src/demo.html'));
});

// Test page route
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../../test-page.html'));
});

// Debug page route
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, '../../debug.html'));
});

// Kismet Operations Center with HackRF theme
app.get('/kismet-operations', (req, res) => {
  // Force no-cache for the operations page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'kismet-operations.html'));
});

// Kismet Operations Center with exact HackRF UI design
app.get('/kismet-operations-hackrf', (req, res) => {
  // Force no-cache for the operations page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'kismet-operations-hackrf.html'));
});

// Kismet Operations Center with sophisticated exact HackRF design
app.get('/kismet-hackrf-exact', (req, res) => {
  // Force no-cache for the operations page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'kismet-hackrf-exact.html'));
});

// Kismet Operations Center - Simple working version
app.get('/kismet-simple', (req, res) => {
  // Force no-cache for the operations page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'kismet-simple.html'));
});

// Argus Console - Video Game Style Quickstart Menu
app.get('/quickstart', (req, res) => {
  // Force no-cache for the quickstart page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'argus-quickstart.html'));
});

// Argus Console - Alternative Layout (Horizontal Cards)
app.get('/quickstart-alt', (req, res) => {
  // Force no-cache for the alternative quickstart page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'argus-quickstart-alt.html'));
});

// Root route to serve working dashboard
app.get('/', (req, res) => {
  // Force no-cache for the main page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../../working-dashboard.html'));
});

// Backup route for the original working dashboard
app.get('/dashboard-legacy', (req, res) => {
  // Force no-cache for the legacy dashboard
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../../working-dashboard.html'));
});

// Backup route for the original navigation page
app.get('/navigation', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Stinkster UI - Backend Integration</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .nav-links { display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
        .nav-links a { padding: 12px 24px; background: #007acc; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .nav-links a:hover { background: #005580; transform: translateY(-1px); }
        .api-section { margin: 30px 0; }
        .api-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .api-category { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007acc; }
        .api-category h3 { margin-top: 0; color: #333; }
        .api-category ul { margin: 10px 0; padding-left: 20px; }
        .api-category li { margin: 5px 0; }
        .api-category a { color: #007acc; text-decoration: none; }
        .api-category a:hover { text-decoration: underline; }
        .status-indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
        .status-online { background-color: #28a745; }
        .status-offline { background-color: #dc3545; }
        .port-info { background: #e9ecef; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎯 Stinkster TypeScript/Svelte Backend Integration</h1>
        <p>Unified backend serving TypeScript APIs on <strong>port 8005</strong> with full functionality from port 8002.</p>
        
        <div class="port-info">
          ✅ Port 8005: TypeScript Backend (Current) | 🔄 Port 8002: Legacy Operations | 📡 Port 8092: Spectrum Analyzer | 🌐 Port 8073: OpenWebRX
        </div>

        <h2>Frontend Applications</h2>
        <div class="nav-links">
          <a href="/hackrf/">🔬 HackRF SDR</a>
          <a href="/wigle/">📍 WigleToTAK</a>
          <a href="/kismet/">📶 Kismet Operations</a>
          <a href="/kismet-svelte">📶 Kismet Svelte (Legacy)</a>
        </div>

        <div class="api-section">
          <h2>Backend API Integration</h2>
          <div class="api-grid">
            <div class="api-category">
              <h3><span class="status-indicator status-online"></span>Core Services</h3>
              <ul>
                <li><a href="/health">System Health</a></li>
                <li><a href="/api/system/status">Comprehensive Status</a></li>
                <li><a href="/api/system/services">Service Management</a></li>
                <li><a href="/api/system/metrics">Real-time Metrics</a></li>
              </ul>
            </div>

            <div class="api-category">
              <h3><span class="status-indicator status-online"></span>Device & TAK</h3>
              <ul>
                <li><a href="/api/devices">Device Management</a></li>
                <li><a href="/api/tak/status">TAK Connection Status</a></li>
                <li><a href="/api/tak/config">TAK Configuration</a></li>
                <li><a href="/api/stats">System Statistics</a></li>
              </ul>
            </div>

            <div class="api-category">
              <h3><span class="status-indicator status-online"></span>Kismet Integration</h3>
              <ul>
                <li><a href="/api/kismet/service/status">Kismet Service</a></li>
                <li><a href="/api/kismet/devices">WiFi Devices</a></li>
                <li><a href="/api/kismet/ws/status">WebSocket Status</a></li>
                <li><a href="/api/kismet/scripts">Script Management</a></li>
              </ul>
            </div>

            <div class="api-category">
              <h3><span class="status-indicator status-online"></span>HackRF SDR</h3>
              <ul>
                <li><a href="/api/hackrf/status">HackRF Device Status</a></li>
                <li><a href="/api/hackrf/presets">Frequency Presets</a></li>
                <li><a href="/api/hackrf/config">Configuration</a></li>
                <li><a href="/api/hackrf/spectrum">Spectrum Data</a></li>
              </ul>
            </div>

            <div class="api-category">
              <h3><span class="status-indicator status-online"></span>Data & Import/Export</h3>
              <ul>
                <li><a href="/api/import">Data Import</a></li>
                <li><a href="/api/export">Data Export</a></li>
                <li><a href="/api/antenna">Antenna Configuration</a></li>
                <li><a href="/api/alerts">Alert Management</a></li>
              </ul>
            </div>

            <div class="api-category">
              <h3><span class="status-indicator status-online"></span>Real-time Features</h3>
              <ul>
                <li>📡 WebSocket Connections</li>
                <li>🔄 Live Device Updates</li>
                <li>📊 Real-time Spectrum Data</li>
                <li>⚡ Service Status Monitoring</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="api-section">
          <h2>Integration Status</h2>
          <div style="background: #d4edda; padding: 15px; border-radius: 6px; border: 1px solid #c3e6cb;">
            <strong>✅ Phase 3 Complete:</strong> Backend Integration with TypeScript APIs
            <ul style="margin: 10px 0 0 20px;">
              <li>✅ Connected TypeScript APIs to Svelte components</li>
              <li>✅ Implemented Real-time WebSocket updates</li>
              <li>✅ Added Service control functionality</li>
              <li>✅ Connected Monitoring and health APIs</li>
              <li>✅ Integrated Kismet data, TAK status, GPS info flow</li>
              <li>✅ Added comprehensive error handling and loading states</li>
              <li>✅ All port 8002 functionality available on port 8005</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// API Routes
app.use('/api/devices', createDeviceRouter(deviceManager, logger));
app.use('/api/tak', createTAKRouter(takBroadcaster, wigleCore, deviceManager, logger));
app.use('/api/scan', createScanRouter(deviceManager, logger));
app.use('/api/stats', createStatsRouter(deviceManager, logger));
app.use('/api/import', createImportExportRouter(deviceManager, logger));
app.use('/api/export', createImportExportRouter(deviceManager, logger));
app.use('/api/antenna', createAntennaRouter(wigleCore, logger));
app.use('/api/alerts', createAlertRouter(logger));
app.use('/api/geofences', createGeofenceRouter(logger));
app.use('/api/kismet', kismetRouter);
app.use('/api/kismet/ws', createKismetWebSocketRouter(kismetService, wsHandler));
app.use('/api/hackrf', hackrfRouter);
app.use('/api/system', systemRouter);

// WebSocket handling is managed by WebSocketHandler

// Device manager event forwarding
deviceManager.on('deviceAdded', (device) => {
  wsHandler.emitDeviceUpdate(device, 'new');
});

deviceManager.on('deviceUpdated', (device, changes) => {
  wsHandler.emitDeviceUpdate(device, 'update', changes);
});

deviceManager.on('deviceRemoved', (mac) => {
  // Need to get the device to emit remove event
  const device = deviceManager.getDevice(mac);
  if (device) {
    wsHandler.emitDeviceUpdate(device, 'remove');
  }
});

// TAK broadcaster event forwarding
takBroadcaster.on('connected', () => {
  const status = takBroadcaster.getStatus();
  wsHandler.emitTAKStatus({
    connected: true,
    messagesSent: status.messagesSent,
    lastHeartbeat: Date.now(),
    errors: status.errors,
    queueSize: status.queueSize
  });
});

takBroadcaster.on('disconnected', () => {
  const status = takBroadcaster.getStatus();
  wsHandler.emitTAKStatus({
    connected: false,
    messagesSent: status.messagesSent,
    lastHeartbeat: Date.now(),
    errors: status.errors,
    queueSize: status.queueSize
  });
});

takBroadcaster.on('messageSent', (message) => {
  wsHandler.emitTAKMessage(message);
});

// Error handling middleware (must be last)
app.use(errorHandler(logger));

// SvelteKit catch-all route (must be before 404 handler)
app.get('*', (req: Request, res: Response, next) => {
  // Only handle GET requests for pages (not API routes)
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve SvelteKit app for all other routes
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(process.cwd(), '../dist/index.html'));
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: Date.now()
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '8005');
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Connect to TAK server if auto-connect is enabled
    if (process.env.TAK_AUTO_CONNECT === 'true') {
      await takBroadcaster.connect();
      logger.info('Connected to TAK server');
    }

    // Start Kismet WebSocket service if enabled
    if (process.env.KISMET_ENABLED !== 'false') {
      try {
        await kismetService.start();
        logger.info('Kismet WebSocket service started');
      } catch (error) {
        logger.warn('Failed to start Kismet service, continuing without it:', error);
      }
    }

    server.listen(PORT, HOST, () => {
      logger.info(`Server running at http://${HOST}:${PORT}`);
      logger.info(`WebSocket server ready`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Stop Kismet service
  await kismetService.stop();
  
  // Disconnect services
  takBroadcaster.disconnect();
  
  // Shutdown WebSocket handler
  await wsHandler.shutdown();

  // Give services time to clean up
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
}

// Start the server
startServer();

// Export for testing
export { app, server, io, wigleCore, takBroadcaster, deviceManager, wsHandler, kismetService };