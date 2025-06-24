const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const dgram = require('dgram');
const EventEmitter = require('events');
const chokidar = require('chokidar');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'WigleToTAK' }),
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
      filename: 'wigle-to-tak.log',
      format: winston.format.json()
    })
  ]
});

class WigleToTAK extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration matching Python version
    this.directory = options.directory || './';
    this.takServerPort = parseInt(options.port) || 6969;
    this.takServerIp = '0.0.0.0';
    this.takMulticastState = true;
    this.multicastGroup = '239.2.3.1';
    
    // State management
    this.broadcasting = false;
    this.broadcastInterval = null;
    this.fileWatcher = null;
    this.lastFilePositions = new Map(); // Track file read positions for real-time mode
    
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
    
    // UDP socket
    this.udpSocket = null;
    
    // Processed entries tracking
    this.processedMacs = new Set();
    this.processedEntries = new Set();
  }

  async startBroadcasting(filename = null) {
    if (this.broadcasting) {
      return { success: false, message: 'Already broadcasting' };
    }

    try {
      this.broadcasting = true;
      this.emit('broadcastStart');
      
      // Initialize UDP socket
      this.initializeUDPSocket();
      
      if (filename) {
        // Single file mode
        const fullPath = path.join(this.directory, filename);
        if (!await fs.pathExists(fullPath)) {
          this.broadcasting = false;
          return { success: false, message: 'File does not exist' };
        }
        
        logger.info(`Starting broadcast for specific file: ${fullPath}`);
        await this.processCsvFile(fullPath);
      } else {
        // Directory monitoring mode
        logger.info(`Starting broadcast for directory: ${this.directory}`);
        
        if (this.analysisMode === 'realtime') {
          await this.startRealtimeBroadcasting();
        } else {
          await this.startPostCollectionBroadcasting();
        }
      }

      logger.info('TAK broadcasting started');
      return { success: true, message: 'Broadcasting started' };
    } catch (error) {
      logger.error('Failed to start broadcasting:', error);
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
    
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = null;
    }

    this.emit('broadcastStop');
    logger.info('TAK broadcasting stopped');
    return { success: true, message: 'Broadcasting stopped' };
  }

  initializeUDPSocket() {
    if (!this.udpSocket) {
      this.udpSocket = dgram.createSocket('udp4');
      this.udpSocket.bind(() => {
        if (this.takMulticastState) {
          this.udpSocket.setBroadcast(true);
          this.udpSocket.setMulticastTTL(1);
        }
        logger.info('UDP socket initialized for TAK broadcasting');
      });
    }
  }

  async startRealtimeBroadcasting() {
    logger.info('Starting real-time broadcasting mode');
    
    // Setup file watcher for new .wiglecsv files
    this.fileWatcher = chokidar.watch(path.join(this.directory, '*.wiglecsv'), {
      ignored: /^\./, 
      persistent: true,
      usePolling: true,
      interval: 1000
    });

    this.fileWatcher.on('change', async (filePath) => {
      if (this.broadcasting) {
        await this.processFileChanges(filePath);
      }
    });

    this.fileWatcher.on('add', async (filePath) => {
      if (this.broadcasting) {
        logger.info(`New CSV file detected: ${filePath}`);
        await this.processFileChanges(filePath);
      }
    });

    // Process existing files initially
    const csvFiles = await this.findCsvFiles(this.directory);
    for (const csvFile of csvFiles) {
      await this.processFileChanges(csvFile);
    }
  }

  async startPostCollectionBroadcasting() {
    logger.info('Starting post-collection broadcasting mode');
    
    // Process all CSV files with interval
    this.broadcastInterval = setInterval(async () => {
      if (this.broadcasting) {
        await this.processCsvFiles();
      }
    }, 5000); // Process every 5 seconds
  }

  async processFileChanges(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const currentSize = stats.size;
      const lastPosition = this.lastFilePositions.get(filePath) || 0;
      
      if (currentSize > lastPosition) {
        logger.debug(`Processing file changes: ${filePath}, position: ${lastPosition}`);
        await this.processFileFromPosition(filePath, lastPosition);
        this.lastFilePositions.set(filePath, currentSize);
      }
    } catch (error) {
      logger.error(`Error processing file changes for ${filePath}:`, error);
    }
  }

  async processFileFromPosition(filePath, startPosition) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { 
        start: startPosition,
        encoding: 'utf8'
      });
      
      let buffer = '';
      
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            this.processCSVLine(line);
          }
        }
      });
      
      stream.on('end', () => {
        if (buffer.trim()) {
          this.processCSVLine(buffer);
        }
        resolve();
      });
      
      stream.on('error', reject);
    });
  }

  processCSVLine(line) {
    const fields = line.split(',');
    if (fields.length >= 10) {
      const [mac, ssid, authmode, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, device_type] = fields;
      
      // Check if already processed (for real-time mode)
      if (this.analysisMode === 'realtime' && this.processedMacs.has(mac)) {
        return;
      }
      
      if (this.shouldProcessEntry({ MAC: mac, SSID: ssid })) {
        const cotXml = this.createCotXmlPayload(mac, ssid, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, authmode, device_type);
        this.sendTakMessage(cotXml);
        
        if (this.analysisMode === 'realtime') {
          this.processedMacs.add(mac);
        }
        
        this.emit('messageSent', { mac, ssid, rssi });
      }
    }
  }

  async processCsvFiles() {
    try {
      const csvFiles = await this.findCsvFiles(this.directory);
      
      for (const csvFile of csvFiles) {
        if (this.broadcasting) {
          await this.processCsvFile(csvFile);
        }
      }
    } catch (error) {
      logger.error('Error processing CSV files:', error);
    }
  }

  async findCsvFiles(directory) {
    try {
      const files = await fs.readdir(directory);
      return files
        .filter(file => file.endsWith('.wiglecsv'))
        .map(file => path.join(directory, file));
    } catch (error) {
      logger.error('Error finding CSV files:', error);
      return [];
    }
  }

  async processCsvFile(csvFile) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(csvFile)
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          if (this.shouldProcessEntry(data)) {
            results.push(data);
          }
        })
        .on('end', async () => {
          try {
            for (const entry of results) {
              if (this.broadcasting) {
                await this.sendTakMessage(entry);
              }
            }
            resolve(results.length);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          logger.error(`Error reading CSV file ${csvFile}:`, error);
          reject(error);
        });
    });
  }

  shouldProcessEntry(entry) {
    const ssid = entry.SSID || '';
    const mac = entry.MAC || '';
    
    // Apply whitelisting
    if (this.whitelistedSsids.size > 0 && !this.whitelistedSsids.has(ssid)) {
      return false;
    }
    
    if (this.whitelistedMacs.size > 0 && !this.whitelistedMacs.has(mac)) {
      return false;
    }

    // Apply blacklisting (in Python version, blacklisted items are still processed but with different styling)
    // For consistency, we'll process them but they can be styled differently
    
    // Avoid duplicates in post-collection mode
    if (this.analysisMode === 'postcollection') {
      const entryKey = `${mac}-${ssid}`;
      if (this.processedEntries.has(entryKey)) {
        return false;
      }
      this.processedEntries.add(entryKey);
    }

    return true;
  }

  async sendTakMessage(entry) {
    try {
      let cotXml;
      if (typeof entry === 'string') {
        // Direct XML string
        cotXml = entry;
      } else {
        // CSV entry object
        cotXml = this.createTakMessage(entry);
      }
      
      await this.broadcastUDP(cotXml);
      this.emit('messageSent', { entry, message: cotXml });
    } catch (error) {
      logger.error('Error sending TAK message:', error);
    }
  }

  createTakMessage(entry) {
    return this.createCotXmlPayload(
      entry.MAC || '',
      entry.SSID || '',
      entry.FirstSeen || '',
      entry.Channel || '',
      entry.RSSI || '',
      entry.CurrentLatitude || '',
      entry.CurrentLongitude || '',
      entry.AltitudeMeters || '',
      entry.AccuracyMeters || '',
      entry.AuthMode || '',
      entry.Type || ''
    );
  }

  createCotXmlPayload(mac, ssid, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, authmode, device_type) {
    // Calculate ellipse size based on RSSI and antenna sensitivity
    let majorAxis = 100;
    let minorAxis = 80;
    
    try {
      const rssiValue = Math.abs(parseFloat(rssi));
      
      // Apply antenna sensitivity adjustment
      const sensitivityFactor = this.antennaSensitivity === 'custom' 
        ? this.customSensitivityFactor 
        : this.sensitivityFactors[this.antennaSensitivity] || 1.0;
      
      // Adjust RSSI based on antenna sensitivity
      const adjustedRssi = rssiValue / sensitivityFactor;
      
      // Calculate ellipse size
      majorAxis = Math.min(Math.max(20, adjustedRssi * 2), 500);
      minorAxis = majorAxis * 0.8;
      
      // Use accuracy meters if available
      if (accuracymeters && parseFloat(accuracymeters) > 0) {
        majorAxis = Math.max(majorAxis, parseFloat(accuracymeters) * 2);
      }
    } catch (error) {
      logger.debug('Error calculating ellipse size, using defaults:', error);
    }

    // Include antenna sensitivity in remarks
    const remarks = `Channel: ${channel}, RSSI: ${rssi}, AltitudeMeters: ${altitudemeters}, AccuracyMeters: ${accuracymeters}, Authentication: ${authmode}, Device: ${device_type}, MAC: ${mac}, Antenna: ${this.antennaSensitivity}`;
    
    // Use SSID as UID if available, otherwise use MAC
    const uid = (ssid && ssid.trim()) ? ssid : mac;
    
    // Generate random angle for realistic visualization
    const angle = Math.random() * 180;
    
    // Format current time for CoT message
    const currentTime = new Date();
    const timeStr = currentTime.toISOString();
    const startTime = timeStr;
    const staleTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    // Get color from blacklist or use default
    const colorArgb = this.blacklistedSsids.get(ssid) || this.blacklistedMacs.get(mac) || "-65281";
    
    // Convert color for styling
    let lineColor = "ff99ffff";
    let polyColor = "4c99ffff";
    
    try {
      let colorInt = parseInt(colorArgb);
      if (colorInt < 0) {
        colorInt = colorInt >>> 0; // Convert to unsigned 32-bit
      }
      const colorHex = colorInt.toString(16).padStart(8, '0');
      
      const alpha = colorHex.substring(0, 2);
      const red = colorHex.substring(2, 4);
      const green = colorHex.substring(4, 6);
      const blue = colorHex.substring(6, 8);
      
      lineColor = `${alpha}${blue}${green}${red}`;
      polyColor = `4c${blue}${green}${red}`;
    } catch (error) {
      logger.debug('Error parsing color, using defaults:', error);
    }
    
    const styleUid = `${uid}.Style`;
    
    return `<?xml version="1.0" encoding="UTF-8"?><event access="Undefined" how="h-e" stale="${staleTime}" start="${startTime}" time="${timeStr}" type="u-d-c-e" uid="${uid}" version="2.0">
    <point ce="9999999.0" hae="${altitudemeters}" lat="${currentlatitude}" le="9999999.0" lon="${currentlongitude}"/>
    <detail>
        <shape>
            <ellipse angle="${angle}" major="${majorAxis}" minor="${minorAxis}"/>
            <link relation="p-c" type="b-x-KmlStyle" uid="${styleUid}">
                <Style>
                    <LineStyle>
                        <color>${lineColor}</color>
                        <width>0.01</width>
                    </LineStyle>
                    <PolyStyle>
                        <color>${polyColor}</color>
                    </PolyStyle>
                </Style>
            </link>
        </shape>
        <__shapeExtras cpvis="true" editable="true"/>
        <labels_on value="false"/>
        <remarks>${remarks}</remarks>
        <archive/>
        <color value="${colorArgb}"/>
        <strokeColor value="${colorArgb}"/>
        <strokeWeight value="0.01"/>
        <strokeStyle value="solid"/>
        <fillColor value="1285160959"/>
        <contact callsign="${uid}"/>
    </detail>
</event>`;
  }

  async broadcastUDP(message) {
    return new Promise((resolve, reject) => {
      if (!this.udpSocket) {
        this.initializeUDPSocket();
      }
      
      const buffer = Buffer.from(message, 'utf8');
      
      // Send to multicast if enabled
      if (this.takMulticastState) {
        this.udpSocket.send(buffer, this.takServerPort, this.multicastGroup, (error) => {
          if (error) {
            logger.error('Error sending multicast:', error);
          }
        });
      }
      
      // Send to specific server if configured
      if (this.takServerIp && this.takServerIp !== '0.0.0.0') {
        this.udpSocket.send(buffer, this.takServerPort, this.takServerIp, (error) => {
          if (error) {
            logger.error('Error sending to TAK server:', error);
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Configuration methods
  updateTakSettings(ip, port) {
    if (ip) this.takServerIp = ip;
    if (port) this.takServerPort = parseInt(port);
    logger.info(`TAK settings updated - IP: ${this.takServerIp}, Port: ${this.takServerPort}`);
  }

  updateMulticastState(enabled) {
    this.takMulticastState = Boolean(enabled);
    logger.info(`TAK multicast state updated: ${this.takMulticastState}`);
  }

  updateAnalysisMode(mode) {
    if (['realtime', 'postcollection'].includes(mode)) {
      this.analysisMode = mode;
      logger.info(`Analysis mode updated: ${this.analysisMode}`);
      return true;
    }
    return false;
  }

  updateAntennaSensitivity(sensitivity, customFactor = null) {
    if (this.sensitivityFactors.hasOwnProperty(sensitivity)) {
      this.antennaSensitivity = sensitivity;
      if (sensitivity === 'custom' && customFactor) {
        this.customSensitivityFactor = parseFloat(customFactor);
      }
      logger.info(`Antenna sensitivity updated: ${this.antennaSensitivity}`);
      return true;
    }
    return false;
  }

  // Filtering methods
  addToWhitelist(ssid = null, mac = null) {
    if (ssid) {
      this.whitelistedSsids.add(ssid);
      logger.info(`Added SSID to whitelist: ${ssid}`);
      return true;
    }
    if (mac) {
      this.whitelistedMacs.add(mac);
      logger.info(`Added MAC to whitelist: ${mac}`);
      return true;
    }
    return false;
  }

  removeFromWhitelist(ssid = null, mac = null) {
    if (ssid && this.whitelistedSsids.has(ssid)) {
      this.whitelistedSsids.delete(ssid);
      logger.info(`Removed SSID from whitelist: ${ssid}`);
      return true;
    }
    if (mac && this.whitelistedMacs.has(mac)) {
      this.whitelistedMacs.delete(mac);
      logger.info(`Removed MAC from whitelist: ${mac}`);
      return true;
    }
    return false;
  }

  addToBlacklist(ssid = null, mac = null, argbValue = '-65281') {
    if (ssid) {
      this.blacklistedSsids.set(ssid, argbValue);
      logger.info(`Added SSID to blacklist: ${ssid} with color ${argbValue}`);
      return true;
    }
    if (mac) {
      this.blacklistedMacs.set(mac, argbValue);
      logger.info(`Added MAC to blacklist: ${mac} with color ${argbValue}`);
      return true;
    }
    return false;
  }

  removeFromBlacklist(ssid = null, mac = null) {
    if (ssid && this.blacklistedSsids.has(ssid)) {
      this.blacklistedSsids.delete(ssid);
      logger.info(`Removed SSID from blacklist: ${ssid}`);
      return true;
    }
    if (mac && this.blacklistedMacs.has(mac)) {
      this.blacklistedMacs.delete(mac);
      logger.info(`Removed MAC from blacklist: ${mac}`);
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      broadcasting: this.broadcasting,
      takServerIp: this.takServerIp,
      takServerPort: this.takServerPort,
      analysisMode: this.analysisMode,
      antennaSensitivity: this.antennaSensitivity,
      whitelistedSsids: Array.from(this.whitelistedSsids),
      whitelistedMacs: Array.from(this.whitelistedMacs),
      blacklistedSsids: Array.from(this.blacklistedSsids.keys()),
      blacklistedMacs: Array.from(this.blacklistedMacs.keys()),
      takMulticastState: this.takMulticastState,
      directory: this.directory,
      processedMacs: this.processedMacs.size,
      processedEntries: this.processedEntries.size
    };
  }

  getAntennaSettings() {
    return {
      current_sensitivity: this.antennaSensitivity,
      available_types: Object.keys(this.sensitivityFactors),
      custom_factor: this.customSensitivityFactor,
      sensitivity_factors: this.sensitivityFactors
    };
  }
}

module.exports = WigleToTAK;