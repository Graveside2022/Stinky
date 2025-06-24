// Final part of server implementation with remaining endpoints and startup logic
import { Application } from 'express';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Namespace } from 'socket.io';
import { ChildProcess } from 'child_process';
import winston from 'winston';

// Process tracking for script execution
let activeProcess: ChildProcess | null = null;
let isExecuting = false;

// Kismet data polling interval (for automatic updates)
let kismetPollingInterval: NodeJS.Timeout | null = null;
const KISMET_POLL_INTERVAL = parseInt(process.env.KISMET_POLL_INTERVAL || '5000'); // 5 seconds default

export function setupRemainingEndpoints(
  app: Application,
  io: SocketIOServer,
  spectrum: any,
  logger: winston.Logger,
  signalNamespace: Namespace
) {
  const fs = require('fs');
  const path = require('path');
  const { spawn } = require('child_process');
  const { promises: fsPromises } = require('fs');
  const { getSignalHistory } = require('./server-websocket');

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

    const scriptPaths: { [key: string]: string } = {
      'gps_kismet_wigle.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh',
      'start_kismet.sh': '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh',
      'smart_restart.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/smart_restart.sh',
      'stop_and_restart_services.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/stop_and_restart_services.sh'
    };

    const scriptPath = scriptPaths[scriptName];

    try {
      await fsPromises.access(scriptPath, fs.constants.F_OK | fs.constants.X_OK);
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
      
      let processId: number | undefined;
      
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

        activeProcess.stdout?.on('data', (data) => {
          console.log(`[${scriptName}] stdout: ${data.toString()}`);
        });

        activeProcess.stderr?.on('data', (data) => {
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
        message: (error as Error).message,
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
        message: (error as Error).message
      });
    }
  });

  // Debug endpoint to test IP detection
  app.get('/api/debug/ip', (req, res) => {
    const ipInfo = {
      // Express IP detection (with trust proxy enabled)
      'req.ip': req.ip,
      'req.ips': req.ips,
      
      // Direct socket information
      'req.socket.remoteAddress': req.socket ? req.socket.remoteAddress : null,
      'req.connection.remoteAddress': req.connection ? req.connection.remoteAddress : null,
      
      // Headers that might contain IP information
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-client-ip': req.headers['x-client-ip'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      
      // All headers for debugging
      'headers': req.headers,
      
      // Trust proxy setting
      'app.trust_proxy': req.app.get('trust proxy'),
      
      // Final recommendation
      'recommended_ip': req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ipInfo
    });
  });

  // API endpoint to get signal history
  app.get('/api/signals', (req, res) => {
    try {
      const filters: any = {};
      
      // Parse query parameters
      if (req.query.source) {
        filters.source = req.query.source;
      }
      if (req.query.minStrength) {
        filters.minStrength = parseFloat(req.query.minStrength as string);
      }
      if (req.query.maxAge) {
        filters.maxAge = parseInt(req.query.maxAge as string);
      }
      if (req.query.bounds) {
        try {
          filters.bounds = JSON.parse(req.query.bounds as string);
        } catch (e) {
          logger.error('Invalid bounds parameter', { error: (e as Error).message });
        }
      }
      
      const signals = getSignalHistory(filters);
      
      res.json({
        success: true,
        count: signals.length,
        filters,
        signals
      });
    } catch (error) {
      logger.error('Error fetching signals', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  });

  // Error handling middleware (must be last)
  app.use((err: any, req: any, res: any, next: any) => {
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
}

// Function to broadcast Kismet data to all connected clients
async function broadcastKismetData(io: SocketIOServer, logger: winston.Logger): Promise<void> {
  try {
    const { checkKismetConnection, fetchKismetData, transformKismetData, extractSignalsFromKismetData } = await import('./server-continuation');
    
    const kismetConfig = {
      baseUrl: process.env.KISMET_URL || 'http://localhost:2501',
      apiKey: process.env.KISMET_API_KEY || '',
      timeout: parseInt(process.env.KISMET_TIMEOUT || '5000')
    };

    const hasKismetConnection = await checkKismetConnection(kismetConfig);
    
    if (hasKismetConnection) {
      const kismetData = await fetchKismetData(kismetConfig);
      const transformedData = transformKismetData(kismetData);
      
      // Extract and broadcast signals from Kismet data
      extractSignalsFromKismetData(transformedData, (signalData: any) => {
        // This would need access to the broadcastSignalDetection function
        // For now, just emit the transformed data
      });
      
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
    logger.error('Error broadcasting Kismet data', { error: (error as Error).message });
  }
}

// Start Kismet data polling if enabled
export function startKismetPolling(io: SocketIOServer, logger: winston.Logger): void {
  if (process.env.KISMET_AUTO_POLLING === 'true' && !kismetPollingInterval) {
    logger.info('Starting Kismet data polling', { interval: KISMET_POLL_INTERVAL });
    kismetPollingInterval = setInterval(() => broadcastKismetData(io, logger), KISMET_POLL_INTERVAL);
    
    // Broadcast initial data
    broadcastKismetData(io, logger);
  }
}

// Stop Kismet data polling
export function stopKismetPolling(logger: winston.Logger): void {
  if (kismetPollingInterval) {
    clearInterval(kismetPollingInterval);
    kismetPollingInterval = null;
    logger.info('Stopped Kismet data polling');
  }
}

// Server startup and shutdown handling
export function startServer(
  server: HTTPServer,
  io: SocketIOServer,
  spectrum: any,
  logger: winston.Logger,
  PORT: string | number
): void {
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    stopKismetPolling(logger);
    spectrum.disconnect();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    stopKismetPolling(logger);
    spectrum.disconnect();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
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
      spectrum.connectToOpenWebRX(autoConnectUrl).catch((error: Error) => {
        logger.warn('Auto-connect to OpenWebRX failed', { error: error.message });
      });
    }
    
    // Start Kismet polling if enabled
    startKismetPolling(io, logger);
  });
}