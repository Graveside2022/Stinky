import express, { Request, Response, NextFunction, Application } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import winston from 'winston';
import path from 'path';
import Joi from 'joi';
import { spawn, exec, ChildProcess } from 'child_process';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import { promisify } from 'util';

// Import types
import type {
  SpectrumConfig,
  SignalProcessingConfig,
  KismetDevice,
  KismetNetwork,
  ScriptInfo,
  ScriptResult,
  ScriptStatus,
  Signal,
  SignalDetection,
  FFTData,
  SignalStreamEvent,
  SignalFilters,
  ApiResponse,
  KismetDataResponse,
  SystemInfo,
  KismetFrontendData,
  ProcessInfo,
  WebhookConfig,
  ConfigValidationError,
  SpectrumStatus,
  ServiceStatus,
  ScanProfile,
  ScanResult,
  Location,
  KismetSignal
} from './types';

// Import local modules
const SpectrumAnalyzer = require('./lib/spectrumCore');
const WebhookService = require('./lib/webhook');
const simpleWebhookRoutes = require('./lib/webhook/simpleRoutes');
const { corsOptions, handlePreflight, dynamicCors, logger: corsLogger } = require('./lib/corsConfig');

// Import helper functions
import {
  generateDemoSignals,
  checkKismetConnection,
  fetchKismetData,
  transformKismetData,
  generateDemoKismetData,
  getCurrentGPSPosition,
  extractSignalsFromKismetData
} from './server-continuation';

const execAsync = promisify(exec);
const PORT = process.env.PORT || 8003;

// Configuration validation schema
const configSchema = Joi.object({
  fft_size: Joi.number().integer().min(0).default(0),
  center_freq: Joi.number().min(0).default(145000000),
  samp_rate: Joi.number().min(0).default(2400000),
  fft_compression: Joi.string().valid('none', 'gzip', 'zlib').default('none'),
  signal_threshold: Joi.number().default(-70),
  signal_processing: Joi.object({
    enabled: Joi.boolean().default(true),
    algorithm: Joi.string().valid('peak', 'threshold', 'adaptive').default('peak'),
    window_size: Joi.number().integer().min(1).default(10),
    overlap: Joi.number().min(0).max(1).default(0.5)
  }).default({
    enabled: true,
    algorithm: 'peak',
    window_size: 10,
    overlap: 0.5
  })
});

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

const app: Application = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
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
  transports: ['websocket', 'polling']
});

// Initialize spectrum analyzer with default configuration
const spectrum = new SpectrumAnalyzer({
  fft_size: 0,
  center_freq: 145000000, // 145 MHz default
  samp_rate: 2400000,     // 2.4 MHz default
  fft_compression: 'none',
  signal_threshold: -70
});

// Simple Script Manager for start/stop functionality
class SimpleScriptManager {
  private scriptPaths: { [key: string]: string };
  private pidFiles: { [key: string]: string };
  private processes: Map<string, number>;

  constructor() {
    this.scriptPaths = {
      gps_kismet_wigle: '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh',
      kismet: '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh'
    };
    this.pidFiles = {
      gps_kismet_wigle: '/home/pi/tmp/gps_kismet_wigle.pids',
      kismet: '/tmp/kismet_script.pid'
    };
    this.processes = new Map();
  }

  async startScript(scriptName: string): Promise<ScriptResult> {
    const scriptPath = this.scriptPaths[scriptName];
    if (!scriptPath) {
      throw new Error(`Unknown script: ${scriptName}`);
    }

    // Check if already running
    const isRunning = await this.isScriptRunning(scriptName);
    if (isRunning) {
      throw new Error(`Script ${scriptName} is already running`);
    }

    return new Promise((resolve, reject) => {
      // For the orchestration script, try different approaches
      if (scriptName === 'gps_kismet_wigle') {
        // First, try using the systemd service if available
        exec('systemctl --user start kismet-orchestration 2>&1', (error, stdout, stderr) => {
          if (!error) {
            resolve({ script: scriptName, method: 'systemd-user', message: 'Started via user systemd service' });
            return;
          }
          
          // If user systemd fails, try system systemd
          exec('systemctl start kismet-orchestration 2>&1', (systemError, systemStdout, systemStderr) => {
            if (!systemError) {
              resolve({ script: scriptName, method: 'systemd', message: 'Started via system systemd service' });
              return;
            }
            
            // If systemd fails, run directly without sudo
            const child = spawn('bash', [scriptPath], {
              detached: true,
              stdio: 'ignore',
              env: { ...process.env, NO_SUDO: '1' }  // Pass flag to script
            });

            child.on('spawn', () => {
              this.processes.set(scriptName, child.pid!);
              resolve({ pid: child.pid, script: scriptName, method: 'direct', message: 'Started directly without sudo' });
            });

            child.on('error', (err) => {
              reject(new Error(`Failed to start ${scriptName}: ${err.message}. User systemd: ${error.message}, System systemd: ${systemError.message}`));
            });

            child.unref();
          });
        });
      } else {
        // For other scripts, use the standard approach
        const child = spawn('bash', [scriptPath], {
          detached: true,
          stdio: 'ignore'
        });

        child.on('spawn', () => {
          this.processes.set(scriptName, child.pid!);
          resolve({ pid: child.pid, script: scriptName });
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to start ${scriptName}: ${error.message}`));
        });

        child.unref();
      }
    });
  }

  async stopScript(scriptName: string): Promise<ScriptResult> {
    try {
      // Try to stop using the specific script's stop mechanism
      if (scriptName === 'gps_kismet_wigle') {
        return await this.stopGpsKismetWigle();
      } else {
        return await this.stopGenericScript(scriptName);
      }
    } catch (error) {
      throw new Error(`Failed to stop ${scriptName}: ${(error as Error).message}`);
    }
  }

  private async stopGpsKismetWigle(): Promise<ScriptResult> {
    // Stop using pkill commands for comprehensive cleanup
    const stopCommands = [
      'pkill -f "gps_kismet_wigle"',
      'pkill -f "kismet"',
      'pkill -f "WigleToTak2"',
      'pkill -f "mavgps"'
    ];

    const errors: string[] = [];
    const results: any[] = [];

    // Execute all commands with timeout and proper error handling
    for (const cmd of stopCommands) {
      try {
        // Add timeout option to prevent hanging
        const result = await execAsync(cmd, { timeout: 5000 }); // 5 second timeout per command
        results.push({ cmd, success: true, stdout: result.stdout });
      } catch (error: any) {
        // pkill returns exit code 1 when no processes are found, which is not an error for us
        if (error.code === 1 || error.message.includes('No such process')) {
          results.push({ cmd, success: true, message: 'No process found' });
        } else if (error.code === 'ETIMEDOUT') {
          errors.push(`Command timed out: ${cmd}`);
          results.push({ cmd, success: false, error: 'Timeout' });
        } else {
          errors.push(`${cmd}: ${error.message}`);
          results.push({ cmd, success: false, error: error.message });
        }
      }
    }

    // Clean up PID files
    logger.info('Cleaning up PID files...');
    const pidCleanupCommands = [
      'rm -f /home/pi/tmp/gps_kismet_wigle.pids',
      'rm -f /home/pi/tmp/kismet.pid',
      'rm -f /home/pi/tmp/wigletotak.pid',
      'rm -f /home/pi/projects/stinkster/logs/gps_kismet_wigle.pids',
      'rm -f /home/pi/projects/stinkster/data/kismet/kismet.pid'
    ];
    
    for (const cmd of pidCleanupCommands) {
      try {
        await execAsync(cmd, { timeout: 1000 });
        results.push({ cmd, success: true, message: 'PID file removed' });
      } catch (error) {
        // File might not exist, which is fine
        results.push({ cmd, success: true, message: 'PID file not found or already removed' });
      }
    }

    // Reset wlan2 to managed mode and restart network
    logger.info('Resetting wlan2 to managed mode...');
    const networkCommands = [
      'sudo ip link set wlan2 down',
      'sudo iw dev wlan2 set type managed',
      'sudo ip link set wlan2 up',
      'sudo systemctl restart networking',
      'sleep 5' // Give network time to reconnect
    ];

    for (const cmd of networkCommands) {
      try {
        const result = await execAsync(cmd, { timeout: 10000 }); // 10 second timeout
        results.push({ cmd, success: true, stdout: result.stdout });
        logger.info(`Network reset: ${cmd} completed`);
      } catch (error: any) {
        errors.push(`Network reset failed - ${cmd}: ${error.message}`);
        results.push({ cmd, success: false, error: error.message });
        logger.error(`Network reset error: ${cmd} - ${error.message}`);
      }
    }

    // Restart Tailscale to ensure connectivity
    logger.info('Restarting Tailscale...');
    try {
      await execAsync('sudo tailscale up', { timeout: 15000 }); // 15 second timeout
      results.push({ cmd: 'tailscale up', success: true, message: 'Tailscale reconnected' });
      logger.info('Tailscale reconnected successfully');
    } catch (error: any) {
      // Try status check even if up command fails
      try {
        const statusResult = await execAsync('tailscale status', { timeout: 5000 });
        if (statusResult.stdout.includes('100.')) {
          results.push({ cmd: 'tailscale status', success: true, message: 'Tailscale already connected' });
          logger.info('Tailscale already connected');
        } else {
          errors.push(`Tailscale reconnection failed: ${error.message}`);
          results.push({ cmd: 'tailscale up', success: false, error: error.message });
          logger.error('Tailscale reconnection failed:', error.message);
        }
      } catch (statusError: any) {
        errors.push(`Tailscale status check failed: ${statusError.message}`);
        logger.error('Tailscale status check failed:', statusError.message);
      }
    }

    if (errors.length > 0) {
      logger.warn('Some stop commands had errors:', errors);
    }

    // Always resolve - the processes might have already been stopped
    return { 
      script: 'gps_kismet_wigle', 
      stopped: true,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async stopGenericScript(scriptName: string): Promise<ScriptResult> {
    const pid = this.processes.get(scriptName);
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
        this.processes.delete(scriptName);
        return { script: scriptName, pid, stopped: true };
      } catch (error) {
        throw new Error(`Failed to kill process ${pid}: ${(error as Error).message}`);
      }
    } else {
      throw new Error(`No running process found for ${scriptName}`);
    }
  }

  async isScriptRunning(scriptName: string): Promise<boolean> {
    try {
      if (scriptName === 'gps_kismet_wigle') {
        // Check if the actual script file is running as a process
        return new Promise((resolve) => {
          exec('ps aux | grep -v grep | grep "gps_kismet_wigle.sh"', (error, stdout) => {
            resolve(!error && stdout.trim().length > 0);
          });
        });
      } else {
        const pid = this.processes.get(scriptName);
        if (!pid) return false;
        
        try {
          process.kill(pid, 0); // Test if process exists
          return true;
        } catch {
          return false;
        }
      }
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<ScriptStatus> {
    // Check if the orchestration script is running
    const orchestrationRunning = await this.isScriptRunning('gps_kismet_wigle');
    
    // Check for actual services
    const checkService = async (processName: string): Promise<boolean> => {
      return new Promise((resolve) => {
        exec(`pgrep -f "${processName}" | head -1`, (error, stdout) => {
          resolve(!error && stdout.trim().length > 0);
        });
      });
    };
    
    // Enhanced service readiness check for Kismet
    const checkKismetReady = async (): Promise<boolean> => {
      try {
        // First check if process exists
        const processExists = await checkService('kismet_server');
        if (!processExists) return false;
        
        // Then check if Kismet API is responding
        const response = await axios.get('http://localhost:2501/system/status.json', {
          timeout: 2000,
          validateStatus: () => true // Don't throw on any status
        });
        
        return response.status === 200;
      } catch (error) {
        return false;
      }
    };
    
    // Check WigleToTak service
    const checkWigleReady = async (): Promise<boolean> => {
      try {
        // Check if the Python process exists
        const processExists = await checkService('WigleToTak2.py');
        if (!processExists) return false;
        
        // Also check if port 6969 is listening (TAK port)
        const { stdout } = await execAsync('sudo lsof -i:6969 | grep LISTEN', { timeout: 2000 });
        
        return stdout.trim().length > 0;
      } catch (error) {
        return false;
      }
    };
    
    // Check all services
    const [kismetRunning, wigleRunning] = await Promise.all([
      checkKismetReady(),
      checkWigleReady()
    ]);
    
    return {
      gps_kismet_wigle: { running: orchestrationRunning },
      kismet: { running: kismetRunning },
      wigle: { running: wigleRunning }
    };
  }
}

const scriptManager = new SimpleScriptManager();

// Trust proxy headers (required for correct client IP behind nginx)
app.set('trust proxy', true);

// Disable most helmet security features for development
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP entirely for now
  hsts: false, // Disable HSTS
  crossOriginOpenerPolicy: false, // Disable COOP
  crossOriginResourcePolicy: false, // Disable CORP
  originAgentCluster: false, // Disable Origin-Agent-Cluster
  frameguard: false // Disable X-Frame-Options to allow iframe embedding
}));
app.use(handlePreflight);
app.use(cors(corsOptions));
app.use(dynamicCors);

// Configure Morgan to log the real client IP when behind a proxy
morgan.token('remote-addr', (req) => {
  const expressReq = req as Request;
  return expressReq.ip || expressReq.headers['x-forwarded-for'] || expressReq.headers['x-real-ip'] || expressReq.socket.remoteAddress;
});
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Serve static assets from the main assets directory
app.use('/css', express.static(path.join(__dirname, '..', '..', '..', 'assets', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', '..', '..', 'assets', 'js')));

// Serve offline map tiles if they exist
const offlineTilesPath = path.join(__dirname, '../../../data/offline-tiles/tiles');
if (fs.existsSync(offlineTilesPath)) {
  app.use('/offline-tiles', express.static(offlineTilesPath));
  logger.info('Serving offline map tiles from:', offlineTilesPath);
} else {
  logger.info('Offline map tiles not found at:', offlineTilesPath);
}

// Serve mobile-optimized HTML as the main page
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'index_mobile_optimized.html'));
});

// Template engine setup (not needed for static HTML)
app.set('views', path.join(__dirname, 'views'));

// Mount simple webhook routes
simpleWebhookRoutes(app);

// Proxy middleware for Kismet API
app.use('/api/kismet', createProxyMiddleware({
  target: 'http://localhost:2501',
  changeOrigin: true,
  auth: 'admin:admin', // Add authentication
  timeout: 30000, // 30 second timeout
  proxyTimeout: 30000, // 30 second proxy timeout
  pathRewrite: {
    '^/api/kismet': '', // Remove /api/kismet prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add any required headers here
    logger.debug('Proxying request to Kismet', {
      method: req.method,
      originalUrl: req.originalUrl,
      targetPath: proxyReq.path
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to the response
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    
    // Log successful proxy responses
    logger.debug('Received response from Kismet', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error for Kismet', {
      error: err.message,
      originalUrl: req.originalUrl
    });
    (res as Response).status(502).json({
      error: 'Failed to connect to Kismet service',
      details: err.message
    });
  }
}));

// Proxy middleware for WigleToTak API
app.use('/api/wigle', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/wigle': '', // Remove /api/wigle prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add any required headers here
    logger.debug('Proxying request to WigleToTak', {
      method: req.method,
      originalUrl: req.originalUrl,
      targetPath: proxyReq.path
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to the response
    proxyRes.headers['access-control-allow-origin'] = '*';
    
    // Log successful proxy responses
    logger.debug('Received response from WigleToTak', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error for WigleToTak', {
      error: err.message,
      originalUrl: req.originalUrl
    });
    (res as Response).status(502).json({
      error: 'Failed to connect to WigleToTak service',
      details: err.message
    });
  }
}));

// Proxy middleware for Kismet iframe integration
app.use('/kismet', createProxyMiddleware({
  target: 'http://localhost:2501',
  changeOrigin: true,
  auth: 'admin:admin', // Add authentication
  ws: true, // Enable WebSocket support for Kismet
  timeout: 30000, // 30 second timeout
  proxyTimeout: 30000, // 30 second proxy timeout
  // Properly handle path rewriting for assets
  pathRewrite: function(path, req) {
    // Don't rewrite the base /kismet path
    if (path === '/kismet' || path === '/kismet/') {
      return '/';
    }
    // Remove /kismet prefix for all other paths
    return path.replace(/^\/kismet/, '');
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log proxied requests
    logger.debug('Proxying iframe request to Kismet', {
      method: req.method,
      originalUrl: req.originalUrl,
      targetPath: proxyReq.path
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Remove X-Frame-Options to allow iframe embedding
    delete proxyRes.headers['x-frame-options'];
    
    // Add CORS headers
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    
    // Allow iframe embedding
    proxyRes.headers['content-security-policy'] = "frame-ancestors 'self' *;";
    
    // For HTML responses, inject a base tag to fix relative URLs
    const contentType = proxyRes.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      const _writeHead = (res as any).writeHead;
      const _write = (res as any).write;
      const _end = (res as any).end;
      
      let responseBody = '';
      
      // Override writeHead to prevent automatic content-length
      (res as any).writeHead = function() {
        // Remove content-length as we're modifying the response
        delete proxyRes.headers['content-length'];
        _writeHead.apply(res, arguments);
      };
      
      // Capture the response body
      (res as any).write = function(chunk: any) {
        responseBody += chunk;
      };
      
      // Modify the response body before sending
      (res as any).end = function(chunk: any) {
        if (chunk) responseBody += chunk;
        
        // Inject base tag after <head> to fix relative URLs
        responseBody = responseBody.replace(
          /<head[^>]*>/i,
          '$&<base href="/kismet/">'
        );
        
        _write.call(res, responseBody);
        _end.call(res);
      };
    }
    
    logger.debug('Received iframe response from Kismet', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error for Kismet iframe', {
      error: err.message,
      originalUrl: req.originalUrl
    });
    (res as Response).status(502).send(`
      <html>
        <body style="margin: 20px; font-family: Arial;">
          <h2>Unable to connect to Kismet</h2>
          <p>The Kismet service is not available.</p>
          <p>Error: ${err.message}</p>
          <p>Please ensure Kismet is running on port 2501.</p>
        </body>
      </html>
    `);
  }
}));

// Routes
app.get('/', (req: Request, res: Response) => {
  // Force no-cache for the main page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'views', 'hi.html'));
});

// Add specific route for hi.html
app.get('/hi.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'hi.html'));
});

// Add /hi route (without .html extension)
app.get('/hi', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'hi.html'));
});

// Test page route
app.get('/test-buttons', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'test-buttons.html'));
});

// Add routes for other HTML pages
app.get('/wigle.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'wigle.html'));
});

app.get('/atak.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'atak.html'));
});

app.get('/kismet2.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'kismet2.html'));
});

// Add iframe test page
app.get('/iframe-test.html', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'iframe-test.html'));
});

// Test page for signal stream
app.get('/test-signal-stream', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'test-signal-stream.html'));
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'kismet-operations',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    port: PORT,
    version: '2.0.0',
    openwebrx_connected: spectrum.getStatus().connected || false,
    fft_buffer_size: spectrum.fft_buffer.length,
    connected_clients: io.engine.clientsCount
  });
});

// Debug endpoint to check IP detection
app.get('/debug-ip', (req: Request, res: Response) => {
  const ipInfo = {
    'req.ip': req.ip,
    'req.ips': req.ips,
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-real-ip': req.headers['x-real-ip'],
    'x-forwarded-host': req.headers['x-forwarded-host'],
    'connection.remoteAddress': req.connection ? req.connection.remoteAddress : 'N/A',
    'socket.remoteAddress': req.socket ? req.socket.remoteAddress : 'N/A',
    'trust proxy setting': req.app.get('trust proxy'),
    'all headers': req.headers
  };
  res.json(ipInfo);
});

// Info endpoint for system status (frontend compatibility)
app.get('/info', (req: Request, res: Response) => {
  // Get client IP address from various sources
  let ipAddress = req.ip;
  
  // If req.ip doesn't give us what we need, try other sources
  if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === '::ffff:127.0.0.1') {
    ipAddress = (req.headers['x-forwarded-for'] || 
                req.headers['x-real-ip'] || 
                req.connection?.remoteAddress || 
                req.socket?.remoteAddress ||
                req.ip) as string;
  }
  
  // Handle x-forwarded-for with multiple IPs (take the first one)
  if (ipAddress && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }
  
  // Clean up IPv6 formatted IPv4 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ipAddress && ipAddress.includes('::ffff:')) {
    ipAddress = ipAddress.replace('::ffff:', '');
  }
  
  // Final cleanup - if still localhost, try to get from socket
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === 'localhost') {
    const socketAddr = req.socket?.remoteAddress;
    if (socketAddr && !socketAddr.includes('127.0.0.1') && !socketAddr.includes('::1')) {
      ipAddress = socketAddr.replace('::ffff:', '');
    }
  }
  
  const response: SystemInfo = {
    ip: ipAddress,
    gps: {
      status: 'Connected', // TODO: Get real GPS status
      lat: '37.7749',      // TODO: Get real GPS coordinates
      lon: '-122.4194',
      alt: '15.0m',
      time: new Date().toISOString()
    }
  };
  
  res.json(response);
});

// Initialize Kismet client
const KismetClient = require('./lib/webhook/kismetClient');
const kismetClient = new KismetClient({
  baseUrl: 'http://localhost:2501',
  timeout: 10000,
  auth: {
    username: 'admin',
    password: 'admin'
  }
}, logger);

// Kismet data endpoint (frontend compatibility)
app.get('/kismet-data', async (req: Request, res: Response) => {
  try {
    // Get data from Kismet
    const kismetData = await kismetClient.getData({
      type: 'all',
      limit: 50,
      since: new Date(Date.now() - 300000) // Last 5 minutes
    });

    // Format recent devices
    const recentDevices = (kismetData.devices || []).slice(0, 10).map((device: any) => ({
      mac: device.mac,
      manufacturer: device.manufacturer,
      type: device.type,
      lastSeen: device.lastSeen,
      signal: device.signal.last || 'N/A'
    }));

    // Create feed items from recent activity
    const feedItems: any[] = [];
    
    // Add system status
    feedItems.push({
      type: 'System',
      message: 'Kismet operations center online',
      timestamp: new Date().toISOString()
    });

    // Add recent device discoveries
    (kismetData.devices || []).slice(0, 5).forEach((device: any) => {
      feedItems.push({
        type: 'Device',
        message: `Detected ${device.type}: ${device.mac} (${device.manufacturer})`,
        timestamp: device.lastSeen
      });
    });

    // Add recent network discoveries
    (kismetData.networks || []).slice(0, 5).forEach((network: any) => {
      feedItems.push({
        type: 'Network',
        message: `Found network: ${network.ssid} on channel ${network.channel}`,
        timestamp: network.lastSeen
      });
    });

    const response: KismetFrontendData = {
      devices_count: kismetData.summary?.totalDevices || 0,
      networks_count: kismetData.summary?.totalNetworks || 0,
      recent_devices: recentDevices,
      feed_items: feedItems.sort((a, b) => 
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      ).slice(0, 10)
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to fetch Kismet data', { error: (error as Error).message });
    
    // Return empty data on error
    const response: KismetFrontendData = {
      devices_count: 0,
      networks_count: 0,
      recent_devices: [],
      feed_items: [
        {
          type: 'Error',
          message: `Failed to connect to Kismet: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    res.json(response);
  }
});

// Root-level webhook endpoints for frontend compatibility

/**
 * POST /run-script - Start Kismet services (frontend compatibility)
 */
app.post('/run-script', async (req: Request, res: Response) => {
  try {
    // Support both script_name and script parameters for backward compatibility
    const { script_name, script, args = [] } = req.body;
    const scriptName = script_name || script;
    logger.info('Running script via frontend', { scriptName, args });
    
    // Map 'kismet' to 'gps_kismet_wigle' for compatibility
    let scriptToRun = scriptName === 'kismet' ? 'gps_kismet_wigle' : (scriptName || 'gps_kismet_wigle');
    
    // Handle the different script names
    if (scriptName === 'smart_restart' && args.includes('start')) {
      // Use the smart restart script for starting
      const scriptPath = path.join(__dirname, '..', '..', 'orchestration', 'smart_restart.sh');
      
      // Use spawn with detached:true to handle scripts that use exec
      const child = spawn('bash', [scriptPath, 'start'], {
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref(); // Allow the parent to exit independently
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({
        success: true,
        status: 'success',
        message: 'Kismet services started successfully',
        script: scriptName,
        timestamp: new Date().toISOString()
      });
    } else if (scriptName === 'stop_restart_services' && args.includes('stop')) {
      // Use the stop and restart script for stopping
      const scriptPath = path.join(__dirname, '..', '..', 'orchestration', 'stop_and_restart_services.sh');
      
      // Use spawn with detached:true to handle scripts that use exec
      const child = spawn('bash', [scriptPath, 'stop'], {
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref(); // Allow the parent to exit independently
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({
        status: 'success',
        message: 'Kismet services stopped successfully',
        script: scriptName,
        timestamp: new Date().toISOString()
      });
    } else {
      // Default behavior - start the orchestration script
      const result = await scriptManager.startScript(scriptToRun);
      
      res.json({
        success: true,
        status: 'success',
        message: 'Script started successfully',
        script: scriptToRun,
        pid: result.pid,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Failed to run script', { error: (error as Error).message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to run script',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /stop-script - Stop Kismet services (frontend compatibility)
 */
app.post('/stop-script', async (req: Request, res: Response) => {
  // Set a response timeout to prevent hanging
  const responseTimeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.error('Stop script timeout - sending timeout response');
      res.status(504).json({
        status: 'error',
        message: 'Stop operation timed out',
        details: 'The stop operation took too long to complete. Services may still be stopping in the background.',
        timestamp: new Date().toISOString()
      });
    }
  }, 25000); // 25 second total timeout (allowing for 4 commands at 5 seconds each plus overhead)

  try {
    logger.info('Stopping Kismet services via frontend');
    
    // Stop all related services
    const result = await scriptManager.stopScript('gps_kismet_wigle');
    
    // Clear the timeout since we got a response
    clearTimeout(responseTimeout);
    
    if (!res.headersSent) {
      res.json({
        status: 'success',
        message: 'Kismet services stopped successfully',
        script: 'gps_kismet_wigle',
        stopped: result.stopped,
        results: result.results,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Failed to stop Kismet services', { error: (error as Error).message });
    
    // Clear the timeout
    clearTimeout(responseTimeout);
    
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to stop Kismet services',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * GET /script-status - Get service status (frontend compatibility)
 */
app.get('/script-status', async (req: Request, res: Response) => {
  try {
    // Get status from script manager
    const status = await scriptManager.getStatus();
    
    // Transform to format expected by frontend
    const response: ServiceStatus = {
      kismet_running: false,
      wigle_running: false,
      gps_running: false,
      timestamp: new Date().toISOString()
    };
    
    // Check various script statuses
    if (status && status.gps_kismet_wigle && status.gps_kismet_wigle.running) {
      response.kismet_running = true;
      response.wigle_running = true;
      response.gps_running = true;
    } else {
      // Check individual services
      if (status && status.kismet && status.kismet.running) {
        response.kismet_running = true;
      }
      if (status && status.wigle && status.wigle.running) {
        response.wigle_running = true;
      }
      if (status && status.gps && status.gps.running) {
        response.gps_running = true;
      }
    }
    
    res.json(response);
    
  } catch (error) {
    logger.error('Failed to get script status', { error: (error as Error).message });
    
    // Return safe default status
    const response: ServiceStatus = {
      kismet_running: false,
      wigle_running: false,
      gps_running: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  }
});

/**
 * Kismet data endpoint - provides integration with Kismet WiFi scanning data
 * This endpoint serves as a bridge between Kismet and the frontend on port 8092
 */
app.get('/api/kismet-data', async (req: Request, res: Response) => {
  try {
    // Configuration for Kismet integration
    const kismetConfig = {
      baseUrl: process.env.KISMET_URL || 'http://localhost:2501',
      apiKey: process.env.KISMET_API_KEY || '',
      timeout: parseInt(process.env.KISMET_TIMEOUT || '5000')
    };

    // Check if we have real Kismet data available
    const hasKismetConnection = await checkKismetConnection(kismetConfig);
    
    if (hasKismetConnection) {
      // Fetch real data from Kismet
      const kismetData = await fetchKismetData(kismetConfig);
      
      // Transform Kismet data to the expected format
      const transformedData = transformKismetData(kismetData);
      
      // Extract and broadcast signals from Kismet data
      extractSignalsFromKismetData(transformedData, broadcastSignalDetection);
      
      const response: KismetDataResponse = {
        success: true,
        source: 'kismet',
        timestamp: Date.now(),
        data: transformedData,
        stats: {
          total_devices: transformedData.devices?.length || 0,
          total_networks: transformedData.networks?.length || 0,
          kismet_connected: true
        }
      };
      
      res.json(response);
    } else {
      // Return demo data if Kismet is not available
      const demoData = generateDemoKismetData();
      
      const response: KismetDataResponse = {
        success: true,
        source: 'demo',
        timestamp: Date.now(),
        data: demoData,
        stats: {
          total_devices: demoData.devices?.length || 0,
          total_networks: demoData.networks?.length || 0,
          kismet_connected: false
        },
        warning: 'Kismet service not available, returning demo data'
      };
      
      res.json(response);
    }
  } catch (error) {
    logger.error('Error fetching Kismet data', { error: (error as Error).message });
    
    // Return demo data on error
    const demoData = generateDemoKismetData();
    
    const response: KismetDataResponse = {
      success: false,
      source: 'demo',
      timestamp: Date.now(),
      data: demoData,
      stats: {
        total_devices: demoData.devices?.length || 0,
        total_networks: demoData.networks?.length || 0,
        kismet_connected: false
      },
      error: (error as Error).message,
      warning: 'Error connecting to Kismet, returning demo data'
    };
    
    res.json(response);
  }
});


// Import WebSocket handlers and remaining server setup
import { setupWebSocketHandlers, setupSignalStreamNamespace, broadcastSignalDetection as broadcastSignal } from './server-websocket';
import { setupRemainingEndpoints, startServer } from './server-final';

// Setup WebSocket handlers
setupWebSocketHandlers(io, spectrum, logger);

// Setup signal streaming namespace
const signalNamespace = setupSignalStreamNamespace(io, logger);

// Create broadcast function with proper context
const broadcastSignalDetection = (signalData: any) => {
  broadcastSignal(signalData, signalNamespace, logger);
};

// Export for use in other modules
app.locals.broadcastSignalDetection = broadcastSignalDetection;

// Hook into HackRF spectrum analyzer for signal detections
spectrum.on('signalsDetected', async (data: any) => {
  if (\!data || \!data.signals) return;
  
  // Get current GPS position
  const gpsPosition = await getCurrentGPSPosition();
  
  data.signals.forEach((signal: any) => {
    broadcastSignalDetection({
      source: 'hackrf',
      lat: gpsPosition.lat,
      lon: gpsPosition.lon,
      signal_strength: signal.power || -100,
      frequency: signal.frequency,
      metadata: {
        bandwidth: signal.bandwidth,
        snr: signal.snr,
        modulation: signal.modulation
      }
    });
  });
});

// Setup remaining endpoints
setupRemainingEndpoints(app, io, spectrum, logger, signalNamespace);

// Start the server
startServer(server, io, spectrum, logger, PORT);

// Export for testing
export { app, server, io, spectrum };
