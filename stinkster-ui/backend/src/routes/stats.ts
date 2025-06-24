/**
 * Statistics API Routes
 */

import { Router, Request, Response } from 'express';
import type { DeviceManager } from '../services/deviceManager.js';
import type { ApiResponse } from '../types/index.js';
import winston from 'winston';

export function createStatsRouter(deviceManager: DeviceManager, logger: winston.Logger): Router {
  const router = Router();

  /**
   * GET /api/stats
   * Get overall statistics
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const stats = deviceManager.getStats();
      const response: ApiResponse = {
        success: true,
        data: {
          ...stats,
          takMessagesCount: 0 // TODO: Track TAK messages in production
        },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get statistics',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/stats/manufacturers
   * Get manufacturer distribution statistics
   */
  router.get('/manufacturers', (req: Request, res: Response) => {
    try {
      const stats = deviceManager.getManufacturerStats();
      const response: ApiResponse = {
        success: true,
        data: stats,
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting manufacturer stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get manufacturer statistics',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/stats/signals
   * Get signal strength distribution
   */
  router.get('/signals', (req: Request, res: Response) => {
    try {
      const stats = deviceManager.getSignalDistribution();
      const response: ApiResponse = {
        success: true,
        data: stats.map(s => ({
          range: s.range,
          count: s.count,
          minDbm: s.minDbm,
          maxDbm: s.maxDbm
        })),
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting signal stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get signal statistics',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/stats/timeline
   * Get activity timeline
   */
  router.get('/timeline', (req: Request, res: Response) => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      
      if (hours < 1 || hours > 168) {
        const response: ApiResponse = {
          success: false,
          error: 'Hours must be between 1 and 168',
          timestamp: Date.now()
        };
        return res.status(400).json(response);
      }

      const timeline = deviceManager.getActivityTimeline(hours);
      const response: ApiResponse = {
        success: true,
        data: timeline,
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting timeline:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get activity timeline',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/stats/channels
   * Get channel usage statistics
   */
  router.get('/channels', (req: Request, res: Response) => {
    try {
      const devices = deviceManager.exportDevices();
      const channelCounts = new Map<number, number>();
      
      devices.forEach(device => {
        if (device.channel) {
          channelCounts.set(device.channel, (channelCounts.get(device.channel) || 0) + 1);
        }
      });

      const channels = Array.from(channelCounts.entries())
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => a.channel - b.channel);

      const response: ApiResponse = {
        success: true,
        data: channels,
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting channel stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get channel statistics',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/stats/encryption
   * Get encryption type statistics
   */
  router.get('/encryption', (req: Request, res: Response) => {
    try {
      const devices = deviceManager.exportDevices();
      const encryptionCounts = new Map<string, number>();
      
      devices.forEach(device => {
        const encryption = device.encryption || 'Unknown';
        encryptionCounts.set(encryption, (encryptionCounts.get(encryption) || 0) + 1);
      });

      const total = devices.length;
      const encryption = Array.from(encryptionCounts.entries())
        .map(([type, count]) => ({
          type,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      const response: ApiResponse = {
        success: true,
        data: encryption,
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting encryption stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get encryption statistics',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/stats/summary
   * Get comprehensive summary statistics
   */
  router.get('/summary', (req: Request, res: Response) => {
    try {
      const basic = deviceManager.getStats();
      const manufacturers = deviceManager.getManufacturerStats();
      const signals = deviceManager.getSignalDistribution();
      const timeline = deviceManager.getActivityTimeline(24);

      const response: ApiResponse = {
        success: true,
        data: {
          basic,
          topManufacturers: manufacturers.slice(0, 5),
          signalDistribution: signals,
          recentActivity: timeline.slice(-6) // Last 6 hours
        },
        timestamp: Date.now()
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting summary stats:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get summary statistics',
        timestamp: Date.now()
      };
      res.status(500).json(response);
    }
  });

  return router;
}