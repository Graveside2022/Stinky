/**
 * Device API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { DeviceManager } from '../services/deviceManager.js';
import type { WifiDevice, DeviceFilter, PaginatedRequest, ApiResponse } from '../types/index.js';
import winston from 'winston';

export function createDeviceRouter(deviceManager: DeviceManager, logger: winston.Logger): Router {
  const router = Router();

  /**
   * GET /api/devices
   * Get devices with filtering and pagination
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const filter: DeviceFilter = {
        type: req.query.type as any,
        manufacturer: req.query.manufacturer as string,
        minSignal: req.query.minSignal ? parseInt(req.query.minSignal as string) : undefined,
        maxSignal: req.query.maxSignal ? parseInt(req.query.maxSignal as string) : undefined,
        ssid: req.query.ssid as string,
        seen: req.query.seen as any
      };

      const pagination: PaginatedRequest = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        sort: req.query.sort as string,
        order: req.query.order as any
      };

      const result = deviceManager.getDevices(filter, pagination);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting devices:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get devices',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/devices/:mac
   * Get a specific device
   */
  router.get('/:mac', (req: Request, res: Response) => {
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

      const response: ApiResponse<WifiDevice> = {
        success: true,
        data: device,
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting device:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get device',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/devices/:mac/history
   * Get device history
   */
  router.get('/:mac/history', (req: Request, res: Response) => {
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
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const history = deviceManager.getDeviceHistory(mac, hours);

      const response: ApiResponse = {
        success: true,
        data: history,
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting device history:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get device history',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * PATCH /api/devices/:mac
   * Update a device
   */
  router.patch('/:mac', (req: Request, res: Response) => {
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
      const updates = req.body as Partial<WifiDevice>;
      const device = deviceManager.updateDevice(mac, updates);

      if (!device) {
        const response: ApiResponse = {
          success: false,
          error: 'Device not found',
          timestamp: Date.now()
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<WifiDevice> = {
        success: true,
        data: device,
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating device:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update device',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * DELETE /api/devices/:mac
   * Delete a device
   */
  router.delete('/:mac', (req: Request, res: Response) => {
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
      const deleted = deviceManager.deleteDevice(mac);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: 'Device not found',
          timestamp: Date.now()
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error deleting device:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete device',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/devices/clear
   * Clear devices with optional filter
   */
  router.post('/clear', (req: Request, res: Response) => {
    try {
      const filter = req.body as DeviceFilter | undefined;
      const deleted = deviceManager.clearDevices(filter);

      const response: ApiResponse<{ deleted: number }> = {
        success: true,
        data: { deleted },
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      logger.error('Error clearing devices:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to clear devices',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  return router;
}