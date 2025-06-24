/**
 * TAK API Routes
 */

import { Router, Request, Response } from 'express';
import type { TAKBroadcaster } from '../services/takBroadcaster.js';
import type { WigleToTakCore } from '../services/wigleToTakCore.js';
import type { DeviceManager } from '../services/deviceManager.js';
import type { ApiResponse, TAKMessage, WigleConfig, TAKServerConfig, DeviceFilter } from '../types/index.js';
import winston from 'winston';

// Store TAK messages for history
const takMessageHistory: TAKMessage[] = [];
const MAX_HISTORY_SIZE = 1000;

export function createTAKRouter(
  takBroadcaster: TAKBroadcaster,
  wigleCore: WigleToTakCore,
  deviceManager: DeviceManager,
  logger: winston.Logger
): Router {
  const router = Router();

  /**
   * GET /api/tak/config
   * Get TAK configuration
   */
  router.get('/config', (req: Request, res: Response) => {
    const config = wigleCore.getConfig();
    const response: ApiResponse<WigleConfig> = {
      success: true,
      data: config,
      timestamp: Date.now()
    };
    res.json(response);
  });

  /**
   * POST /api/tak/config
   * Update TAK configuration
   */
  router.post('/config', async (req: Request, res: Response) => {
    try {
      const updates = req.body as Partial<WigleConfig>;
      
      // Update core configuration
      wigleCore.updateConfig(updates);
      
      // Update TAK server configuration if provided
      if (updates.takServer) {
        await takBroadcaster.updateConfig(updates.takServer);
      }
      
      const response: ApiResponse<WigleConfig> = {
        success: true,
        data: wigleCore.getConfig(),
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error updating TAK config:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update configuration',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/tak/status
   * Get TAK server connection status
   */
  router.get('/status', (req: Request, res: Response) => {
    const status = takBroadcaster.getStatus();
    const response: ApiResponse = {
      success: true,
      data: {
        ...status,
        lastHeartbeat: Date.now() // Add heartbeat timestamp
      },
      timestamp: Date.now()
    };
    res.json(response);
  });

  /**
   * POST /api/tak/connect
   * Connect to TAK server
   */
  router.post('/connect', async (req: Request, res: Response) => {
    try {
      await takBroadcaster.connect();
      const response: ApiResponse<{ connected: boolean }> = {
        success: true,
        data: { connected: true },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Failed to connect to TAK server:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to connect to TAK server',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/tak/disconnect
   * Disconnect from TAK server
   */
  router.post('/disconnect', (req: Request, res: Response) => {
    takBroadcaster.disconnect();
    const response: ApiResponse<{ connected: boolean }> = {
      success: true,
      data: { connected: false },
      timestamp: Date.now()
    };
    res.json(response);
  });

  /**
   * POST /api/tak/send
   * Send a TAK message
   */
  router.post('/send', async (req: Request, res: Response) => {
    try {
      const message = req.body as TAKMessage;
      
      // Validate message
      if (!message.uid || !message.type || !message.point) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid TAK message format',
          timestamp: Date.now()
        };
        return res.status(400).json(response);
      }

      // Send message
      await takBroadcaster.sendMessage(message, wigleCore);
      
      // Store in history
      addToHistory(message);
      
      const response: ApiResponse<{ sent: boolean }> = {
        success: true,
        data: { sent: true },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error sending TAK message:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to send TAK message',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/tak/messages
   * Get TAK message history
   */
  router.get('/messages', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const messages = takMessageHistory.slice(-limit);
    
    const response: ApiResponse<TAKMessage[]> = {
      success: true,
      data: messages,
      timestamp: Date.now()
    };
    res.json(response);
  });

  /**
   * POST /api/tak/broadcast/devices
   * Broadcast all devices to TAK
   */
  router.post('/broadcast/devices', async (req: Request, res: Response) => {
    try {
      const filter = req.body as DeviceFilter | undefined;
      const devices = deviceManager.exportDevices(filter);
      let sent = 0;
      let failed = 0;

      for (const device of devices) {
        try {
          const takMessage = wigleCore.deviceToTAK(device);
          await takBroadcaster.sendMessage(takMessage, wigleCore);
          addToHistory(takMessage);
          sent++;
        } catch (error) {
          logger.error(`Failed to send device ${device.mac}:`, error);
          failed++;
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          sent,
          failed,
          total: devices.length
        },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error broadcasting devices:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to broadcast devices',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/tak/broadcast/device/:mac
   * Broadcast a specific device to TAK
   */
  router.post('/broadcast/device/:mac', async (req: Request, res: Response) => {
    try {
      const { mac } = req.params;
      if (!mac) {
        const response: ApiResponse = {
          success: false,
          error: 'MAC address is required',
          timestamp: Date.now()
        };
        return res.status(400).json(response);
      }
      const device = deviceManager.getDevice(mac);
      
      if (!device) {
        const response: ApiResponse = {
          success: false,
          error: 'Device not found',
          timestamp: Date.now()
        };
        return res.status(404).json(response);
      }

      const takMessage = wigleCore.deviceToTAK(device);
      await takBroadcaster.sendMessage(takMessage, wigleCore);
      addToHistory(takMessage);

      const response: ApiResponse<{ sent: boolean; message: TAKMessage }> = {
        success: true,
        data: {
          sent: true,
          message: takMessage
        },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error broadcasting device:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to broadcast device',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/tak/heartbeat
   * Send TAK heartbeat/position update
   */
  router.post('/heartbeat', async (req: Request, res: Response) => {
    try {
      const config = wigleCore.getConfig();
      const heartbeat: TAKMessage = {
        uid: `${config.callsign}-HEARTBEAT`,
        type: 'a-f-G-U-C',
        how: 'm-g',
        time: new Date().toISOString(),
        start: new Date().toISOString(),
        stale: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        point: {
          lat: req.body.lat || 0,
          lon: req.body.lon || 0,
          hae: req.body.hae || 0,
          ce: 10,
          le: 10
        },
        detail: {
          contact: {
            callsign: config.callsign
          },
          uid: `${config.callsign}-HEARTBEAT`,
          remarks: `WigleToTAK Heartbeat - ${config.team} - ${config.role}`
        }
      };

      await takBroadcaster.sendMessage(heartbeat, wigleCore);
      
      const response: ApiResponse<{ sent: boolean }> = {
        success: true,
        data: { sent: true },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error sending heartbeat:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to send heartbeat',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  return router;
}

/**
 * Add message to history
 */
function addToHistory(message: TAKMessage): void {
  takMessageHistory.push(message);
  
  // Keep history size limited
  if (takMessageHistory.length > MAX_HISTORY_SIZE) {
    takMessageHistory.shift();
  }
}