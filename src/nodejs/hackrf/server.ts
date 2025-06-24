/**
 * HackRF Node.js Server
 * Replaces Python Flask/SocketIO spectrum analyzer with Express/Socket.IO
 * Integrates with OpenWebRX for real-time FFT data streaming
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import WebSocket from 'ws';
import path from 'path';
import { logger } from './logger';
import { 
  HackRFConfig, 
  HackRFStatus, 
  HackRFFFTData,
  HackRFSignal,
  HackRFWebSocketMessage,
  HackRFFFTMessage,
  HackRFSignalMessage,
  HackRFStatusMessage,
  HackRFConfigMessage,
  HackRFErrorMessage
} from './types';
import { OpenWebRXConnector } from './openwebrx-connector';
import { SignalDetector } from './signal-detector';
import { FFTDataProcessor } from './fft-processor';
import { ScanProfileManager, SCAN_PROFILES } from './scan-profiles';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration
const PORT = process.env.HACKRF_PORT || 8092;
const OPENWEBRX_URL = process.env.OPENWEBRX_URL || 'ws://localhost:8073/ws/';

// Global state
let hackrfStatus: HackRFStatus = {
  connected: false,
  device_info: null,
  current_config: {
    device_index: 0,
    center_freq: 145000000,
    sample_rate: 2400000,
    gain: { lna: 32, vga: 35, amp: 0 },
    bandwidth: 2400000
  },
  uptime: 0
};

let openwebrxConnector: OpenWebRXConnector;
let signalDetector: SignalDetector;
let fftProcessor: FFTDataProcessor;
let scanProfileManager: ScanProfileManager;

// FFT buffer for recent data
const fftBuffer: HackRFFFTData[] = [];
const MAX_FFT_BUFFER_SIZE = 5;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// API Routes
app.get('/api/status', (req, res) => {
  const hasRealData = fftBuffer.length > 0 && openwebrxConnector?.isConnected();
  
  res.json({
    openwebrx_connected: openwebrxConnector?.isConnected() || false,
    real_data: hasRealData,
    fft_buffer_size: fftBuffer.length,
    config: openwebrxConnector?.getConfig() || {},
    last_fft_time: fftBuffer.length > 0 ? fftBuffer[fftBuffer.length - 1].timestamp : null,
    mode: hasRealData ? 'REAL DATA MODE' : 'DEMO MODE'
  });
});

app.get('/api/profiles', (req, res) => {
  res.json(SCAN_PROFILES);
});

app.get('/api/scan/:profileId', async (req, res) => {
  const { profileId } = req.params;
  
  if (!SCAN_PROFILES[profileId]) {
    return res.status(400).json({ error: 'Invalid profile' });
  }
  
  const profile = SCAN_PROFILES[profileId];
  const signals: any[] = [];
  
  if (fftBuffer.length > 0) {
    // Use real FFT data
    const latestFFT = fftBuffer[fftBuffer.length - 1];
    const detectedSignals = signalDetector.detectSignals(latestFFT, profile);
    
    for (const signal of detectedSignals) {
      signals.push({
        id: `real-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        frequency: `${(signal.frequency / 1e6).toFixed(3)}`,
        strength: `${signal.power.toFixed(1)}`,
        bandwidth: `${(signal.bandwidth / 1000).toFixed(1)}`,
        confidence: signal.confidence,
        type: 'real'
      });
    }
    
    logger.info(`Real signal scan: Found ${signals.length} signals from HackRF data`);
  } else {
    // Demo mode - generate fake signals
    logger.info('No real FFT data, using demo mode');
    signals.push(...scanProfileManager.generateDemoSignals(profile));
  }
  
  // Sort by strength
  signals.sort((a, b) => parseFloat(b.strength) - parseFloat(a.strength));
  
  res.json({
    profile,
    signals,
    scan_time: Date.now(),
    real_data: fftBuffer.length > 0
  });
});

app.post('/api/config', (req, res) => {
  const newConfig = req.body;
  
  // Validate and update configuration
  if (newConfig.center_freq) {
    hackrfStatus.current_config.center_freq = newConfig.center_freq;
  }
  if (newConfig.sample_rate) {
    hackrfStatus.current_config.sample_rate = newConfig.sample_rate;
  }
  if (newConfig.gain) {
    Object.assign(hackrfStatus.current_config.gain, newConfig.gain);
  }
  
  // Notify connected clients
  broadcastStatusUpdate();
  
  res.json({
    success: true,
    config: hackrfStatus.current_config
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  logger.info('Client connected to HackRF spectrum analyzer');
  
  socket.emit('status', {
    connected: true,
    openwebrx_status: openwebrxConnector?.isConnected() || false
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from HackRF spectrum analyzer');
  });
  
  socket.on('control', (message: HackRFWebSocketMessage) => {
    handleControlMessage(socket, message);
  });
});

function handleControlMessage(socket: any, message: HackRFWebSocketMessage) {
  if (message.type !== 'control') return;
  
  const { command, params } = message.data;
  
  switch (command) {
    case 'start':
      openwebrxConnector.connect();
      socket.emit('status', { message: 'Starting HackRF stream' });
      break;
      
    case 'stop':
      openwebrxConnector.disconnect();
      socket.emit('status', { message: 'Stopping HackRF stream' });
      break;
      
    case 'update_config':
      if (params) {
        Object.assign(hackrfStatus.current_config, params);
        broadcastStatusUpdate();
      }
      break;
      
    default:
      socket.emit('error', { message: `Unknown command: ${command}` });
  }
}

function broadcastFFTData(fftData: HackRFFFTData) {
  const message: HackRFFFTMessage = {
    type: 'fft',
    timestamp: Date.now(),
    data: fftData
  };
  
  io.emit('fft_data', message.data);
}

function broadcastStatusUpdate() {
  const message: HackRFStatusMessage = {
    type: 'status',
    timestamp: Date.now(),
    data: hackrfStatus
  };
  
  io.emit('status', message.data);
}

function broadcastError(error: string) {
  const message: HackRFErrorMessage = {
    type: 'error',
    timestamp: Date.now(),
    data: {
      code: 'HACKRF_ERROR',
      message: error
    }
  };
  
  io.emit('error', message.data);
}

// Initialize components
async function initialize() {
  logger.info('Initializing HackRF Node.js server...');
  
  // Initialize processors
  fftProcessor = new FFTDataProcessor();
  signalDetector = new SignalDetector();
  scanProfileManager = new ScanProfileManager();
  
  // Initialize OpenWebRX connector
  openwebrxConnector = new OpenWebRXConnector(OPENWEBRX_URL, {
    onConnect: () => {
      hackrfStatus.connected = true;
      broadcastStatusUpdate();
      logger.info('Connected to OpenWebRX');
    },
    
    onDisconnect: () => {
      hackrfStatus.connected = false;
      broadcastStatusUpdate();
      logger.info('Disconnected from OpenWebRX');
    },
    
    onFFTData: (fftData: HackRFFFTData) => {
      // Add to buffer
      fftBuffer.push(fftData);
      if (fftBuffer.length > MAX_FFT_BUFFER_SIZE) {
        fftBuffer.shift();
      }
      
      // Process and broadcast
      const processedData = fftProcessor.process(fftData);
      broadcastFFTData(processedData);
      
      logger.debug(`FFT data processed: ${fftData.fft_size} bins @ ${fftData.center_freq / 1e6} MHz`);
    },
    
    onConfig: (config: any) => {
      hackrfStatus.current_config.center_freq = config.center_freq || hackrfStatus.current_config.center_freq;
      hackrfStatus.current_config.sample_rate = config.samp_rate || hackrfStatus.current_config.sample_rate;
      hackrfStatus.current_config.fft_size = config.fft_size;
      broadcastStatusUpdate();
    },
    
    onError: (error: string) => {
      logger.error(`OpenWebRX error: ${error}`);
      broadcastError(error);
    }
  });
  
  // Start connection to OpenWebRX
  await openwebrxConnector.connect();
}

// Serve HTML template
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/spectrum.html'));
});

// Start server
server.listen(PORT, () => {
  logger.info(`HackRF server running on http://localhost:${PORT}`);
  initialize().catch(err => {
    logger.error('Failed to initialize HackRF server:', err);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down HackRF server...');
  openwebrxConnector?.disconnect();
  server.close(() => {
    process.exit(0);
  });
});

export { app, server };