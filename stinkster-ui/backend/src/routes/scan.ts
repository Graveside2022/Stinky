/**
 * Scan API Routes
 */

import { Router, Request, Response } from 'express';
import type { DeviceManager } from '../services/deviceManager.js';
import type { ApiResponse, ScanSettings } from '../types/index.js';
import winston from 'winston';

// In-memory scan state (in production, this would be managed by a separate service)
let scanState = {
  scanning: false,
  lastScan: 0,
  scanInterval: null as NodeJS.Timeout | null,
  settings: {
    scanInterval: 30,
    signalThreshold: -95,
    maxAge: 300,
    channels: [1, 6, 11],
    ignoreBSSIDs: [] as string[],
    analysisMode: 'realtime' as 'realtime' | 'postcollection'
  }
};

export function createScanRouter(deviceManager: DeviceManager, logger: winston.Logger): Router {
  const router = Router();

  /**
   * GET /api/scan/status
   * Get current scan status
   */
  router.get('/status', (req: Request, res: Response) => {
    const response: ApiResponse = {
      success: true,
      data: {
        scanning: scanState.scanning,
        settings: scanState.settings,
        lastScan: scanState.lastScan,
        devicesFound: deviceManager.getStats().totalDevices
      },
      timestamp: Date.now()
    };
    res.json(response);
  });

  /**
   * GET /api/scan/settings
   * Get scan settings
   */
  router.get('/settings', (req: Request, res: Response) => {
    const response: ApiResponse<ScanSettings> = {
      success: true,
      data: scanState.settings,
      timestamp: Date.now()
    };
    res.json(response);
  });

  /**
   * POST /api/scan/settings
   * Update scan settings
   */
  router.post('/settings', (req: Request, res: Response) => {
    try {
      const updates = req.body as Partial<ScanSettings>;
      
      // Validate settings
      if (updates.scanInterval !== undefined) {
        if (updates.scanInterval < 1 || updates.scanInterval > 3600) {
          const response: ApiResponse = {
            success: false,
            error: 'Scan interval must be between 1 and 3600 seconds',
            timestamp: Date.now()
          };
          return res.status(400).json(response);
        }
      }

      if (updates.signalThreshold !== undefined) {
        if (updates.signalThreshold < -100 || updates.signalThreshold > 0) {
          const response: ApiResponse = {
            success: false,
            error: 'Signal threshold must be between -100 and 0 dBm',
            timestamp: Date.now()
          };
          return res.status(400).json(response);
        }
      }

      if (updates.channels !== undefined) {
        const validChannels = updates.channels.every(ch => ch >= 1 && ch <= 14);
        if (!validChannels) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid WiFi channels. Must be between 1 and 14',
            timestamp: Date.now()
          };
          return res.status(400).json(response);
        }
      }

      // Update settings
      scanState.settings = {
        ...scanState.settings,
        ...updates
      } as ScanSettings;

      // If scanning, restart with new interval
      if (scanState.scanning && updates.scanInterval !== undefined) {
        restartScan(deviceManager, logger);
      }

      logger.info('Updated scan settings:', scanState.settings);

      const response: ApiResponse<ScanSettings> = {
        success: true,
        data: scanState.settings,
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error updating scan settings:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update scan settings',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/scan/start
   * Start scanning
   */
  router.post('/start', (req: Request, res: Response) => {
    try {
      if (scanState.scanning) {
        const response: ApiResponse = {
          success: false,
          error: 'Scan already in progress',
          timestamp: Date.now()
        };
        return res.status(400).json(response);
      }

      // Update settings if provided
      if (req.body && Object.keys(req.body).length > 0) {
        const updates = req.body as Partial<ScanSettings>;
        scanState.settings = {
          ...scanState.settings,
          ...updates
        };
      }

      startScan(deviceManager, logger);

      const response: ApiResponse<{ scanning: boolean }> = {
        success: true,
        data: { scanning: true },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error starting scan:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to start scan',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/scan/stop
   * Stop scanning
   */
  router.post('/stop', (req: Request, res: Response) => {
    try {
      if (!scanState.scanning) {
        const response: ApiResponse = {
          success: false,
          error: 'No scan in progress',
          timestamp: Date.now()
        };
        return res.status(400).json(response);
      }

      stopScan(logger);

      const response: ApiResponse<{ scanning: boolean }> = {
        success: true,
        data: { scanning: false },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error stopping scan:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to stop scan',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/scan/single
   * Perform a single scan
   */
  router.post('/single', async (req: Request, res: Response) => {
    try {
      // In a real implementation, this would trigger a scan from Kismet or similar
      logger.info('Performing single scan');
      
      // Simulate scan delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      scanState.lastScan = Date.now();

      const response: ApiResponse = {
        success: true,
        data: {
          scanned: true,
          devicesFound: deviceManager.getStats().totalDevices,
          timestamp: scanState.lastScan
        },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error performing single scan:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to perform scan',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  return router;
}

/**
 * Start continuous scanning
 */
function startScan(deviceManager: DeviceManager, logger: winston.Logger): void {
  scanState.scanning = true;
  logger.info(`Starting scan with interval: ${scanState.settings.scanInterval}s`);

  // Perform initial scan
  performScan(deviceManager, logger);

  // Set up interval for continuous scanning
  scanState.scanInterval = setInterval(() => {
    performScan(deviceManager, logger);
  }, scanState.settings.scanInterval * 1000);
}

/**
 * Stop scanning
 */
function stopScan(logger: winston.Logger): void {
  scanState.scanning = false;
  
  if (scanState.scanInterval) {
    clearInterval(scanState.scanInterval);
    scanState.scanInterval = null;
  }
  
  logger.info('Scanning stopped');
}

/**
 * Restart scanning with new settings
 */
function restartScan(deviceManager: DeviceManager, logger: winston.Logger): void {
  stopScan(logger);
  startScan(deviceManager, logger);
}

/**
 * Perform a scan
 * In production, this would interface with Kismet or similar scanning tools
 */
function performScan(deviceManager: DeviceManager, logger: winston.Logger): void {
  logger.debug('Performing scan...');
  scanState.lastScan = Date.now();
  
  // In a real implementation, this would:
  // 1. Query Kismet API for new devices
  // 2. Filter based on signal threshold and other settings
  // 3. Update device manager with new/updated devices
  // 4. Clean up old devices based on maxAge setting
  
  // Clean up old devices
  const maxAge = scanState.settings.maxAge * 1000; // Convert to milliseconds
  const cutoffTime = Date.now() - maxAge;
  const stats = deviceManager.getStats();
  
  logger.debug(`Scan complete. Total devices: ${stats.totalDevices}, Active: ${stats.activeDevices}`);
}