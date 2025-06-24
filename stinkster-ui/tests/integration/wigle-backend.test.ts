/**
 * WigleToTAK Backend Integration Test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WigleApiClient } from '../../lib/services/api/WigleApiClient';
import { WebSocketClient } from '../../lib/services/websocket/WebSocketClient';
import type { WifiDevice } from '../../lib/services/api/types';

describe('WigleToTAK Backend Integration', () => {
  let apiClient: WigleApiClient;
  let wsClient: WebSocketClient;
  const backendUrl = 'http://localhost:8001';
  const wsUrl = 'ws://localhost:8001';

  beforeAll(() => {
    apiClient = new WigleApiClient(backendUrl);
    wsClient = new WebSocketClient(wsUrl);
  });

  afterAll(async () => {
    if (wsClient.isConnected()) {
      await wsClient.disconnect();
    }
  });

  describe('API Endpoints', () => {
    it('should get TAK configuration', async () => {
      const response = await apiClient.getTAKConfig();
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('takServer');
      expect(response.data).toHaveProperty('antenna');
      expect(response.data).toHaveProperty('scan');
      expect(response.data?.callsign).toBe('WIGLE-TAK');
    });

    it('should get empty device list initially', async () => {
      const response = await apiClient.getDevices();
      
      expect(response.success).toBe(true);
      expect(response.data?.data).toEqual([]);
      expect(response.data?.total).toBe(0);
    });

    it('should get scan status', async () => {
      const response = await apiClient.getScanStatus();
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('scanning');
      expect(response.data).toHaveProperty('settings');
      expect(response.data?.scanning).toBe(false);
    });

    it('should get statistics', async () => {
      const response = await apiClient.getStats();
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('totalDevices');
      expect(response.data).toHaveProperty('activeDevices');
      expect(response.data?.totalDevices).toBe(0);
    });

    it('should update scan settings', async () => {
      const newSettings = {
        scanInterval: 60,
        signalThreshold: -90
      };

      const response = await apiClient.updateScanSettings(newSettings);
      
      expect(response.success).toBe(true);
      expect(response.data?.scanInterval).toBe(60);
      expect(response.data?.signalThreshold).toBe(-90);
    });
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket server', async () => {
      await wsClient.connect();
      
      expect(wsClient.isConnected()).toBe(true);
    });

    it('should subscribe to device updates', async () => {
      await wsClient.connect();
      
      let messageReceived = false;
      const unsubscribe = wsClient.on('device:update', (data) => {
        messageReceived = true;
      });

      // Subscribe to devices topic
      wsClient.send('subscribe', ['devices']);

      // Wait a bit for any messages
      await new Promise(resolve => setTimeout(resolve, 100));

      unsubscribe();
      expect(wsClient.isConnected()).toBe(true);
    });
  });

  describe('End-to-End Flow', () => {
    it('should handle device lifecycle', async () => {
      // 1. Start with no devices
      let response = await apiClient.getDevices();
      expect(response.data?.total).toBe(0);

      // 2. Get TAK status (should be disconnected)
      const takStatus = await apiClient.getTAKStatus();
      expect(takStatus.data?.connected).toBe(false);

      // 3. Update TAK configuration
      const config = await apiClient.updateTAKConfig({
        callsign: 'TEST-USER',
        team: 'Red'
      });
      expect(config.data?.callsign).toBe('TEST-USER');
      expect(config.data?.team).toBe('Red');

      // 4. Get manufacturer stats (should be empty)
      const manufacturers = await apiClient.getManufacturerStats();
      expect(manufacturers.data).toEqual([]);

      // 5. Get signal distribution (should have 0 counts)
      const signals = await apiClient.getSignalDistribution();
      expect(signals.data?.every(s => s.count === 0)).toBe(true);
    });
  });
});