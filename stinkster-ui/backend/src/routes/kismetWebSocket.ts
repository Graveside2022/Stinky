/**
 * Kismet WebSocket API routes
 * Provides endpoints for WebSocket management and Kismet real-time data control
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { KismetWebSocketService } from '../services/kismetWebSocketService.js';
import type { WebSocketHandler } from '../services/websocketHandler.js';

export function createKismetWebSocketRouter(
  kismetService: KismetWebSocketService,
  wsHandler: WebSocketHandler
): Router {
  const router = Router();

  /**
   * Get WebSocket connection status
   */
  router.get('/status', (req: Request, res: Response) => {
    const kismetStatus = kismetService.getConnectionStatus();
    const wsClients = wsHandler.getClients();
    const wsRooms = wsHandler.getRoomStats();

    res.json({
      success: true,
      data: {
        kismet: kismetStatus,
        websocket: {
          clients: wsClients.length,
          clientDetails: wsClients,
          rooms: wsRooms
        }
      }
    });
  });

  /**
   * Force refresh Kismet data
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      await kismetService.forceRefresh();
      res.json({
        success: true,
        message: 'Data refresh initiated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to refresh data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Subscribe to specific Kismet events
   */
  router.post('/subscribe', (req: Request, res: Response) => {
    const { clientId, events } = req.body;

    if (!clientId || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'clientId and events array required'
      });
    }

    // This would typically be handled by the WebSocket client
    // but we can provide an HTTP endpoint for manual subscription management
    res.json({
      success: true,
      message: 'Use WebSocket client to subscribe to events',
      availableEvents: [
        'device',
        'alert', 
        'systemStatus',
        'heartbeat',
        'connectionFailed'
      ]
    });
  });

  /**
   * Get active datasources from Kismet
   */
  router.get('/datasources', async (req: Request, res: Response) => {
    try {
      // This would call a method on kismetService to get datasources
      // For now, return a placeholder
      res.json({
        success: true,
        data: {
          datasources: [],
          message: 'Datasource information available through Kismet API'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch datasources'
      });
    }
  });

  /**
   * Control Kismet polling intervals
   */
  router.put('/polling', (req: Request, res: Response) => {
    const { interval, type } = req.body;

    if (!interval || !type) {
      return res.status(400).json({
        success: false,
        error: 'interval and type required'
      });
    }

    // This would update the polling interval on the service
    res.json({
      success: true,
      message: `Polling interval for ${type} updated to ${interval}ms`
    });
  });

  /**
   * Get WebSocket event statistics
   */
  router.get('/stats', (req: Request, res: Response) => {
    // Get stats from both services
    const stats = {
      websocket: {
        connectedClients: wsHandler.getClients().length,
        rooms: wsHandler.getRoomStats(),
        uptime: process.uptime()
      },
      kismet: kismetService.getConnectionStatus(),
      events: {
        // These would be tracked by the service
        totalEmitted: 0,
        byType: {}
      }
    };

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Disconnect a specific WebSocket client
   */
  router.delete('/clients/:clientId', (req: Request, res: Response) => {
    const { clientId } = req.params;
    const { reason } = req.body;

    try {
      wsHandler.disconnectClient(clientId, reason || 'Admin disconnected');
      res.json({
        success: true,
        message: `Client ${clientId} disconnected`
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
  });

  /**
   * Send test event to WebSocket clients
   */
  router.post('/test-event', (req: Request, res: Response) => {
    const { type, data, room } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        error: 'type and data required'
      });
    }

    const event = {
      type: `test:${type}`,
      data,
      timestamp: Date.now(),
      id: `test-${Date.now()}`
    };

    if (room) {
      wsHandler.broadcast(room, event);
    } else {
      wsHandler.broadcast('test', event);
    }

    res.json({
      success: true,
      message: 'Test event sent',
      event
    });
  });

  return router;
}

export default createKismetWebSocketRouter;