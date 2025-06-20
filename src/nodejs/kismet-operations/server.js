const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const Joi = require('joi');
const SpectrumAnalyzer = require('./lib/spectrumCore');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebhookService = require('./lib/webhook');
const simpleWebhookRoutes = require('./lib/webhook/simpleRoutes');
const { corsOptions, handlePreflight, dynamicCors, logger: corsLogger } = require('./lib/corsConfig');

const PORT = process.env.PORT || 8002;

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

const app = express();
const server = http.createServer(app);
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
  constructor() {
    this.scriptPaths = {
      gps_kismet_wigle: '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh',  // Use project-local path
      kismet: '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh'  // Use project-local path
    };
    this.pidFiles = {
      gps_kismet_wigle: '/home/pi/tmp/gps_kismet_wigle.pids',
      kismet: '/tmp/kismet_script.pid'
    };
    this.processes = new Map();
  }

  async startScript(scriptName) {
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
              this.processes.set(scriptName, child.pid);
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
          this.processes.set(scriptName, child.pid);
          resolve({ pid: child.pid, script: scriptName });
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to start ${scriptName}: ${error.message}`));
        });

        child.unref();
      }
    });
  }

  async stopScript(scriptName) {
    try {
      // Try to stop using the specific script's stop mechanism
      if (scriptName === 'gps_kismet_wigle') {
        return await this.stopGpsKismetWigle();
      } else {
        return await this.stopGenericScript(scriptName);
      }
    } catch (error) {
      throw new Error(`Failed to stop ${scriptName}: ${error.message}`);
    }
  }

  async stopGpsKismetWigle() {
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Stop using pkill commands for comprehensive cleanup
    const stopCommands = [
      'pkill -f "gps_kismet_wigle"',
      'pkill -f "kismet"',
      'pkill -f "WigleToTak2"',
      'pkill -f "mavgps"'
    ];

    const errors = [];
    const results = [];

    // Execute all commands with timeout and proper error handling
    for (const cmd of stopCommands) {
      try {
        // Add timeout option to prevent hanging
        const result = await execAsync(cmd, { timeout: 5000 }); // 5 second timeout per command
        results.push({ cmd, success: true, stdout: result.stdout });
      } catch (error) {
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
      } catch (error) {
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
    } catch (error) {
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
      } catch (statusError) {
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

  async stopGenericScript(scriptName) {
    const pid = this.processes.get(scriptName);
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
        this.processes.delete(scriptName);
        return { script: scriptName, pid, stopped: true };
      } catch (error) {
        throw new Error(`Failed to kill process ${pid}: ${error.message}`);
      }
    } else {
      throw new Error(`No running process found for ${scriptName}`);
    }
  }

  async isScriptRunning(scriptName) {
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

  async getStatus() {
    // Check if the orchestration script is running
    const orchestrationRunning = await this.isScriptRunning('gps_kismet_wigle');
    
    // Check for actual services
    const checkService = async (processName) => {
      return new Promise((resolve) => {
        exec(`pgrep -f "${processName}" | head -1`, (error, stdout) => {
          resolve(!error && stdout.trim().length > 0);
        });
      });
    };
    
    // Enhanced service readiness check for Kismet
    const checkKismetReady = async () => {
      try {
        // First check if process exists
        const processExists = await checkService('kismet_server');
        if (!processExists) return false;
        
        // Then check if Kismet API is responding
        const axios = require('axios');
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
    const checkWigleReady = async () => {
      try {
        // Check if the Python process exists
        const processExists = await checkService('WigleToTak2.py');
        if (!processExists) return false;
        
        // Also check if port 6969 is listening (TAK port)
        const { promisify } = require('util');
        const execAsync = promisify(exec);
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

// Initialize webhook service (commented out for now, using simple routes)
// const webhookService = new WebhookService(app, io, {
//   kismetUrl: process.env.KISMET_URL || 'http://localhost:2501',
//   pidDir: '/tmp/kismet-operations',
//   cacheTimeout: 10000
// });

// Disable most helmet security features for development
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP entirely for now
  hsts: false, // Disable HSTS
  crossOriginOpenerPolicy: false, // Disable COOP
  crossOriginResourcePolicy: false, // Disable CORP
  originAgentCluster: false // Disable Origin-Agent-Cluster
}));
app.use(handlePreflight);
app.use(cors(corsOptions));
app.use(dynamicCors);
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

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
    res.status(502).json({
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
    res.status(502).json({
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
    res.status(502).send(`
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
app.get('/', (req, res) => {
  // Force no-cache for the main page
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'views', 'hi.html'));
});

// Add specific route for hi.html
app.get('/hi.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'hi.html'));
});

// Add /hi route (without .html extension)
app.get('/hi', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'hi.html'));
});

// Test page route
app.get('/test-buttons', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'test-buttons.html'));
});

// Add routes for other HTML pages
app.get('/wigle.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'wigle.html'));
});

app.get('/atak.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'atak.html'));
});

app.get('/kismet2.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'kismet2.html'));
});

// Add iframe test page
app.get('/iframe-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'iframe-test.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
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

// Info endpoint for system status (frontend compatibility)
app.get('/info', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  // Get primary IP address
  let ipAddress = 'localhost';
  for (const iface in networkInterfaces) {
    for (const alias of networkInterfaces[iface]) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ipAddress = alias.address;
        break;
      }
    }
    if (ipAddress !== 'localhost') break;
  }
  
  res.json({
    ip: ipAddress,
    gps: {
      status: 'Connected', // TODO: Get real GPS status
      lat: '37.7749',      // TODO: Get real GPS coordinates
      lon: '-122.4194',
      alt: '15.0m',
      time: new Date().toISOString()
    }
  });
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
app.get('/kismet-data', async (req, res) => {
  try {
    // Get data from Kismet
    const kismetData = await kismetClient.getData({
      type: 'all',
      limit: 50,
      since: new Date(Date.now() - 300000) // Last 5 minutes
    });

    // Format recent devices
    const recentDevices = (kismetData.devices || []).slice(0, 10).map(device => ({
      mac: device.mac,
      manufacturer: device.manufacturer,
      type: device.type,
      lastSeen: device.lastSeen,
      signal: device.signal.last || 'N/A'
    }));

    // Create feed items from recent activity
    const feedItems = [];
    
    // Add system status
    feedItems.push({
      type: 'System',
      message: 'Kismet operations center online',
      timestamp: new Date().toISOString()
    });

    // Add recent device discoveries
    (kismetData.devices || []).slice(0, 5).forEach(device => {
      feedItems.push({
        type: 'Device',
        message: `Detected ${device.type}: ${device.mac} (${device.manufacturer})`,
        timestamp: device.lastSeen
      });
    });

    // Add recent network discoveries
    (kismetData.networks || []).slice(0, 5).forEach(network => {
      feedItems.push({
        type: 'Network',
        message: `Found network: ${network.ssid} on channel ${network.channel}`,
        timestamp: network.lastSeen
      });
    });

    res.json({
      devices_count: kismetData.summary?.totalDevices || 0,
      networks_count: kismetData.summary?.totalNetworks || 0,
      recent_devices: recentDevices,
      feed_items: feedItems.sort((a, b) => 
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      ).slice(0, 10)
    });

  } catch (error) {
    logger.error('Failed to fetch Kismet data', { error: error.message });
    
    // Return empty data on error
    res.json({
      devices_count: 0,
      networks_count: 0,
      recent_devices: [],
      feed_items: [
        {
          type: 'Error',
          message: `Failed to connect to Kismet: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      ]
    });
  }
});

// Root-level webhook endpoints for frontend compatibility

/**
 * POST /run-script - Start Kismet services (frontend compatibility)
 */
app.post('/run-script', async (req, res) => {
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
    logger.error('Failed to run script', { error: error.message });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to run script',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /stop-script - Stop Kismet services (frontend compatibility)
 */
app.post('/stop-script', async (req, res) => {
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
    logger.error('Failed to stop Kismet services', { error: error.message });
    
    // Clear the timeout
    clearTimeout(responseTimeout);
    
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to stop Kismet services',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * GET /script-status - Get service status (frontend compatibility)
 */
app.get('/script-status', async (req, res) => {
  try {
    // Get status from script manager
    const status = await scriptManager.getStatus();
    
    // Transform to format expected by frontend
    const response = {
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
    logger.error('Failed to get script status', { error: error.message });
    
    // Return safe default status
    res.json({
      kismet_running: false,
      wigle_running: false,
      gps_running: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Endpoints

/**
 * Get current configuration
 */
app.get('/api/config', (req, res) => {
  res.json(spectrum.config);
});

/**
 * Update configuration
 */
app.post('/api/config', (req, res) => {
  try {
    // Validate configuration with Joi schema
    const { error, value: validatedConfig } = configSchema.validate(req.body, {
      allowUnknown: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    spectrum.updateConfig(validatedConfig);
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: spectrum.config 
    });
  } catch (error) {
    logger.error('Error updating configuration', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update configuration',
      error: error.message 
    });
  }
});

/**
 * Get current status
 */
app.get('/api/status', (req, res) => {
  try {
    const status = spectrum.getStatus();
    const extendedStatus = {
      ...status,
      server_uptime: process.uptime(),
      connected_clients: io.engine.clientsCount,
      mode: status.buffer_size > 0 ? 'REAL DATA MODE' : 'DEMO MODE',
      openwebrx_connected: status.connected,
      real_data: status.buffer_size > 0,
      fft_buffer_size: status.buffer_size,
      last_fft_time: status.last_update
    };
    
    res.json(extendedStatus);
  } catch (error) {
    logger.error('Error getting status', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get status',
      error: error.message 
    });
  }
});

/**
 * Connect to OpenWebRX WebSocket
 */
app.post('/api/connect', async (req, res) => {
  try {
    const { url } = req.body;
    const wsUrl = url || 'ws://localhost:8073/ws/';
    
    await spectrum.connectToOpenWebRX(wsUrl);
    
    res.json({ 
      success: true, 
      message: 'Connection initiated to OpenWebRX',
      url: wsUrl
    });
  } catch (error) {
    logger.error('Error connecting to OpenWebRX', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to connect to OpenWebRX', 
      error: error.message 
    });
  }
});

/**
 * Disconnect from OpenWebRX
 */
app.post('/api/disconnect', (req, res) => {
  try {
    spectrum.disconnect();
    res.json({ 
      success: true, 
      message: 'Disconnected from OpenWebRX' 
    });
  } catch (error) {
    logger.error('Error disconnecting from OpenWebRX', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to disconnect from OpenWebRX',
      error: error.message 
    });
  }
});

/**
 * Get detected signals
 */
app.get('/api/signals', (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || null;
    const signals = spectrum.detectSignals(threshold);
    
    // Include additional metadata
    const response = {
      signals,
      threshold: threshold || spectrum.config.signal_threshold,
      timestamp: Date.now(),
      fft_buffer_size: spectrum.fft_buffer.length,
      real_data: spectrum.fft_buffer.length > 0,
      signal_count: signals.length
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error detecting signals', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to detect signals',
      error: error.message 
    });
  }
});

/**
 * Get signal detection statistics
 */
app.get('/api/signals/stats', (req, res) => {
  try {
    const stats = spectrum.getSignalStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting signal stats', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get signal statistics',
      error: error.message 
    });
  }
});

/**
 * Get latest FFT data
 */
app.get('/api/fft/latest', (req, res) => {
  try {
    const latestFFT = spectrum.getLatestFFT();
    
    if (!latestFFT) {
      return res.json({
        success: false,
        message: 'No FFT data available',
        data: null
      });
    }
    
    res.json({
      success: true,
      data: latestFFT,
      buffer_size: spectrum.fft_buffer.length
    });
  } catch (error) {
    logger.error('Error getting latest FFT data', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get FFT data',
      error: error.message 
    });
  }
});

/**
 * Clear FFT buffer
 */
app.post('/api/fft/clear', (req, res) => {
  try {
    spectrum.clearBuffer();
    res.json({ 
      success: true, 
      message: 'FFT buffer cleared successfully' 
    });
  } catch (error) {
    logger.error('Error clearing FFT buffer', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear FFT buffer',
      error: error.message 
    });
  }
});

// Legacy API endpoints for backward compatibility

/**
 * Get scan profiles (legacy endpoint)
 */
app.get('/api/profiles', (req, res) => {
  const profiles = {
    'vhf': {
      'name': 'VHF Amateur (144-148 MHz)',
      'ranges': [[144.0, 148.0]],
      'step': 25,
      'description': 'VHF Amateur Radio Band'
    },
    'uhf': {
      'name': 'UHF Amateur (420-450 MHz)', 
      'ranges': [[420.0, 450.0]],
      'step': 25,
      'description': 'UHF Amateur Radio Band'
    },
    'ism': {
      'name': 'ISM Band (2.4 GHz)',
      'ranges': [[2400.0, 2485.0]],
      'step': 1000,
      'description': 'Industrial, Scientific, Medical Band'
    }
  };
  
  res.json(profiles);
});

/**
 * Scan specific profile (legacy endpoint)
 */
app.get('/api/scan/:profileId', (req, res) => {
  const { profileId } = req.params;
  const profiles = {
    'vhf': { 'name': 'VHF Amateur (144-148 MHz)', 'ranges': [[144.0, 148.0]], 'step': 25 },
    'uhf': { 'name': 'UHF Amateur (420-450 MHz)', 'ranges': [[420.0, 450.0]], 'step': 25 },
    'ism': { 'name': 'ISM Band (2.4 GHz)', 'ranges': [[2400.0, 2485.0]], 'step': 1000 }
  };
  
  if (!profiles[profileId]) {
    return res.status(400).json({ error: `Invalid profile: ${profileId}` });
  }
  
  const profile = profiles[profileId];
  let signals = [];
  
  try {
    if (spectrum.fft_buffer.length > 0) {
      // Use real FFT data if available
      signals = spectrum.detectSignals();
      // Filter signals by profile frequency ranges
      signals = signals.filter(signal => {
        const freqMHz = signal.frequency / 1000000;
        return profile.ranges.some(range => 
          freqMHz >= range[0] && freqMHz <= range[1]
        );
      });
    } else {
      // Generate demo signals for backward compatibility
      signals = generateDemoSignals(profile);
    }
    
    // Sort by strength (power)
    signals.sort((a, b) => parseFloat(b.power || b.strength) - parseFloat(a.power || a.strength));
    
    res.json({
      profile,
      signals,
      scan_time: Date.now(),
      real_data: spectrum.fft_buffer.length > 0
    });
  } catch (error) {
    logger.error('Error scanning profile', { error: error.message, profileId });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to scan profile',
      error: error.message 
    });
  }
});

/**
 * Kismet data endpoint - provides integration with Kismet WiFi scanning data
 * This endpoint serves as a bridge between Kismet and the frontend on port 8092
 */
app.get('/api/kismet-data', async (req, res) => {
  try {
    // Configuration for Kismet integration
    const kismetConfig = {
      baseUrl: process.env.KISMET_URL || 'http://localhost:2501',
      apiKey: process.env.KISMET_API_KEY || '',
      timeout: parseInt(process.env.KISMET_TIMEOUT) || 5000
    };

    // Check if we have real Kismet data available
    const hasKismetConnection = await checkKismetConnection(kismetConfig);
    
    if (hasKismetConnection) {
      // Fetch real data from Kismet
      const kismetData = await fetchKismetData(kismetConfig);
      
      // Transform Kismet data to the expected format
      const transformedData = transformKismetData(kismetData);
      
      res.json({
        success: true,
        source: 'kismet',
        timestamp: Date.now(),
        data: transformedData,
        stats: {
          total_devices: transformedData.devices?.length || 0,
          total_networks: transformedData.networks?.length || 0,
          kismet_connected: true
        }
      });
    } else {
      // Return demo data if Kismet is not available
      const demoData = generateDemoKismetData();
      
      res.json({
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
      });
    }
  } catch (error) {
    logger.error('Error fetching Kismet data', { error: error.message });
    
    // Return demo data on error
    const demoData = generateDemoKismetData();
    
    res.json({
      success: false,
      source: 'demo',
      timestamp: Date.now(),
      data: demoData,
      stats: {
        total_devices: demoData.devices?.length || 0,
        total_networks: demoData.networks?.length || 0,
        kismet_connected: false
      },
      error: error.message,
      warning: 'Error connecting to Kismet, returning demo data'
    });
  }
});

/**
 * Check if Kismet is available and responding
 */
async function checkKismetConnection(config) {
  try {
    const axios = require('axios');
    const response = await axios.get(`${config.baseUrl}/system/status`, {
      timeout: config.timeout,
      headers: {
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
      }
    });
    
    return response.status === 200;
  } catch (error) {
    logger.debug('Kismet connection check failed', { error: error.message });
    return false;
  }
}

/**
 * Fetch data from Kismet API
 */
async function fetchKismetData(config) {
  const axios = require('axios');
  
  try {
    // Fetch both devices and networks from Kismet
    const [devicesResponse, networksResponse] = await Promise.all([
      axios.get(`${config.baseUrl}/devices/all_devices`, {
        timeout: config.timeout,
        headers: {
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
        }
      }),
      axios.get(`${config.baseUrl}/devices/all_ssids`, {
        timeout: config.timeout,
        headers: {
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
        }
      })
    ]);
    
    return {
      devices: devicesResponse.data || [],
      networks: networksResponse.data || []
    };
  } catch (error) {
    logger.error('Failed to fetch Kismet data', { error: error.message });
    throw error;
  }
}

/**
 * Transform Kismet data to frontend-expected format
 */
function transformKismetData(kismetData) {
  const transformedDevices = (kismetData.devices || []).map(device => ({
    mac: device['kismet.device.base.macaddr'] || 'unknown',
    last_seen: device['kismet.device.base.last_time'] || Date.now() / 1000,
    signal: device['kismet.device.base.signal'] || {
      'kismet.common.signal.last_signal': -80,
      'kismet.common.signal.max_signal': -70,
      'kismet.common.signal.min_signal': -90
    },
    manufacturer: device['kismet.device.base.manuf'] || 'Unknown',
    type: device['kismet.device.base.type'] || 'Unknown',
    channel: device['kismet.device.base.channel'] || 0,
    frequency: device['kismet.device.base.frequency'] || 0,
    packets: device['kismet.device.base.packets.total'] || 0,
    datasize: device['kismet.device.base.datasize'] || 0,
    location: device['kismet.device.base.location'] || null
  }));
  
  const transformedNetworks = (kismetData.networks || []).map(network => ({
    ssid: network['kismet.device.base.name'] || 'Hidden',
    bssid: network['kismet.device.base.macaddr'] || 'unknown',
    channel: network['kismet.device.base.channel'] || 0,
    frequency: network['kismet.device.base.frequency'] || 0,
    encryption: network['kismet.device.base.crypt'] || 'Unknown',
    last_seen: network['kismet.device.base.last_time'] || Date.now() / 1000,
    signal: network['kismet.device.base.signal'] || {
      'kismet.common.signal.last_signal': -80
    },
    clients: network['kismet.device.base.num_clients'] || 0
  }));
  
  return {
    devices: transformedDevices,
    networks: transformedNetworks,
    timestamp: Date.now()
  };
}

/**
 * Generate demo Kismet data for testing/development
 */
function generateDemoKismetData() {
  const demoDevices = [];
  const demoNetworks = [];
  
  // Generate demo devices
  for (let i = 0; i < 10; i++) {
    demoDevices.push({
      mac: `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0').toUpperCase()}`,
      last_seen: Date.now() / 1000 - Math.random() * 3600,
      signal: {
        'kismet.common.signal.last_signal': -60 - Math.random() * 30,
        'kismet.common.signal.max_signal': -50 - Math.random() * 20,
        'kismet.common.signal.min_signal': -80 - Math.random() * 10
      },
      manufacturer: ['Apple', 'Samsung', 'Intel', 'Broadcom', 'Realtek'][Math.floor(Math.random() * 5)],
      type: ['WiFi Client', 'WiFi AP', 'Bluetooth', 'Unknown'][Math.floor(Math.random() * 4)],
      channel: Math.floor(Math.random() * 14) + 1,
      frequency: 2412 + (Math.floor(Math.random() * 14) * 5),
      packets: Math.floor(Math.random() * 10000),
      datasize: Math.floor(Math.random() * 1000000),
      location: Math.random() > 0.5 ? {
        lat: 37.7749 + (Math.random() - 0.5) * 0.01,
        lon: -122.4194 + (Math.random() - 0.5) * 0.01
      } : null
    });
  }
  
  // Generate demo networks
  const ssidNames = ['Home-WiFi', 'Guest-Network', 'Office-5G', 'Coffee-Shop', 'Mobile-Hotspot', 
                     'IoT-Network', 'Security-Cam', 'Printer-Direct', 'Hidden-Network', 'Test-AP'];
  
  for (let i = 0; i < 8; i++) {
    demoNetworks.push({
      ssid: ssidNames[i] || `Network-${i}`,
      bssid: `11:22:33:44:55:${i.toString(16).padStart(2, '0').toUpperCase()}`,
      channel: Math.floor(Math.random() * 14) + 1,
      frequency: 2412 + (Math.floor(Math.random() * 14) * 5),
      encryption: ['Open', 'WEP', 'WPA', 'WPA2', 'WPA3'][Math.floor(Math.random() * 5)],
      last_seen: Date.now() / 1000 - Math.random() * 1800,
      signal: {
        'kismet.common.signal.last_signal': -50 - Math.random() * 40
      },
      clients: Math.floor(Math.random() * 20)
    });
  }
  
  return {
    devices: demoDevices,
    networks: demoNetworks,
    timestamp: Date.now()
  };
}

// Demo signal generation for backward compatibility
function generateDemoSignals(profile) {
  const signals = [];
  
  for (const range of profile.ranges) {
    const [start, end] = range;
    for (let freq = start; freq < end; freq += profile.step / 1000) {
      if (Math.random() < 0.3) { // 30% chance
        signals.push({
          id: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          frequency: (freq * 1000000), // Convert to Hz
          strength: (Math.random() * 40 - 80).toFixed(1), // -80 to -40 dBm
          power: (Math.random() * 40 - 80), // Same as strength for compatibility
          bandwidth: (Math.random() * 20 + 5).toFixed(1), // 5-25 kHz
          confidence: Math.random() * 0.6 + 0.3, // 0.3-0.9
          type: 'demo'
        });
      }
    }
  }
  
  return signals;
}

// WebSocket event handlers - Connect Socket.IO to SpectrumAnalyzer events

// Handle client connections
io.on('connection', (socket) => {
  logger.info('Client connected to spectrum analyzer', { 
    clientId: socket.id,
    clientsCount: io.engine.clientsCount 
  });
  
  // Send current status to new client
  socket.emit('status', spectrum.getStatus());
  
  // Set up event forwarding to this client
  const fftDataHandler = (data) => {
    socket.emit('fftData', data);
  };
  
  const signalsDetectedHandler = (data) => {
    socket.emit('signalsDetected', data);
  };
  
  const connectedHandler = (data) => {
    socket.emit('openwebrxConnected', data);
  };
  
  const disconnectedHandler = (data) => {
    socket.emit('openwebrxDisconnected', data);
  };
  
  const errorHandler = (error) => {
    socket.emit('openwebrxError', { error: error.message });
  };
  
  const configUpdatedHandler = (data) => {
    socket.emit('configUpdated', data);
  };
  
  const bufferClearedHandler = (data) => {
    socket.emit('bufferCleared', data);
  };
  
  // Register event listeners
  spectrum.on('fftData', fftDataHandler);
  spectrum.on('signalsDetected', signalsDetectedHandler);
  spectrum.on('connected', connectedHandler);
  spectrum.on('disconnected', disconnectedHandler);
  spectrum.on('error', errorHandler);
  spectrum.on('configUpdated', configUpdatedHandler);
  spectrum.on('bufferCleared', bufferClearedHandler);
  
  // Handle client-initiated events
  socket.on('requestStatus', () => {
    socket.emit('status', spectrum.getStatus());
  });
  
  socket.on('requestLatestFFT', () => {
    const latestFFT = spectrum.getLatestFFT();
    socket.emit('latestFFT', latestFFT);
  });
  
  socket.on('requestSignals', (data) => {
    const threshold = data && data.threshold ? parseFloat(data.threshold) : null;
    const signals = spectrum.detectSignals(threshold);
    socket.emit('signals', {
      signals,
      threshold: threshold || spectrum.config.signal_threshold,
      timestamp: Date.now()
    });
  });
  
  // Handle Kismet data requests via WebSocket
  socket.on('requestKismetData', async () => {
    try {
      const kismetConfig = {
        baseUrl: process.env.KISMET_URL || 'http://localhost:2501',
        apiKey: process.env.KISMET_API_KEY || '',
        timeout: parseInt(process.env.KISMET_TIMEOUT) || 5000
      };

      const hasKismetConnection = await checkKismetConnection(kismetConfig);
      
      if (hasKismetConnection) {
        const kismetData = await fetchKismetData(kismetConfig);
        const transformedData = transformKismetData(kismetData);
        
        socket.emit('kismetData', {
          success: true,
          source: 'kismet',
          timestamp: Date.now(),
          data: transformedData,
          stats: {
            total_devices: transformedData.devices?.length || 0,
            total_networks: transformedData.networks?.length || 0,
            kismet_connected: true
          }
        });
      } else {
        const demoData = generateDemoKismetData();
        
        socket.emit('kismetData', {
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
        });
      }
    } catch (error) {
      logger.error('Error handling Kismet data request via WebSocket', { error: error.message });
      const demoData = generateDemoKismetData();
      
      socket.emit('kismetData', {
        success: false,
        source: 'demo',
        timestamp: Date.now(),
        data: demoData,
        error: error.message,
        warning: 'Error connecting to Kismet, returning demo data'
      });
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    logger.info('Client disconnected from spectrum analyzer', { 
      clientId: socket.id,
      clientsCount: io.engine.clientsCount - 1 
    });
    
    // Remove event listeners for this client
    spectrum.removeListener('fftData', fftDataHandler);
    spectrum.removeListener('signalsDetected', signalsDetectedHandler);
    spectrum.removeListener('connected', connectedHandler);
    spectrum.removeListener('disconnected', disconnectedHandler);
    spectrum.removeListener('error', errorHandler);
    spectrum.removeListener('configUpdated', configUpdatedHandler);
    spectrum.removeListener('bufferCleared', bufferClearedHandler);
  });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  stopKismetPolling();
  spectrum.disconnect();
  
  // Shutdown webhook service (commented out for now)
  // if (webhookService) {
  //   try {
  //     await webhookService.shutdown();
  //   } catch (error) {
  //     logger.error('Error shutting down webhook service', { error: error.message });
  //   }
  // }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  stopKismetPolling();
  spectrum.disconnect();
  
  // Shutdown webhook service (commented out for now)
  // if (webhookService) {
  //   try {
  //     await webhookService.shutdown();
  //   } catch (error) {
  //     logger.error('Error shutting down webhook service', { error: error.message });
  //   }
  // }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Kismet data polling interval (for automatic updates)
let kismetPollingInterval = null;
const KISMET_POLL_INTERVAL = parseInt(process.env.KISMET_POLL_INTERVAL) || 5000; // 5 seconds default

// Function to broadcast Kismet data to all connected clients
async function broadcastKismetData() {
  try {
    const kismetConfig = {
      baseUrl: process.env.KISMET_URL || 'http://localhost:2501',
      apiKey: process.env.KISMET_API_KEY || '',
      timeout: parseInt(process.env.KISMET_TIMEOUT) || 5000
    };

    const hasKismetConnection = await checkKismetConnection(kismetConfig);
    
    if (hasKismetConnection) {
      const kismetData = await fetchKismetData(kismetConfig);
      const transformedData = transformKismetData(kismetData);
      
      io.emit('kismetDataUpdate', {
        success: true,
        source: 'kismet',
        timestamp: Date.now(),
        data: transformedData,
        stats: {
          total_devices: transformedData.devices?.length || 0,
          total_networks: transformedData.networks?.length || 0,
          kismet_connected: true
        }
      });
      
      logger.debug('Broadcasted Kismet data update', {
        devices: transformedData.devices?.length || 0,
        networks: transformedData.networks?.length || 0
      });
    }
  } catch (error) {
    logger.error('Error broadcasting Kismet data', { error: error.message });
  }
}

// Start Kismet data polling if enabled
function startKismetPolling() {
  if (process.env.KISMET_AUTO_POLLING === 'true' && !kismetPollingInterval) {
    logger.info('Starting Kismet data polling', { interval: KISMET_POLL_INTERVAL });
    kismetPollingInterval = setInterval(broadcastKismetData, KISMET_POLL_INTERVAL);
    
    // Broadcast initial data
    broadcastKismetData();
  }
}

// Stop Kismet data polling
function stopKismetPolling() {
  if (kismetPollingInterval) {
    clearInterval(kismetPollingInterval);
    kismetPollingInterval = null;
    logger.info('Stopped Kismet data polling');
  }
}

// Process tracking for script execution
let activeProcess = null;
let isExecuting = false;

// Script execution endpoint
app.post('/api/start-script', async (req, res) => {
    if (isExecuting) {
        return res.status(409).json({
            success: false,
            error: 'Script is already running',
            message: 'A script execution is already in progress'
        });
    }

    const { scriptName } = req.body;
    
    if (!scriptName) {
        return res.status(400).json({
            success: false,
            error: 'Missing script name',
            message: 'Script name is required in request body'
        });
    }

    const allowedScripts = [
        'gps_kismet_wigle.sh',
        'start_kismet.sh',
        'smart_restart.sh',
        'stop_and_restart_services.sh'
    ];

    if (!allowedScripts.includes(scriptName)) {
        return res.status(403).json({
            success: false,
            error: 'Script not allowed',
            message: 'The requested script is not in the allowed list'
        });
    }

    const scriptPaths = {
        'gps_kismet_wigle.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh',
        'start_kismet.sh': '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh',
        'smart_restart.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/smart_restart.sh',
        'stop_and_restart_services.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/stop_and_restart_services.sh'
    };

    const scriptPath = scriptPaths[scriptName];

    try {
        await fs.access(scriptPath, fs.constants.F_OK | fs.constants.X_OK);
    } catch (error) {
        console.error(`Script access check failed: ${scriptPath}`, error);
        return res.status(404).json({
            success: false,
            error: 'Script not found or not executable',
            message: `Unable to access script: ${scriptName}`
        });
    }

    isExecuting = true;

    try {
        console.log(`Starting script: ${scriptPath}`);
        
        // Check if this is a script that uses exec internally
        const usesExec = ['smart_restart.sh', 'stop_and_restart_services.sh'].includes(scriptName);
        
        let processId;
        
        if (usesExec) {
            // For scripts that use exec, detach completely
            activeProcess = spawn('bash', [scriptPath], {
                cwd: path.dirname(scriptPath),
                env: { ...process.env, PATH: process.env.PATH },
                detached: true,
                stdio: 'ignore'
            });
            
            processId = activeProcess.pid;
            activeProcess.unref();
            
            // Can't track exit for detached processes
            isExecuting = false;
            activeProcess = null;
        } else {
            // For normal scripts, keep stdout/stderr monitoring
            activeProcess = spawn('bash', [scriptPath], {
                cwd: path.dirname(scriptPath),
                env: { 
                    ...process.env, 
                    PATH: process.env.PATH,
                    DISPLAY: ':0',
                    XAUTHORITY: '/home/pi/.Xauthority',
                    TERM: 'xterm',
                    LOG_DIR: '/home/pi/projects/stinkster/logs',
                    KISMET_DATA_DIR: '/home/pi/projects/stinkster/data/kismet',
                    WIRELESS_INTERFACE: 'wlan2'
                },
                detached: false
            });

            processId = activeProcess.pid;

            activeProcess.stdout.on('data', (data) => {
                console.log(`[${scriptName}] stdout: ${data.toString()}`);
            });

            activeProcess.stderr.on('data', (data) => {
                console.error(`[${scriptName}] stderr: ${data.toString()}`);
            });

            activeProcess.on('exit', (code, signal) => {
                console.log(`[${scriptName}] Process exited with code ${code} and signal ${signal}`);
                isExecuting = false;
                activeProcess = null;
            });

            activeProcess.on('error', (error) => {
                console.error(`[${scriptName}] Process error:`, error);
                isExecuting = false;
                activeProcess = null;
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (usesExec || (activeProcess && !activeProcess.killed)) {
            res.status(200).json({
                success: true,
                message: `Script ${scriptName} started successfully`,
                processId: processId,
                scriptPath: scriptPath,
                startTime: new Date().toISOString(),
                detached: usesExec
            });
        } else {
            throw new Error('Process terminated immediately after start');
        }

    } catch (error) {
        console.error(`Failed to start script ${scriptName}:`, error);
        isExecuting = false;
        activeProcess = null;
        
        res.status(500).json({
            success: false,
            error: 'Script execution failed',
            message: error.message,
            scriptName: scriptName
        });
    }
});

// Check script status endpoint
app.get('/api/script-status', (req, res) => {
    res.status(200).json({
        success: true,
        isRunning: isExecuting,
        activeProcess: activeProcess ? {
            pid: activeProcess.pid,
            killed: activeProcess.killed
        } : null
    });
});

// Stop script endpoint
app.post('/api/stop-script', (req, res) => {
    if (!activeProcess || !isExecuting) {
        return res.status(404).json({
            success: false,
            error: 'No active script',
            message: 'No script is currently running'
        });
    }

    try {
        // Send SIGTERM to gracefully stop the process
        activeProcess.kill('SIGTERM');
        
        // Force kill after timeout if needed
        setTimeout(() => {
            if (activeProcess && !activeProcess.killed) {
                activeProcess.kill('SIGKILL');
            }
        }, 5000);

        res.status(200).json({
            success: true,
            message: 'Stop signal sent to script',
            processId: activeProcess.pid
        });
    } catch (error) {
        console.error('Failed to stop script:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop script',
            message: error.message
        });
    }
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method 
  });
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Spectrum Analyzer server running on port ${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
  
  // Optionally auto-connect to OpenWebRX if URL is provided via environment
  const autoConnectUrl = process.env.OPENWEBRX_WS_URL;
  if (autoConnectUrl) {
    logger.info('Auto-connecting to OpenWebRX', { url: autoConnectUrl });
    spectrum.connectToOpenWebRX(autoConnectUrl).catch(error => {
      logger.warn('Auto-connect to OpenWebRX failed', { error: error.message });
    });
  }
  
  // Start Kismet polling if enabled
  startKismetPolling();
});

module.exports = { app, server, io, spectrum };