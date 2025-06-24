/**
 * Import/Export API Routes
 */

import { Router, Request, Response } from 'express';
import type { DeviceManager } from '../services/deviceManager.js';
import type { ApiResponse, WifiDevice } from '../types/index.js';
import winston from 'winston';
import { parse } from 'csv-parse';
import multer from 'multer';
import { Readable } from 'stream';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files only
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export function createImportExportRouter(deviceManager: DeviceManager, logger: winston.Logger): Router {
  const router = Router();

  /**
   * POST /api/import/wigle
   * Import devices from Wigle CSV format
   */
  router.post('/wigle', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        const response: ApiResponse = {
          success: false,
          error: 'No file uploaded',
          timestamp: Date.now()
        };
        return res.status(400).json(response);
      }

      const results = await parseWigleCSV(req.file.buffer, logger);
      const importResult = deviceManager.importDevices(results.devices);

      const response: ApiResponse = {
        success: true,
        data: {
          imported: importResult.imported,
          updated: importResult.updated,
          skipped: results.skipped,
          errors: results.errors,
          total: results.total
        },
        timestamp: Date.now()
      };

      logger.info(`Imported ${importResult.imported} devices, updated ${importResult.updated}`);
      res.json(response);
    } catch (error) {
      logger.error('Error importing Wigle CSV:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to import CSV file',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/export/devices
   * Export devices in various formats
   */
  router.get('/devices', (req: Request, res: Response) => {
    try {
      const format = req.query.format as string || 'json';
      const devices = deviceManager.exportDevices();

      switch (format) {
        case 'csv':
          const csv = devicesToCSV(devices);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="devices.csv"');
          res.send(csv);
          break;

        case 'kml':
          const kml = devicesToKML(devices);
          res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
          res.setHeader('Content-Disposition', 'attachment; filename="devices.kml"');
          res.send(kml);
          break;

        case 'json':
        default:
          const response: ApiResponse = {
            success: true,
            data: devices,
            timestamp: Date.now()
          };
          res.json(response);
          break;
      }
    } catch (error) {
      logger.error('Error exporting devices:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to export devices',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/export/tak
   * Export TAK messages
   */
  router.get('/tak', (req: Request, res: Response) => {
    try {
      const format = req.query.format as string || 'xml';
      const limit = parseInt(req.query.limit as string) || 1000;

      // TODO: Implement TAK message history storage and retrieval
      const response: ApiResponse = {
        success: true,
        data: [],
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error exporting TAK messages:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to export TAK messages',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  return router;
}

/**
 * Parse Wigle CSV format
 */
async function parseWigleCSV(
  buffer: Buffer,
  logger: winston.Logger
): Promise<{
  devices: WifiDevice[];
  skipped: number;
  errors: string[];
  total: number;
}> {
  return new Promise((resolve, reject) => {
    const devices: WifiDevice[] = [];
    const errors: string[] = [];
    let skipped = 0;
    let total = 0;
    let headersParsed = false;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      skip_records_with_error: true
    });

    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        total++;
        try {
          // Skip the WigleWifi header rows
          if (record.MAC && record.MAC.includes('WigleWifi')) {
            skipped++;
            continue;
          }

          // Parse device from CSV record
          const device = parseWigleRecord(record);
          if (device) {
            devices.push(device);
          } else {
            skipped++;
          }
        } catch (error) {
          errors.push(`Row ${total}: ${error instanceof Error ? error.message : String(error)}`);
          skipped++;
        }
      }
    });

    parser.on('error', (err) => {
      logger.error('CSV parse error:', err);
      reject(err);
    });

    parser.on('end', () => {
      resolve({ devices, skipped, errors, total });
    });

    // Create readable stream from buffer and pipe to parser
    const stream = Readable.from(buffer);
    stream.pipe(parser);
  });
}

/**
 * Parse a single Wigle CSV record
 */
function parseWigleRecord(record: any): WifiDevice | null {
  try {
    // Standard Wigle CSV columns
    const mac = record.MAC || record.BSSID;
    if (!mac || !isValidMAC(mac)) {
      return null;
    }

    const channel = parseInt(record.Channel) || 0;
    const device: WifiDevice = {
      mac: mac.toUpperCase(),
      ssid: record.SSID || '',
      type: record.Type === 'BT' ? 'Client' : 'AP', // Simplified type detection
      channel: channel,
      frequency: channel > 0 ? 2412 + (channel - 1) * 5 : 0, // 2.4GHz band calculation
      signal: parseInt(record.RSSI) || -100,
      latitude: parseFloat(record.CurrentLatitude || record.Latitude) || 0,
      longitude: parseFloat(record.CurrentLongitude || record.Longitude) || 0,
      altitude: parseFloat(record.AltitudeMeters || record.Altitude) || 0,
      accuracy: parseFloat(record.AccuracyMeters || record.Accuracy) || 10,
      firstSeen: parseWigleDate(record.FirstSeen) || Date.now(),
      lastSeen: parseWigleDate(record.LastSeen) || Date.now(),
      manufacturer: getManufacturerFromMAC(mac),
      encryption: record.AuthMode || 'Unknown',
      packets: parseInt(record.Packets) || 0
    };

    return device;
  } catch (error) {
    return null;
  }
}

/**
 * Validate MAC address format
 */
function isValidMAC(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Parse Wigle date format (YYYY-MM-DD HH:MM:SS)
 */
function parseWigleDate(dateStr: string): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.getTime();
}

/**
 * Get manufacturer from MAC address OUI
 */
function getManufacturerFromMAC(mac: string): string {
  // Simple OUI lookup - in production, use a proper OUI database
  const oui = mac.substring(0, 8).toUpperCase();
  const manufacturers: Record<string, string> = {
    '00:50:F2': 'Microsoft',
    '00:1B:63': 'Apple',
    '00:1E:C2': 'Apple',
    '00:21:E9': 'Apple',
    '00:23:12': 'Apple',
    '00:23:32': 'Apple',
    '00:23:6C': 'Apple',
    '00:23:DF': 'Apple',
    '00:24:36': 'Apple',
    '00:25:00': 'Apple',
    '00:25:4B': 'Apple',
    '00:25:BC': 'Apple',
    '00:26:08': 'Apple',
    '00:26:4A': 'Apple',
    '00:26:B0': 'Apple',
    '00:26:BB': 'Apple',
    'AC:BC:32': 'Apple',
    // Add more OUI mappings as needed
  };

  return manufacturers[oui] || 'Unknown';
}

/**
 * Convert devices to CSV format
 */
function devicesToCSV(devices: WifiDevice[]): string {
  const headers = [
    'MAC', 'SSID', 'Type', 'Channel', 'RSSI', 'Latitude', 'Longitude',
    'Altitude', 'Accuracy', 'FirstSeen', 'LastSeen', 'Manufacturer',
    'Encryption', 'Packets'
  ];

  const rows = devices.map(device => [
    device.mac,
    device.ssid,
    device.type,
    device.channel,
    device.signal,
    device.latitude,
    device.longitude,
    device.altitude || 0,
    device.accuracy || 10,
    new Date(device.firstSeen).toISOString(),
    new Date(device.lastSeen).toISOString(),
    device.manufacturer || 'Unknown',
    device.encryption || 'Unknown',
    device.packets || 0
  ]);

  const csv = [headers.join(',')];
  rows.forEach(row => {
    csv.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  });

  return csv.join('\n');
}

/**
 * Convert devices to KML format
 */
function devicesToKML(devices: WifiDevice[]): string {
  const placemarks = devices.map(device => {
    const name = device.ssid || device.mac;
    const description = [
      `MAC: ${device.mac}`,
      `Type: ${device.type}`,
      `Signal: ${device.signal} dBm`,
      `Channel: ${device.channel}`,
      `Manufacturer: ${device.manufacturer || 'Unknown'}`,
      `Last Seen: ${new Date(device.lastSeen).toLocaleString()}`
    ].join('\n');

    return `
    <Placemark>
      <name>${escapeXML(name)}</name>
      <description>${escapeXML(description)}</description>
      <Point>
        <coordinates>${device.longitude},${device.latitude},${device.altitude || 0}</coordinates>
      </Point>
      <Style>
        <IconStyle>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/paddle/${device.type === 'AP' ? 'blu' : 'grn'}-circle.png</href>
          </Icon>
        </IconStyle>
      </Style>
    </Placemark>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>WiFi Devices Export</name>
    <description>Exported from WigleToTAK</description>${placemarks}
  </Document>
</kml>`;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}