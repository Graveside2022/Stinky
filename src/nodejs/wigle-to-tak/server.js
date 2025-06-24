const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const winston = require('winston');
const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const WigleToTAK = require('./lib/wigleToTakCore');

// Command line argument parsing
program
  .option('--directory <path>', 'Directory containing Wigle CSV files', './')
  .option('--port <number>', 'Port for TAK broadcasting', '6969')
  .option('--flask-port <number>', 'Port for web interface', '3002')
  .parse();

const options = program.opts();

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'wigle-to-tak.log' })
  ]
});

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Initialize WigleToTAK instance
const wigleToTak = new WigleToTAK({
  directory: options.directory,
  port: options.port
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Template engine setup
app.set('view engine', 'html');
app.set('views', './views');

// Routes (placeholder)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/WigleToTAK.html');
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json(wigleToTak.getStatus());
});

app.post('/update_tak_settings', (req, res) => {
  const { tak_server_ip: newIp, tak_server_port: newPort } = req.body;
  
  if (newIp || newPort) {
    wigleToTak.updateTakSettings(newIp, newPort);
    logger.info(`TAK settings updated - IP: ${newIp || 'unchanged'}, Port: ${newPort || 'unchanged'}`);
    res.json({ message: 'TAK settings updated successfully' });
  } else {
    res.status(400).json({ error: 'Missing TAK Server IP or Port in the request' });
  }
});

app.post('/update_multicast_state', (req, res) => {
  const { takMulticast } = req.body;
  
  if (takMulticast !== undefined) {
    wigleToTak.updateMulticastState(takMulticast);
    res.json({ message: `Multicast ${takMulticast ? 'enabled' : 'disabled'}` });
  } else {
    res.status(400).json({ error: 'Missing TAK Multicast state in the request' });
  }
});

app.post('/update_analysis_mode', (req, res) => {
  const { mode } = req.body;
  
  if (wigleToTak.updateAnalysisMode(mode)) {
    res.json({ message: `Analysis mode set to ${mode}` });
  } else {
    res.status(400).json({ error: 'Invalid analysis mode. Use "realtime" or "postcollection"' });
  }
});

app.post('/update_antenna_sensitivity', (req, res) => {
  const { antenna_sensitivity: newSensitivity, custom_factor } = req.body;
  
  if (wigleToTak.updateAntennaSensitivity(newSensitivity, custom_factor)) {
    res.json({ message: `Antenna sensitivity set to ${newSensitivity}` });
  } else {
    res.status(400).json({ error: 'Invalid antenna sensitivity type' });
  }
});

app.get('/get_antenna_settings', (req, res) => {
  res.json(wigleToTak.getAntennaSettings());
});

app.post('/add_to_whitelist', (req, res) => {
  const { ssid, mac } = req.body;
  
  if (wigleToTak.addToWhitelist(ssid, mac)) {
    const item = ssid ? `SSID "${ssid}"` : `MAC "${mac}"`;
    res.json({ message: `${item} added to whitelist` });
  } else {
    res.status(400).json({ error: 'Must provide either ssid or mac' });
  }
});

app.post('/remove_from_whitelist', (req, res) => {
  const { ssid, mac } = req.body;
  
  if (wigleToTak.removeFromWhitelist(ssid, mac)) {
    const item = ssid ? `SSID "${ssid}"` : `MAC "${mac}"`;
    res.json({ message: `${item} removed from whitelist` });
  } else {
    const item = ssid ? `SSID "${ssid}"` : `MAC "${mac}"`;
    res.status(404).json({ error: `${item} not found in whitelist` });
  }
});

app.post('/add_to_blacklist', (req, res) => {
  const { ssid, mac, argb_value } = req.body;
  const color = argb_value || '-65281'; // Default red color
  
  if (wigleToTak.addToBlacklist(ssid, mac, color)) {
    const item = ssid ? `SSID "${ssid}"` : `MAC "${mac}"`;
    res.json({ message: `${item} added to blacklist` });
  } else {
    res.status(400).json({ error: 'Must provide either ssid or mac' });
  }
});

app.post('/remove_from_blacklist', (req, res) => {
  const { ssid, mac } = req.body;
  
  if (wigleToTak.removeFromBlacklist(ssid, mac)) {
    const item = ssid ? `SSID "${ssid}"` : `MAC "${mac}"`;
    res.json({ message: `${item} removed from blacklist` });
  } else {
    const item = ssid ? `SSID "${ssid}"` : `MAC "${mac}"`;
    res.status(404).json({ error: `${item} not found in blacklist` });
  }
});

app.get('/list_wigle_files', async (req, res) => {
  const directory = req.query.directory || wigleToTak.directory;
  
  try {
    const files = await fs.readdir(directory);
    const wigleFiles = [];
    
    for (const file of files.filter(f => f.endsWith('.wiglecsv'))) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      wigleFiles.push({
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      });
    }
    
    // Sort by modification time, newest first
    wigleFiles.sort((a, b) => b.modified - a.modified);
    
    res.json({ files: wigleFiles.map(f => f.name) }); // Match Python version response format
  } catch (error) {
    logger.error('Error listing Wigle files:', error);
    res.status(500).json({ error: 'Error listing files in directory' });
  }
});

app.post('/start_broadcast', async (req, res) => {
  const { directory, filename } = req.body;
  
  try {
    if (directory && directory !== wigleToTak.directory) {
      wigleToTak.directory = directory;
    }
    
    const result = await wigleToTak.startBroadcasting(filename);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    logger.error('Error starting broadcast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/stop_broadcast', (req, res) => {
  const result = wigleToTak.stopBroadcasting();
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ message: result.message });
  }
});

// File upload endpoint
app.post('/upload_csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const uploadedFile = req.file;
    const targetPath = path.join(wigleToTak.directory, uploadedFile.originalname);
    
    // Move uploaded file to target directory
    await fs.move(uploadedFile.path, targetPath);
    
    logger.info(`File uploaded successfully: ${uploadedFile.originalname}`);
    res.json({ 
      message: `File uploaded successfully: ${uploadedFile.originalname}`,
      filename: uploadedFile.originalname,
      size: uploadedFile.size
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// Additional API endpoints for better compatibility
app.post('/api/start', async (req, res) => {
  const result = await wigleToTak.startBroadcasting();
  res.json(result);
});

app.post('/api/stop', (req, res) => {
  const result = wigleToTak.stopBroadcasting();
  res.json(result);
});

app.post('/api/config', (req, res) => {
  const { analysisMode, antennaSensitivity, takServerIp, takServerPort, customFactor } = req.body;
  
  let updated = false;
  const updates = [];
  
  if (analysisMode && wigleToTak.updateAnalysisMode(analysisMode)) {
    updates.push(`Analysis mode: ${analysisMode}`);
    updated = true;
  }
  
  if (antennaSensitivity && wigleToTak.updateAntennaSensitivity(antennaSensitivity, customFactor)) {
    updates.push(`Antenna sensitivity: ${antennaSensitivity}`);
    updated = true;
  }
  
  if (takServerIp || takServerPort) {
    wigleToTak.updateTakSettings(takServerIp, takServerPort);
    updates.push(`TAK server: ${takServerIp || 'unchanged'}:${takServerPort || 'unchanged'}`);
    updated = true;
  }
  
  if (updated) {
    res.json({ success: true, message: `Configuration updated: ${updates.join(', ')}` });
  } else {
    res.status(400).json({ success: false, message: 'No valid configuration provided' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WigleToTAK',
    version: '1.0.0'
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected to WigleToTAK WebSocket', { 
    clientId: socket.id,
    clientsCount: io.engine.clientsCount 
  });
  
  // Send current status to new client
  socket.emit('status', wigleToTak.getStatus());
  
  // Handle status requests
  socket.on('requestStatus', () => {
    socket.emit('status', wigleToTak.getStatus());
  });
  
  // Handle configuration updates via WebSocket
  socket.on('updateConfig', (config) => {
    let updated = false;
    const updates = [];
    
    if (config.analysisMode && wigleToTak.updateAnalysisMode(config.analysisMode)) {
      updates.push(`Analysis mode: ${config.analysisMode}`);
      updated = true;
    }
    
    if (config.antennaSensitivity && wigleToTak.updateAntennaSensitivity(config.antennaSensitivity, config.customFactor)) {
      updates.push(`Antenna sensitivity: ${config.antennaSensitivity}`);
      updated = true;
    }
    
    if (config.takServerIp || config.takServerPort) {
      wigleToTak.updateTakSettings(config.takServerIp, config.takServerPort);
      updates.push(`TAK server: ${config.takServerIp || 'unchanged'}:${config.takServerPort || 'unchanged'}`);
      updated = true;
    }
    
    if (updated) {
      socket.emit('configUpdated', { success: true, message: `Configuration updated: ${updates.join(', ')}` });
      io.emit('status', wigleToTak.getStatus()); // Broadcast new status to all clients
    } else {
      socket.emit('configError', { success: false, message: 'No valid configuration provided' });
    }
  });
  
  // Handle broadcast control
  socket.on('startBroadcast', async (data) => {
    try {
      const result = await wigleToTak.startBroadcasting(data?.filename);
      socket.emit('broadcastStarted', result);
      io.emit('status', wigleToTak.getStatus()); // Broadcast new status to all clients
    } catch (error) {
      socket.emit('broadcastError', { success: false, message: error.message });
    }
  });
  
  socket.on('stopBroadcast', () => {
    const result = wigleToTak.stopBroadcasting();
    socket.emit('broadcastStopped', result);
    io.emit('status', wigleToTak.getStatus()); // Broadcast new status to all clients
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info('Client disconnected from WigleToTAK WebSocket', { 
      clientId: socket.id,
      clientsCount: io.engine.clientsCount - 1 
    });
  });
});

// Event handling for broadcast start/stop
wigleToTak.on('broadcastStart', () => {
  logger.info('TAK broadcasting started');
  io.emit('broadcastStarted', { success: true, message: 'TAK broadcasting started' });
});

wigleToTak.on('broadcastStop', () => {
  logger.info('TAK broadcasting stopped');
  io.emit('broadcastStopped', { success: true, message: 'TAK broadcasting stopped' });
});

wigleToTak.on('messageSent', (data) => {
  logger.debug('TAK message sent:', data.mac || data.entry?.MAC || 'unknown');
  // Emit to WebSocket clients for real-time monitoring
  io.emit('messageSent', {
    mac: data.mac || data.entry?.MAC || 'unknown',
    timestamp: new Date().toISOString(),
    data: data
  });
});

wigleToTak.on('error', (error) => {
  logger.error('WigleToTAK error:', error);
  io.emit('error', { message: error.message || 'Unknown error', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  wigleToTak.stopBroadcasting();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  wigleToTak.stopBroadcasting();
  process.exit(0);
});

const PORT = parseInt(options.flaskPort) || 3002;
server.listen(PORT, () => {
  logger.info(`WigleToTAK server running on port ${PORT}`);
  logger.info(`WebSocket support enabled on port ${PORT}`);
  logger.info(`Command line options: ${JSON.stringify(options)}`);
  
  const status = wigleToTak.getStatus();
  logger.info(`TAK server: ${status.takServerIp}:${status.takServerPort}`);
  logger.info(`Analysis mode: ${status.analysisMode}`);
  logger.info(`Antenna sensitivity: ${status.antennaSensitivity}`);
  logger.info(`Directory: ${status.directory}`);
});

module.exports = { app, server, io };