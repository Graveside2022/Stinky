// Comprehensive mock implementations for testing

const { EventEmitter } = require('events');
const dgram = require('dgram');

/**
 * Mock GPSD Client
 * Simulates GPSD connection and GPS data streaming
 */
class MockGPSDClient extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.fix = null;
    this.satellites = [];
    this.streaming = false;
    this.streamInterval = null;
  }

  connect(host = 'localhost', port = 2947) {
    return new Promise((resolve, reject) => {
      // Simulate connection delay
      setTimeout(() => {
        if (host === 'invalid' || port === 0) {
          this.emit('error', new Error('Connection refused'));
          reject(new Error('Connection refused'));
        } else {
          this.connected = true;
          this.emit('connected');
          resolve();
        }
      }, 10);
    });
  }

  watch(options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to GPSD');
    }

    this.streaming = true;
    
    // Start streaming GPS data
    this.streamInterval = setInterval(() => {
      if (this.fix) {
        this.emit('TPV', this.fix);
      }
      if (this.satellites.length > 0) {
        this.emit('SKY', { satellites: this.satellites });
      }
    }, 1000);

    return Promise.resolve();
  }

  unwatch() {
    this.streaming = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
  }

  disconnect() {
    this.unwatch();
    this.connected = false;
    this.emit('disconnected');
  }

  // Test helpers
  setFix(fixData) {
    this.fix = {
      class: 'TPV',
      device: '/dev/ttyUSB0',
      mode: 3,
      time: new Date().toISOString(),
      ept: 0.005,
      lat: 40.7128,
      lon: -74.0060,
      alt: 10.5,
      epx: 15.0,
      epy: 15.0,
      epv: 30.0,
      track: 0.0,
      speed: 0.0,
      climb: 0.0,
      eps: 0.0,
      epc: 0.0,
      ...fixData
    };
    
    if (this.streaming) {
      this.emit('TPV', this.fix);
    }
  }

  setSatellites(satData) {
    this.satellites = satData;
    if (this.streaming) {
      this.emit('SKY', { satellites: satData });
    }
  }

  clearFix() {
    this.fix = null;
  }
}

/**
 * Mock Kismet API Client
 * Simulates Kismet REST API for device tracking
 */
class MockKismetAPI {
  constructor(baseUrl = 'http://localhost:2501') {
    this.baseUrl = baseUrl;
    this.devices = new Map();
    this.alerts = [];
    this.status = {
      devices_total: 0,
      packets_total: 0,
      channels: '1,6,11',
      hopping: true
    };
    this.authenticated = false;
  }

  async authenticate(username, password) {
    if (username === 'admin' && password === 'kismet') {
      this.authenticated = true;
      return { success: true, token: 'mock-token-123' };
    }
    throw new Error('Authentication failed');
  }

  async getDevices(filters = {}) {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    let devices = Array.from(this.devices.values());

    // Apply filters
    if (filters.last_time) {
      devices = devices.filter(d => d.kismet_device_base_last_time > filters.last_time);
    }

    if (filters.type) {
      devices = devices.filter(d => d.kismet_device_base_type === filters.type);
    }

    if (filters.min_rssi) {
      devices = devices.filter(d => d.kismet_device_base_signal >= filters.min_rssi);
    }

    return devices;
  }

  async getDevice(mac) {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    const device = this.devices.get(mac);
    if (!device) {
      throw new Error('Device not found');
    }

    return device;
  }

  async getStatus() {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    return {
      ...this.status,
      devices_total: this.devices.size,
      uptime: Math.floor(process.uptime())
    };
  }

  async getAlerts(since = 0) {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    return this.alerts.filter(a => a.timestamp > since);
  }

  // Test helpers
  addMockDevice(device) {
    const mockDevice = {
      kismet_device_base_key: device.mac || 'AA:BB:CC:DD:EE:FF',
      kismet_device_base_macaddr: device.mac || 'AA:BB:CC:DD:EE:FF',
      kismet_device_base_name: device.ssid || '',
      kismet_device_base_type: device.type || 'Wi-Fi',
      kismet_device_base_first_time: device.first_time || Date.now() / 1000,
      kismet_device_base_last_time: device.last_time || Date.now() / 1000,
      kismet_device_base_signal: device.rssi || -70,
      kismet_device_base_channel: device.channel || '6',
      kismet_device_base_frequency: device.frequency || 2437000000,
      kismet_device_base_datasize: device.datasize || 0,
      kismet_device_base_packets: device.packets || 1,
      kismet_device_base_location: {
        kismet_common_location_lat: device.lat || 0,
        kismet_common_location_lon: device.lon || 0,
        kismet_common_location_alt: device.alt || 0,
        kismet_common_location_fix: device.gps_fix || 0
      },
      ...device
    };

    this.devices.set(mockDevice.kismet_device_base_key, mockDevice);
    this.status.devices_total = this.devices.size;
    
    return mockDevice;
  }

  addMockAlert(alert) {
    const mockAlert = {
      timestamp: Date.now() / 1000,
      type: alert.type || 'SYSTEM',
      message: alert.message || 'Test alert',
      ...alert
    };

    this.alerts.push(mockAlert);
    return mockAlert;
  }

  clearDevices() {
    this.devices.clear();
    this.status.devices_total = 0;
  }

  clearAlerts() {
    this.alerts = [];
  }
}

/**
 * Mock OpenWebRX WebSocket Server
 * Simulates OpenWebRX FFT data streaming
 */
class MockOpenWebRXServer extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
    this.streaming = false;
    this.streamInterval = null;
    this.config = {
      center_freq: 145000000,
      samp_rate: 2400000,
      fft_size: 1024
    };
  }

  handleConnection(ws) {
    this.clients.add(ws);
    
    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(ws, message);
      } catch (e) {
        // Handle binary messages
        this.handleBinaryMessage(ws, data);
      }
    });

    // Send initial configuration
    this.sendToClient(ws, {
      type: 'config',
      ...this.config
    });
  }

  handleMessage(ws, message) {
    switch (message.type) {
      case 'start':
        this.startStreaming();
        break;
      case 'stop':
        this.stopStreaming();
        break;
      case 'setConfig':
        this.updateConfig(message.config);
        break;
    }
  }

  handleBinaryMessage(ws, data) {
    // Handle binary control messages if needed
  }

  startStreaming() {
    if (this.streaming) return;

    this.streaming = true;
    this.streamInterval = setInterval(() => {
      const fftData = this.generateFFTData();
      const buffer = this.encodeFFTData(fftData);
      
      this.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(buffer);
        }
      });
    }, 100); // 10 Hz update rate
  }

  stopStreaming() {
    this.streaming = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
  }

  generateFFTData() {
    const data = new Float32Array(this.config.fft_size);
    
    // Generate noise floor
    for (let i = 0; i < data.length; i++) {
      data[i] = 0.00001 + Math.random() * 0.00005; // -80 to -90 dBFS
    }

    // Add some signals
    this.addSignal(data, 256, 0.1);  // -20 dBFS signal
    this.addSignal(data, 512, 0.05); // -26 dBFS signal
    this.addSignal(data, 768, 0.02); // -34 dBFS signal

    return data;
  }

  addSignal(data, center, amplitude) {
    const width = 10;
    for (let i = -width; i <= width; i++) {
      const index = center + i;
      if (index >= 0 && index < data.length) {
        const envelope = Math.exp(-0.5 * Math.pow(i / 5, 2));
        data[index] += amplitude * envelope;
      }
    }
  }

  encodeFFTData(data) {
    const buffer = Buffer.allocUnsafe(data.length * 4);
    for (let i = 0; i < data.length; i++) {
      buffer.writeFloatLE(data[i], i * 4);
    }
    return buffer;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Notify all clients
    this.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        this.sendToClient(client, {
          type: 'config',
          ...this.config
        });
      }
    });
  }

  sendToClient(ws, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.stopStreaming();
    this.clients.forEach(client => client.close());
    this.clients.clear();
  }
}

/**
 * Mock UDP Socket for TAK Broadcasting
 * Simulates UDP multicast for TAK messages
 */
class MockUDPSocket extends EventEmitter {
  constructor() {
    super();
    this.sentMessages = [];
    this.bound = false;
    this.multicastGroups = [];
  }

  bind(port, callback) {
    setTimeout(() => {
      this.bound = true;
      this.emit('listening');
      if (callback) callback();
    }, 10);
  }

  send(message, offset, length, port, address, callback) {
    if (!this.bound) {
      const error = new Error('Not bound');
      if (callback) callback(error);
      return;
    }

    const data = message.slice(offset, offset + length);
    this.sentMessages.push({
      data: data.toString(),
      port,
      address,
      timestamp: Date.now()
    });

    if (callback) {
      setTimeout(() => callback(null), 5);
    }
  }

  addMembership(multicastAddress) {
    this.multicastGroups.push(multicastAddress);
  }

  dropMembership(multicastAddress) {
    const index = this.multicastGroups.indexOf(multicastAddress);
    if (index > -1) {
      this.multicastGroups.splice(index, 1);
    }
  }

  close(callback) {
    this.bound = false;
    this.emit('close');
    if (callback) callback();
  }

  // Test helpers
  getSentMessages() {
    return this.sentMessages;
  }

  clearSentMessages() {
    this.sentMessages = [];
  }

  getLastMessage() {
    return this.sentMessages[this.sentMessages.length - 1];
  }
}

/**
 * Mock Shell Executor
 * Simulates shell command execution
 */
class MockShellExecutor {
  constructor() {
    this.scripts = new Map();
    this.executionLog = [];
    this.defaultResponses = {
      '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh': {
        stdout: 'Kismet started successfully\nPID: 12345\n',
        stderr: '',
        exitCode: 0
      },
      '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh': {
        stdout: 'GPS/Kismet/Wigle services started\n',
        stderr: '',
        exitCode: 0
      },
      'pgrep': {
        stdout: '12345\n',
        stderr: '',
        exitCode: 0
      },
      'pkill': {
        stdout: '',
        stderr: '',
        exitCode: 0
      }
    };
  }

  async execute(command, args = [], options = {}) {
    const execution = {
      command,
      args,
      options,
      timestamp: Date.now(),
      stdout: '',
      stderr: '',
      exitCode: 0
    };

    // Check for custom handler
    const handler = this.scripts.get(command);
    if (handler) {
      const result = await handler(args, options);
      Object.assign(execution, result);
    } else {
      // Use default response or generate one
      const defaultResponse = this.defaultResponses[command];
      if (defaultResponse) {
        Object.assign(execution, defaultResponse);
      } else {
        execution.stdout = `Mock output for: ${command} ${args.join(' ')}\n`;
      }
    }

    this.executionLog.push(execution);

    if (execution.exitCode !== 0) {
      const error = new Error(`Command failed: ${command}`);
      error.code = execution.exitCode;
      error.stdout = execution.stdout;
      error.stderr = execution.stderr;
      throw error;
    }

    return execution;
  }

  registerScript(scriptPath, handler) {
    this.scripts.set(scriptPath, handler);
  }

  getExecutionHistory() {
    return this.executionLog;
  }

  clearHistory() {
    this.executionLog = [];
  }

  getLastExecution() {
    return this.executionLog[this.executionLog.length - 1];
  }
}

/**
 * Mock File System
 * Simulates file operations for testing
 */
class MockFileSystem {
  constructor() {
    this.files = new Map();
    this.directories = new Set();
    
    // Initialize with common directories
    this.directories.add('/uploads');
    this.directories.add('/tmp');
    this.directories.add('/config');
  }

  async readFile(path) {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return this.files.get(path);
  }

  async writeFile(path, data) {
    // Extract directory
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir && !this.directories.has(dir)) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    
    this.files.set(path, data);
  }

  async exists(path) {
    return this.files.has(path) || this.directories.has(path);
  }

  async mkdir(path, options = {}) {
    if (this.directories.has(path) && !options.recursive) {
      throw new Error(`EEXIST: file already exists, mkdir '${path}'`);
    }
    
    if (options.recursive) {
      // Create all parent directories
      const parts = path.split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        this.directories.add(currentPath);
      }
    } else {
      this.directories.add(path);
    }
  }

  async unlink(path) {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
    this.files.delete(path);
  }

  async readdir(path) {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    
    const entries = [];
    const prefix = path.endsWith('/') ? path : path + '/';
    
    // Find all files and directories in this path
    for (const [filePath] of this.files) {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.substring(prefix.length);
        const firstSlash = relative.indexOf('/');
        if (firstSlash === -1) {
          entries.push(relative);
        }
      }
    }
    
    for (const dirPath of this.directories) {
      if (dirPath.startsWith(prefix) && dirPath !== path) {
        const relative = dirPath.substring(prefix.length);
        const firstSlash = relative.indexOf('/');
        if (firstSlash === -1) {
          entries.push(relative);
        }
      }
    }
    
    return [...new Set(entries)];
  }

  // Test helpers
  addFile(path, content) {
    this.files.set(path, content);
  }

  clear() {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/uploads');
    this.directories.add('/tmp');
    this.directories.add('/config');
  }
}

module.exports = {
  MockGPSDClient,
  MockKismetAPI,
  MockOpenWebRXServer,
  MockUDPSocket,
  MockShellExecutor,
  MockFileSystem
};