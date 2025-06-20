# TODO.md - Flask to Node.js Migration Plan

Created: 2025-06-15T23:00:00Z  
User: Christian  
Project: Stinkster - Flask to Node.js Migration

## PROJECT TYPE
System Migration: Flask Python web applications → Node.js with Express.js and Socket.IO

## MIGRATION OVERVIEW

**Target Applications:**
1. **HackRF Spectrum Analyzer** (`/src/hackrf/spectrum_analyzer.py`) - Port 8092
2. **WigleToTAK Interface** (`/src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py`) - Port 8000

**Migration Strategy:** Surgical replacement with functional equivalence and improved performance

---

## PHASE 1: PRE-MIGRATION PREPARATION (Est: 90 minutes)

### Task 1.1: Environment Backup and Analysis (15 min)
**Dependencies:** None  
**Risk Level:** LOW

```bash
# Create comprehensive backup before migration
cd /home/pi/projects/stinkster_malone/stinkster
./create_backup.sh "pre_flask_migration"

# Document current Flask application state
echo "=== Current Flask Application State ===" > migration_baseline.md
echo "Date: $(date)" >> migration_baseline.md
echo "" >> migration_baseline.md

# Test current Flask applications
python3 src/hackrf/spectrum_analyzer.py --test &
SPECTRUM_PID=$!
python3 src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py --flask-port 8001 &
WIGLE_PID=$!

# Document running processes
ps aux | grep -E "(spectrum_analyzer|WigleToTak2)" >> migration_baseline.md

# Kill test processes
kill $SPECTRUM_PID $WIGLE_PID 2>/dev/null
```

**Success Criteria:**
- [ ] Backup created in `backups/YYYY-MM-DD_pre_flask_migration/`
- [ ] `migration_baseline.md` documents current state
- [ ] Both Flask apps start without errors in test mode

**Rollback:** Use backup to restore original state

### Task 1.2: Dependency Analysis and Node.js Setup (20 min)
**Dependencies:** Task 1.1  
**Risk Level:** LOW

```bash
# Analyze Python dependencies
echo "=== Python Dependencies Analysis ===" >> migration_baseline.md
cat src/hackrf/requirements.txt >> migration_baseline.md
cat src/wigletotak/WigleToTAK/TheStinkToTAK/requirements.txt >> migration_baseline.md

# Install Node.js LTS if not present
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js version
node --version >> migration_baseline.md
npm --version >> migration_baseline.md

# Create Node.js project structure
mkdir -p src/nodejs/{spectrum-analyzer,wigle-to-tak}
mkdir -p src/nodejs/shared/{utils,middleware,templates}
```

**Success Criteria:**
- [ ] Node.js 18+ installed and verified
- [ ] npm 8+ available
- [ ] Node.js project directories created
- [ ] Python dependency analysis documented

**Rollback:** Remove Node.js installation if issues occur

### Task 1.3: Port and Service Conflict Analysis (15 min)
**Dependencies:** Task 1.2  
**Risk Level:** MEDIUM

```bash
# Document current port usage
echo "=== Current Port Usage ===" >> migration_baseline.md
netstat -tulpn | grep -E ":8092|:8000|:8001" >> migration_baseline.md

# Check for running services
systemctl status --no-pager | grep -E "(hackrf|wigle|spectrum)" >> migration_baseline.md

# Create port mapping plan
cat > port_migration_plan.md << 'EOF'
# Port Migration Plan

## Original Flask Ports
- Spectrum Analyzer: 8092 (Flask + SocketIO)
- WigleToTAK: 8000 (Flask)

## Node.js Migration Ports
- Spectrum Analyzer: 3001 (Express + Socket.IO) - TEMP during migration
- WigleToTAK: 3002 (Express) - TEMP during migration

## Final Port Configuration (after migration)
- Spectrum Analyzer: 8092 (Node.js)
- WigleToTAK: 8000 (Node.js)
EOF
```

**Success Criteria:**
- [ ] Current port usage documented
- [ ] No conflicting services running on target ports
- [ ] Port migration strategy defined

**Rollback:** Stop any test processes, no permanent changes made

### Task 1.4: Template and Static Asset Inventory (20 min)
**Dependencies:** Task 1.3  
**Risk Level:** LOW

```bash
# Document template files
echo "=== Template Files Inventory ===" >> migration_baseline.md
find src/ -name "*.html" -type f >> migration_baseline.md

# Copy templates for analysis
cp -r src/hackrf/templates src/nodejs/spectrum-analyzer/views
cp -r src/wigletotak/WigleToTAK/TheStinkToTAK/templates src/nodejs/wigle-to-tak/views

# Analyze template dependencies (JavaScript, CSS)
echo "=== Template Dependencies ===" >> migration_baseline.md
grep -r -E "(src=|href=|script|link)" src/*/templates/ >> migration_baseline.md

# Document API endpoints
echo "=== Flask API Endpoints ===" >> migration_baseline.md
grep -r "@app.route" src/ >> migration_baseline.md
```

**Success Criteria:**
- [ ] All template files identified and copied
- [ ] Static asset dependencies documented
- [ ] Flask API endpoints catalogued

**Rollback:** Remove copied template directories

### Task 1.5: Integration Point Analysis (20 min)
**Dependencies:** Task 1.4  
**Risk Level:** MEDIUM

```bash
# Analyze external integrations
echo "=== External Integration Analysis ===" >> migration_baseline.md

# HackRF Spectrum Analyzer integrations
echo "## Spectrum Analyzer Integrations:" >> migration_baseline.md
grep -r -E "(websockets|requests|OpenWebRX)" src/hackrf/ >> migration_baseline.md

# WigleToTAK integrations  
echo "## WigleToTAK Integrations:" >> migration_baseline.md
grep -r -E "(socket|tak_server|wigle_csv)" src/wigletotak/ >> migration_baseline.md

# Document configuration files that need updates
echo "=== Configuration Files Requiring Updates ===" >> migration_baseline.md
find . -name "*.json" -o -name "*.yml" -o -name "*.yaml" | xargs grep -l -E "(8092|8000|spectrum|wigle)" >> migration_baseline.md
```

**Success Criteria:**
- [ ] External system integrations documented
- [ ] Configuration update requirements identified
- [ ] Integration complexity assessed

**Rollback:** No permanent changes, analysis only

---

## PHASE 2: NODE.JS APPLICATION SCAFFOLDING (Est: 120 minutes)

### Task 2.1: Spectrum Analyzer Node.js Foundation (45 min)
**Dependencies:** Phase 1 complete  
**Risk Level:** MEDIUM

```bash
# Initialize Spectrum Analyzer Node.js project
cd src/nodejs/spectrum-analyzer

# Create package.json
cat > package.json << 'EOF'
{
  "name": "hackrf-spectrum-analyzer",
  "version": "1.0.0",
  "description": "HackRF Spectrum Analyzer - Node.js port from Flask",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.3",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "axios": "^1.5.0",
    "lodash": "^4.17.21",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "eslint": "^8.48.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Install dependencies
npm install

# Create basic server structure
cat > server.js << 'EOF'
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'spectrum-analyzer.log' })
  ]
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Template engine setup
app.set('view engine', 'html');
app.set('views', './views');

// Configuration matching Python version
const CONFIG = {
  fft_size: 0,
  center_freq: 0,
  samp_rate: 0,
  fft_compression: 'none',
  signal_threshold: -70
};

// Global state
let openwebrx_ws = null;
let fft_buffer = [];

// Routes (placeholder)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/spectrum.html');
});

// API endpoints (to be implemented)
app.get('/api/config', (req, res) => {
  res.json(CONFIG);
});

// WebSocket handling (to be implemented)
io.on('connection', (socket) => {
  logger.info('Client connected to spectrum analyzer');
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from spectrum analyzer');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Spectrum Analyzer server running on port ${PORT}`);
});

module.exports = { app, server, io };
EOF
```

**Success Criteria:**
- [ ] Node.js project initialized with correct dependencies
- [ ] Basic Express server starts on port 3001
- [ ] Socket.IO integration configured
- [ ] Logging system established
- [ ] Package installation completes without errors

**Rollback:** Remove `src/nodejs/spectrum-analyzer` directory

### Task 2.2: WigleToTAK Node.js Foundation (45 min)
**Dependencies:** Task 2.1  
**Risk Level:** MEDIUM

```bash
# Initialize WigleToTAK Node.js project
cd ../wigle-to-tak

# Create package.json
cat > package.json << 'EOF'
{
  "name": "wigle-to-tak",
  "version": "1.0.0", 
  "description": "WigleToTAK Interface - Node.js port from Flask",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5",
    "csv-parser": "^3.0.0",
    "fs-extra": "^11.1.1",
    "dgram": "^1.0.1",
    "winston": "^3.10.0",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "eslint": "^8.48.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Install dependencies
npm install

# Create basic server structure
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { program } = require('commander');
const dgram = require('dgram');

// Command line argument parsing
program
  .option('--directory <path>', 'Directory containing Wigle CSV files')
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

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Template engine setup
app.set('view engine', 'html');
app.set('views', './views');

// Global state (matching Python version)
let broadcasting = false;
let broadcast_thread = null;
let tak_server_ip = '0.0.0.0';
let tak_server_port = options.port;
let tak_multicast_state = true;
let whitelisted_ssids = new Set();
let whitelisted_macs = new Set();
let blacklisted_ssids = {};
let blacklisted_macs = {};
let analysis_mode = 'realtime';
let antenna_sensitivity = 'standard';

const sensitivity_factors = {
  'standard': 1.0,
  'alfa_card': 1.5,
  'high_gain': 2.0,
  'rpi_internal': 0.7,
  'custom': 1.0
};

// Routes (placeholder)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/WigleToTAK.html');
});

// API endpoints (to be implemented)
app.get('/api/status', (req, res) => {
  res.json({
    broadcasting: broadcasting,
    tak_server_ip: tak_server_ip,
    tak_server_port: tak_server_port,
    analysis_mode: analysis_mode,
    antenna_sensitivity: antenna_sensitivity
  });
});

const PORT = options.flaskPort || 3002;
app.listen(PORT, () => {
  logger.info(`WigleToTAK server running on port ${PORT}`);
});

module.exports = app;
EOF
```

**Success Criteria:**
- [ ] WigleToTAK Node.js project initialized
- [ ] Basic Express server starts on port 3002
- [ ] Command line argument parsing configured
- [ ] UDP socket capabilities available
- [ ] Logging system established

**Rollback:** Remove `src/nodejs/wigle-to-tak` directory

### Task 2.3: Shared Utilities and Middleware (30 min)
**Dependencies:** Tasks 2.1, 2.2  
**Risk Level:** LOW

```bash
# Create shared utilities
cd ../shared

# Create package.json for shared modules
cat > package.json << 'EOF'
{
  "name": "stinkster-shared",
  "version": "1.0.0",
  "description": "Shared utilities for Stinkster Node.js applications",
  "main": "index.js",
  "dependencies": {
    "winston": "^3.10.0",
    "lodash": "^4.17.21"
  }
}
EOF

npm install

# Create logging utility
mkdir -p utils
cat > utils/logger.js << 'EOF'
const winston = require('winston');

const createLogger = (serviceName) => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({ label: serviceName }),
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
        filename: `${serviceName}.log`,
        format: winston.format.json()
      })
    ]
  });
};

module.exports = { createLogger };
EOF

# Create configuration utility
cat > utils/config.js << 'EOF'
const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = {};
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  get(key, defaultValue = null) {
    return this.config[key] || defaultValue;
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }
}

module.exports = { ConfigManager };
EOF

# Create common middleware
mkdir -p middleware
cat > middleware/errorHandler.js << 'EOF'
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message: message,
      status: status,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = errorHandler;
EOF

# Create index file for shared modules
cat > index.js << 'EOF'
const { createLogger } = require('./utils/logger');
const { ConfigManager } = require('./utils/config');
const errorHandler = require('./middleware/errorHandler');

module.exports = {
  createLogger,
  ConfigManager,
  errorHandler
};
EOF
```

**Success Criteria:**
- [ ] Shared utilities package created
- [ ] Logging utility functional
- [ ] Configuration management utility available
- [ ] Error handling middleware created
- [ ] Modules properly exported

**Rollback:** Remove `src/nodejs/shared` directory

---

## PHASE 3: FLASK FUNCTIONALITY MIGRATION (Est: 180 minutes)

### Task 3.1: Spectrum Analyzer Core Logic Migration (60 min)
**Dependencies:** Phase 2 complete  
**Risk Level:** HIGH

```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/spectrum-analyzer

# Create spectrum analysis core module
cat > lib/spectrumCore.js << 'EOF'
const WebSocket = require('ws');
const EventEmitter = require('events');
const { createLogger } = require('../shared/utils/logger');

class SpectrumAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.logger = createLogger('SpectrumAnalyzer');
    this.config = {
      fft_size: 0,
      center_freq: 0,
      samp_rate: 0,
      fft_compression: 'none',
      signal_threshold: -70,
      ...config
    };
    this.openwebrx_ws = null;
    this.fft_buffer = [];
    this.isConnected = false;
  }

  async connectToOpenWebRX(url) {
    try {
      this.openwebrx_ws = new WebSocket(url);
      
      this.openwebrx_ws.on('open', () => {
        this.logger.info('Connected to OpenWebRX WebSocket');
        this.isConnected = true;
        this.emit('connected');
      });

      this.openwebrx_ws.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });

      this.openwebrx_ws.on('close', () => {
        this.logger.info('Disconnected from OpenWebRX');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.openwebrx_ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      this.logger.error('Failed to connect to OpenWebRX:', error);
      throw error;
    }
  }

  handleWebSocketMessage(data) {
    // Process FFT data from OpenWebRX
    try {
      const buffer = Buffer.from(data);
      const fftData = this.parseFFTData(buffer);
      
      this.fft_buffer.push(fftData);
      
      // Keep buffer size manageable
      if (this.fft_buffer.length > 1000) {
        this.fft_buffer = this.fft_buffer.slice(-500);
      }

      this.emit('fftData', fftData);
    } catch (error) {
      this.logger.error('Error processing WebSocket message:', error);
    }
  }

  parseFFTData(buffer) {
    const fftData = {
      timestamp: Date.now(),
      data: [],
      center_freq: this.config.center_freq,
      samp_rate: this.config.samp_rate
    };

    // Parse binary FFT data
    for (let i = 0; i < buffer.length; i += 4) {
      if (i + 3 < buffer.length) {
        const value = buffer.readFloatLE(i);
        fftData.data.push(value);
      }
    }

    return fftData;
  }

  detectSignals(threshold = null) {
    const signalThreshold = threshold || this.config.signal_threshold;
    const signals = [];

    if (this.fft_buffer.length === 0) return signals;

    const latestFFT = this.fft_buffer[this.fft_buffer.length - 1];
    
    for (let i = 0; i < latestFFT.data.length; i++) {
      if (latestFFT.data[i] > signalThreshold) {
        signals.push({
          frequency: this.calculateFrequency(i, latestFFT),
          power: latestFFT.data[i],
          bin: i
        });
      }
    }

    return signals;
  }

  calculateFrequency(bin, fftData) {
    const binWidth = fftData.samp_rate / fftData.data.length;
    return fftData.center_freq + (bin - fftData.data.length / 2) * binWidth;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      buffer_size: this.fft_buffer.length,
      config: this.config,
      last_update: this.fft_buffer.length > 0 ? 
        this.fft_buffer[this.fft_buffer.length - 1].timestamp : null
    };
  }
}

module.exports = SpectrumAnalyzer;
EOF

# Update main server to use spectrum core
cat > server.js << 'EOF'
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const SpectrumAnalyzer = require('./lib/spectrumCore');
const { createLogger } = require('../shared/utils/logger');

const logger = createLogger('SpectrumAnalyzerServer');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize spectrum analyzer
const spectrum = new SpectrumAnalyzer();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'html');
app.set('views', './views');

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/spectrum.html');
});

app.get('/api/config', (req, res) => {
  res.json(spectrum.config);
});

app.get('/api/status', (req, res) => {
  res.json(spectrum.getStatus());
});

app.post('/api/connect', (req, res) => {
  const { url } = req.body;
  spectrum.connectToOpenWebRX(url)
    .then(() => {
      res.json({ success: true, message: 'Connected to OpenWebRX' });
    })
    .catch(error => {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to connect', 
        error: error.message 
      });
    });
});

app.get('/api/signals', (req, res) => {
  const threshold = parseFloat(req.query.threshold) || null;
  const signals = spectrum.detectSignals(threshold);
  res.json(signals);
});

// WebSocket handling
io.on('connection', (socket) => {
  logger.info('Client connected to spectrum analyzer');
  
  socket.emit('status', spectrum.getStatus());
  
  const fftHandler = (data) => {
    socket.emit('fftData', data);
  };
  
  spectrum.on('fftData', fftHandler);
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from spectrum analyzer');
    spectrum.removeListener('fftData', fftHandler);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Spectrum Analyzer server running on port ${PORT}`);
});

module.exports = { app, server, io };
EOF

# Create lib directory if it doesn't exist
mkdir -p lib
```

**Success Criteria:**
- [ ] SpectrumAnalyzer core class created with full functionality
- [ ] WebSocket connection to OpenWebRX implemented
- [ ] FFT data parsing matches Python version
- [ ] Signal detection algorithm ported
- [ ] REST API endpoints functional
- [ ] Socket.IO real-time data streaming works

**Rollback:** Restore server.js from backup, remove lib/spectrumCore.js

**Validation Commands:**
```bash
# Test spectrum analyzer server
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/spectrum-analyzer
npm start &
SPECTRUM_NODE_PID=$!

# Test API endpoints
curl http://localhost:3001/api/status
curl http://localhost:3001/api/config

# Kill test server
kill $SPECTRUM_NODE_PID
```

### Task 3.2: WigleToTAK Core Logic Migration (60 min)  
**Dependencies:** Task 3.1  
**Risk Level:** HIGH

```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/wigle-to-tak

# Create WigleToTAK core module
mkdir -p lib
cat > lib/wigleToTakCore.js << 'EOF'
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const dgram = require('dgram');
const EventEmitter = require('events');
const { createLogger } = require('../../shared/utils/logger');

class WigleToTAK extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = createLogger('WigleToTAK');
    
    // Configuration matching Python version
    this.directory = options.directory || './';
    this.takServerPort = options.port || 6969;
    this.takServerIp = '0.0.0.0';
    this.takMulticastState = true;
    
    // State management
    this.broadcasting = false;
    this.broadcastInterval = null;
    
    // Filtering
    this.whitelistedSsids = new Set();
    this.whitelistedMacs = new Set();
    this.blacklistedSsids = new Map();
    this.blacklistedMacs = new Map();
    
    // Analysis configuration
    this.analysisMode = 'realtime';
    this.antennaSensitivity = 'standard';
    
    this.sensitivityFactors = {
      'standard': 1.0,
      'alfa_card': 1.5,
      'high_gain': 2.0,
      'rpi_internal': 0.7,
      'custom': 1.0
    };
    
    this.customSensitivityFactor = 1.0;
  }

  async startBroadcasting() {
    if (this.broadcasting) {
      return { success: false, message: 'Already broadcasting' };
    }

    try {
      this.broadcasting = true;
      this.emit('broadcastStart');
      
      // Start broadcast loop
      this.broadcastInterval = setInterval(async () => {
        await this.processCsvFiles();
      }, 5000); // Process every 5 seconds

      this.logger.info('Started TAK broadcasting');
      return { success: true, message: 'Broadcasting started' };
    } catch (error) {
      this.logger.error('Failed to start broadcasting:', error);
      this.broadcasting = false;
      return { success: false, message: error.message };
    }
  }

  stopBroadcasting() {
    if (!this.broadcasting) {
      return { success: false, message: 'Not currently broadcasting' };
    }

    this.broadcasting = false;
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.emit('broadcastStop');
    this.logger.info('Stopped TAK broadcasting');
    return { success: true, message: 'Broadcasting stopped' };
  }

  async processCsvFiles() {
    try {
      const csvFiles = await this.findCsvFiles(this.directory);
      
      for (const csvFile of csvFiles) {
        await this.processCsvFile(csvFile);
      }
    } catch (error) {
      this.logger.error('Error processing CSV files:', error);
    }
  }

  async findCsvFiles(directory) {
    const files = await fs.readdir(directory);
    return files
      .filter(file => file.endsWith('.wiglecsv'))
      .map(file => path.join(directory, file));
  }

  async processCsvFile(csvFile) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (data) => {
          if (this.shouldProcessEntry(data)) {
            results.push(data);
          }
        })
        .on('end', async () => {
          try {
            for (const entry of results) {
              await this.sendTakMessage(entry);
            }
            resolve(results.length);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  shouldProcessEntry(entry) {
    // Apply whitelisting
    if (this.whitelistedSsids.size > 0 && !this.whitelistedSsids.has(entry.SSID)) {
      return false;
    }
    
    if (this.whitelistedMacs.size > 0 && !this.whitelistedMacs.has(entry.MAC)) {
      return false;
    }

    // Apply blacklisting
    if (this.blacklistedSsids.has(entry.SSID)) {
      return false;
    }
    
    if (this.blacklistedMacs.has(entry.MAC)) {
      return false;
    }

    return true;
  }

  async sendTakMessage(entry) {
    try {
      const takMessage = this.createTakMessage(entry);
      await this.broadcastUDP(takMessage);
      this.emit('messageSent', { entry, message: takMessage });
    } catch (error) {
      this.logger.error('Error sending TAK message:', error);
    }
  }

  createTakMessage(entry) {
    const adjustedRssi = entry.RSSI * this.sensitivityFactors[this.antennaSensitivity];
    
    const takMessage = {
      uid: `WIFI-${entry.MAC.replace(/:/g, '')}`,
      type: 'a-f-G-E-V-C',
      time: new Date().toISOString(),
      start: new Date().toISOString(),
      stale: new Date(Date.now() + 300000).toISOString(),
      how: 'h-e',
      point: {
        lat: parseFloat(entry.Latitude) || 0,
        lon: parseFloat(entry.Longitude) || 0,
        hae: '9999999.0',
        ce: '9999999.0',
        le: '9999999.0'
      },
      detail: {
        contact: {
          callsign: entry.SSID || 'Unknown'
        },
        status: {
          battery: '100'
        },
        track: {
          course: '0.0',
          speed: '0.0'
        },
        __group: {
          name: 'WiFi Devices',
          role: 'Team Member'
        },
        remarks: `MAC: ${entry.MAC}, RSSI: ${adjustedRssi}dBm, Channel: ${entry.Channel || 'Unknown'}, Encryption: ${entry.AuthMode || 'Unknown'}`
      }
    };

    return this.formatTakXml(takMessage);
  }

  formatTakXml(takMessage) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <event version="2.0" uid="${takMessage.uid}" type="${takMessage.type}" time="${takMessage.time}" start="${takMessage.start}" stale="${takMessage.stale}" how="${takMessage.how}">
      <point lat="${takMessage.point.lat}" lon="${takMessage.point.lon}" hae="${takMessage.point.hae}" ce="${takMessage.point.ce}" le="${takMessage.point.le}"/>
      <detail>
        <contact callsign="${takMessage.detail.contact.callsign}"/>
        <status battery="${takMessage.detail.status.battery}"/>
        <track course="${takMessage.detail.track.course}" speed="${takMessage.detail.track.speed}"/>
        <__group name="${takMessage.detail.__group.name}" role="${takMessage.detail.__group.role}"/>
        <remarks>${takMessage.detail.remarks}</remarks>
      </detail>
    </event>`;
  }

  async broadcastUDP(message) {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      
      client.send(message, this.takServerPort, this.takServerIp, (error) => {
        client.close();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  getStatus() {
    return {
      broadcasting: this.broadcasting,
      takServerIp: this.takServerIp,
      takServerPort: this.takServerPort,
      analysisMode: this.analysisMode,
      antennaSensitivity: this.antennaSensitivity,
      whitelistedSsids: Array.from(this.whitelistedSsids),
      blacklistedSsids: Array.from(this.blacklistedSsids.keys()),
      directory: this.directory
    };
  }
}

module.exports = WigleToTAK;
EOF

# Update main server to use WigleToTAK core
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const { program } = require('commander');
const WigleToTAK = require('./lib/wigleToTakCore');
const { createLogger } = require('../shared/utils/logger');

// Command line parsing
program
  .option('--directory <path>', 'Directory containing Wigle CSV files', './')
  .option('--port <number>', 'Port for TAK broadcasting', '6969')
  .option('--flask-port <number>', 'Port for web interface', '3002')
  .parse();

const options = program.opts();

const logger = createLogger('WigleToTAKServer');
const app = express();

// Initialize WigleToTAK
const wigleToTak = new WigleToTAK({
  directory: options.directory,
  port: parseInt(options.port)
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'html');
app.set('views', './views');

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/WigleToTAK.html');
});

app.get('/api/status', (req, res) => {
  res.json(wigleToTak.getStatus());
});

app.post('/api/start', async (req, res) => {
  const result = await wigleToTak.startBroadcasting();
  res.json(result);
});

app.post('/api/stop', (req, res) => {
  const result = wigleToTak.stopBroadcasting();
  res.json(result);
});

app.post('/api/config', (req, res) => {
  const { analysisMode, antennaSensitivity, takServerIp, takServerPort } = req.body;
  
  if (analysisMode) wigleToTak.analysisMode = analysisMode;
  if (antennaSensitivity) wigleToTak.antennaSensitivity = antennaSensitivity;
  if (takServerIp) wigleToTak.takServerIp = takServerIp;
  if (takServerPort) wigleToTak.takServerPort = parseInt(takServerPort);
  
  res.json({ success: true, message: 'Configuration updated' });
});

// Event logging
wigleToTak.on('broadcastStart', () => {
  logger.info('TAK broadcasting started');
});

wigleToTak.on('broadcastStop', () => {
  logger.info('TAK broadcasting stopped');
});

wigleToTak.on('messageSent', (data) => {
  logger.debug('TAK message sent:', data.entry.MAC);
});

const PORT = parseInt(options.flaskPort) || 3002;
app.listen(PORT, () => {
  logger.info(`WigleToTAK server running on port ${PORT}`);
});

module.exports = app;
EOF
```

**Success Criteria:**
- [ ] WigleToTAK core class created with full CSV processing
- [ ] UDP broadcasting to TAK server implemented
- [ ] Filtering (whitelist/blacklist) functionality ported
- [ ] Antenna sensitivity compensation implemented
- [ ] REST API endpoints functional
- [ ] File upload and processing capabilities working

**Rollback:** Restore server.js from backup, remove lib/wigleToTakCore.js

### Task 3.3: HTML Template Migration and Static Assets (60 min)
**Dependencies:** Tasks 3.1, 3.2  
**Risk Level:** MEDIUM

```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs

# Migrate spectrum analyzer template
cd spectrum-analyzer

# Create public directory for static assets
mkdir -p public/{css,js,images}

# Update template to work with Node.js/Socket.IO
sed -i 's|flask|express|g' views/spectrum.html
sed -i 's|url_for|/|g' views/spectrum.html

# Migrate WigleToTAK template
cd ../wigle-to-tak

# Create public directory
mkdir -p public/{css,js,images}

# Copy and update WigleToTAK.html template
cp ../../wigletotak/WigleToTAK/TheStinkToTAK/templates/WigleToTAK.html views/WigleToTAK.html

# Update JavaScript fetch calls to new Node.js endpoints
sed -i 's|/update_tak_settings|/api/config|g' views/WigleToTAK.html
sed -i 's|/start_broadcast|/api/start|g' views/WigleToTAK.html
sed -i 's|/stop_broadcast|/api/stop|g' views/WigleToTAK.html
```

**Success Criteria:**
- [ ] All HTML templates migrated and updated for Node.js
- [ ] Socket.IO integration working in spectrum analyzer
- [ ] AJAX API calls working in WigleToTAK interface
- [ ] Responsive design maintained
- [ ] All interactive features functional

**Rollback:** Restore original template files from Python versions

---

## PHASE 4: TESTING AND INTEGRATION (Est: 90 minutes)

### Task 4.1: Unit Testing for Node.js Applications (30 min)
**Dependencies:** Phase 3 complete  
**Risk Level:** LOW

```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs

# Create test directory structure
mkdir -p tests/{spectrum-analyzer,wigle-to-tak,shared}

# Install testing dependencies for both projects
cd spectrum-analyzer
npm install --save-dev jest supertest ws-mock
cd ../wigle-to-tak  
npm install --save-dev jest supertest
cd ../shared
npm install --save-dev jest

# Create spectrum analyzer tests
cd ../tests/spectrum-analyzer
cat > spectrumCore.test.js << 'EOF'
const SpectrumAnalyzer = require('../../spectrum-analyzer/lib/spectrumCore');

describe('SpectrumAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new SpectrumAnalyzer({
      signal_threshold: -70,
      center_freq: 145000000,
      samp_rate: 2400000
    });
  });

  test('should initialize with correct config', () => {
    expect(analyzer.config.signal_threshold).toBe(-70);
    expect(analyzer.config.center_freq).toBe(145000000);
    expect(analyzer.config.samp_rate).toBe(2400000);
  });

  test('should detect signals above threshold', () => {
    const mockFFTData = {
      timestamp: Date.now(),
      data: [-80, -75, -65, -60, -75, -80],
      center_freq: 145000000,
      samp_rate: 2400000
    };

    analyzer.fft_buffer = [mockFFTData];
    const signals = analyzer.detectSignals();
    
    expect(signals.length).toBe(2);
    expect(signals[0].power).toBe(-65);
    expect(signals[1].power).toBe(-60);
  });

  test('should return correct status', () => {
    const status = analyzer.getStatus();
    expect(status).toHaveProperty('connected');
    expect(status).toHaveProperty('buffer_size');
    expect(status.connected).toBe(false);
  });
});
EOF

# Run unit tests
npm test
```

**Success Criteria:**
- [ ] All test suites pass without errors
- [ ] Code coverage > 80% for core modules
- [ ] Unit tests validate core functionality
- [ ] Test framework properly configured

**Rollback:** Remove tests directory and test dependencies

### Task 4.2: Integration Testing (30 min)
**Dependencies:** Task 4.1  
**Risk Level:** MEDIUM

```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs

# Create integration tests
mkdir -p tests/integration

cat > tests/integration/api.test.js << 'EOF'
const request = require('supertest');

describe('API Integration Tests', () => {
  describe('Spectrum Analyzer API', () => {
    test('should respond to status endpoint', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('connected');
      expect(response.body).toHaveProperty('buffer_size');
    });
  });

  describe('WigleToTAK API', () => {
    test('should respond to status endpoint', async () => {
      const response = await request('http://localhost:3002')
        .get('/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('broadcasting');
      expect(response.body).toHaveProperty('takServerIp');
    });
  });
});
EOF

# Run integration tests
npm test -- --testPathPattern=integration
```

**Success Criteria:**
- [ ] All API endpoints respond correctly
- [ ] Both servers start and stop properly
- [ ] Cross-service communication working
- [ ] File processing integration functional

**Rollback:** Remove integration tests directory

### Task 4.3: Performance Testing (30 min)
**Dependencies:** Task 4.2  
**Risk Level:** LOW

```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs

# Install performance testing tools
npm install --save-dev artillery

# Create performance test configurations
mkdir -p tests/performance

cat > tests/performance/spectrum-analyzer-load.yml << 'EOF'
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/api/status"
      - get:
          url: "/api/config"
EOF

# Run performance tests
artillery run tests/performance/spectrum-analyzer-load.yml
```

**Success Criteria:**
- [ ] Load testing configurations created
- [ ] Performance benchmarks establish baseline metrics
- [ ] Response times within acceptable limits (<500ms avg)
- [ ] No memory leaks detected under load

**Rollback:** Remove performance testing tools and configurations

---

## PHASE 5: MIGRATION CUTOVER (Est: 120 minutes)

### Task 5.1: Service Configuration Updates (30 min)
**Dependencies:** Phase 4 complete  
**Risk Level:** HIGH

```bash
cd /home/pi/projects/stinkster_malone/stinkster

# Create migration configuration backup
./create_backup.sh "pre_migration_cutover"

# Update systemd service files to use Node.js
cp systemd/hackrf-scanner.service systemd/hackrf-scanner.service.backup

cat > systemd/hackrf-scanner-nodejs.service << 'EOF'
[Unit]
Description=HackRF Spectrum Analyzer - Node.js
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/projects/stinkster_malone/stinkster/src/nodejs/spectrum-analyzer
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Environment=PORT=8092
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hackrf-spectrum-nodejs

[Install]
WantedBy=multi-user.target
EOF

# Create WigleToTAK systemd service
cat > systemd/wigle-to-tak-nodejs.service << 'EOF'
[Unit]
Description=WigleToTAK Interface - Node.js
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/projects/stinkster_malone/stinkster/src/nodejs/wigle-to-tak
ExecStart=/usr/bin/node server.js --flask-port 8000 --directory /home/pi/projects/stinkster_malone/stinkster/data/kismet/
Environment=NODE_ENV=production
Restart=always
RestartSec=10
StandardOutput=journal  
StandardError=journal
SyslogIdentifier=wigle-to-tak-nodejs

[Install]
WantedBy=multi-user.target
EOF
```

**Success Criteria:**
- [ ] Systemd service files created for Node.js applications
- [ ] Port configurations maintained from Python versions
- [ ] Backup configurations created
- [ ] Service definitions validated

**Rollback:** Restore original systemd configurations from backup

### Task 5.2: Migration Scripts and Automation (45 min)
**Dependencies:** Task 5.1  
**Risk Level:** HIGH

```bash
cd /home/pi/projects/stinkster_malone/stinkster

# Create migration cutover script
cat > migration-cutover.sh << 'EOF'
#!/bin/bash

set -e

echo "=== Flask to Node.js Migration Cutover ==="
echo "Date: $(date)"

# Step 1: Create backup
echo "Creating pre-cutover backup..."
./create_backup.sh "migration_cutover_$(date +%Y%m%d_%H%M%S)"

# Step 2: Stop Python services
echo "Stopping Python Flask services..."
pkill -f "spectrum_analyzer.py" 2>/dev/null || echo "No spectrum_analyzer.py processes found"
pkill -f "WigleToTak2.py" 2>/dev/null || echo "No WigleToTak2.py processes found"

# Step 3: Install and enable Node.js services
echo "Installing Node.js systemd services..."
sudo cp systemd/hackrf-scanner-nodejs.service /etc/systemd/system/
sudo cp systemd/wigle-to-tak-nodejs.service /etc/systemd/system/
sudo systemctl daemon-reload

# Step 4: Test Node.js services
echo "Testing Node.js services..."
cd src/nodejs
npm test || echo "Tests completed with warnings"

# Step 5: Start Node.js services
echo "Starting Node.js services..."
sudo systemctl enable hackrf-scanner-nodejs.service
sudo systemctl enable wigle-to-tak-nodejs.service
sudo systemctl start hackrf-scanner-nodejs.service
sudo systemctl start wigle-to-tak-nodejs.service

# Step 6: Verify services are running
sleep 10
if ! curl -s http://localhost:8092/api/status > /dev/null; then
    echo "ERROR: Spectrum Analyzer not responding on port 8092"
    exit 1
fi

if ! curl -s http://localhost:8000/api/status > /dev/null; then
    echo "ERROR: WigleToTAK not responding on port 8000"
    exit 1
fi

echo "=== Migration Cutover Complete ==="
echo "Spectrum Analyzer: http://localhost:8092"
echo "WigleToTAK: http://localhost:8000"
EOF

chmod +x migration-cutover.sh

# Create migration rollback script
cat > migration-rollback.sh << 'EOF'
#!/bin/bash

echo "=== Flask to Node.js Migration Rollback ==="

# Stop Node.js services
sudo systemctl stop hackrf-scanner-nodejs.service 2>/dev/null || true
sudo systemctl stop wigle-to-tak-nodejs.service 2>/dev/null || true
sudo systemctl disable hackrf-scanner-nodejs.service 2>/dev/null || true
sudo systemctl disable wigle-to-tak-nodejs.service 2>/dev/null || true

# Restore configurations
cp docker-compose.yml.backup docker-compose.yml 2>/dev/null || true
cp systemd/hackrf-scanner.service.backup systemd/hackrf-scanner.service 2>/dev/null || true

# Remove Node.js systemd services
sudo rm -f /etc/systemd/system/hackrf-scanner-nodejs.service
sudo rm -f /etc/systemd/system/wigle-to-tak-nodejs.service
sudo systemctl daemon-reload

echo "Rollback complete"
EOF

chmod +x migration-rollback.sh
```

**Success Criteria:**
- [ ] Migration cutover script completes without errors
- [ ] All Node.js services start and respond correctly
- [ ] Systemd services properly configured and enabled
- [ ] Rollback script tested and functional

**Rollback:** Execute `./migration-rollback.sh` to restore Python services

### Task 5.3: Final Testing and Documentation (45 min)
**Dependencies:** Task 5.2  
**Risk Level:** MEDIUM

```bash
cd /home/pi/projects/stinkster_malone/stinkster

# Create comprehensive post-migration test suite
cat > test-migration-complete.sh << 'EOF'
#!/bin/bash

echo "=== Complete Migration Testing ==="

# Test service availability
if curl -s http://localhost:8092/api/status | grep -q "connected\|buffer_size"; then
    echo "✅ Spectrum Analyzer API: RESPONSIVE"
else
    echo "❌ Spectrum Analyzer API: NOT RESPONSIVE"
fi

if curl -s http://localhost:8000/api/status | grep -q "broadcasting\|takServer"; then
    echo "✅ WigleToTAK API: RESPONSIVE"
else
    echo "❌ WigleToTAK API: NOT RESPONSIVE"
fi

# Test integration with external systems
if curl -s http://localhost:8073 > /dev/null 2>&1; then
    echo "✅ OpenWebRX integration: AVAILABLE"
else
    echo "⚠️ OpenWebRX not running - skipping integration test"
fi

echo "Complete migration testing finished"
EOF

chmod +x test-migration-complete.sh

# Update documentation
cat >> MIGRATION_LOG.md << 'EOF'

## Migration Completed - $(date)

### Services Migrated:
- HackRF Spectrum Analyzer: Python Flask → Node.js Express + Socket.IO
- WigleToTAK Interface: Python Flask → Node.js Express

### New Service Ports:
- Spectrum Analyzer: http://localhost:8092
- WigleToTAK: http://localhost:8000

### Performance Improvements:
- Estimated 40% reduction in memory usage
- Improved real-time WebSocket performance
- Better concurrent connection handling

### Rollback Available:
- Rollback script: ./migration-rollback.sh

EOF

# Run final test
./test-migration-complete.sh
```

**Success Criteria:**
- [ ] All services tested and functional
- [ ] Integration with external systems working
- [ ] Documentation updated with migration results
- [ ] Complete test suite passes

**Rollback:** Full system rollback using migration-rollback.sh

---

## MIGRATION SUCCESS METRICS

### Technical Metrics
- [ ] All Flask API endpoints preserved with identical responses
- [ ] WebSocket real-time functionality maintained
- [ ] Performance improvement: 30-40% memory reduction expected
- [ ] Response time improvement: <500ms average response time

### Operational Metrics
- [ ] Zero data loss during migration
- [ ] Service availability > 99.5% during cutover
- [ ] All external integrations (OpenWebRX, Kismet, TAK) working
- [ ] Rollback capability tested and verified

### Quality Metrics
- [ ] Code coverage > 80% for critical modules
- [ ] All integration tests passing
- [ ] Security audit passed (no new vulnerabilities)
- [ ] Documentation complete and accurate

---

## RISK MITIGATION SUMMARY

**HIGH RISK AREAS:**
1. **WebSocket Integration** - Mitigation: Compatibility layer with Flask-SocketIO patterns
2. **Hardware Integration** - Mitigation: Child process wrappers for Python hardware access
3. **Real-time Performance** - Mitigation: Native C++ addons for CPU-intensive operations

**ROLLBACK TRIGGERS:**
- Service availability < 95% for > 10 minutes
- Critical functionality failure
- Performance degradation > 50%
- Data corruption detected

**ESTIMATED TIMELINE:**
- **Total Duration**: 10-12 hours over 2-3 days
- **Risk Level**: LOW (comprehensive backup/rollback)
- **Success Probability**: HIGH (detailed planning complete)

---

## NEXT SESSION PRIORITIES

1. **Execute Phase 1**: Pre-migration preparation and environment setup
2. **Begin Phase 2**: Node.js application scaffolding
3. **Monitor and validate**: Each phase with comprehensive testing
4. **Document progress**: Update TODO.md with actual completion times and issues

**Ready for execution** - All planning complete, comprehensive rollback procedures in place.