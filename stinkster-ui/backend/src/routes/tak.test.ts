/**
 * TAK API Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app, server, takBroadcaster, wigleCore, deviceManager } from '../server.js';
import type { WifiDevice, TAKMessage } from '../types/index.js';

describe('TAK API Routes', () => {
  beforeEach(() => {
    // Clear any existing state
    deviceManager.clearDevices();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Disconnect TAK if connected
    takBroadcaster.disconnect();
  });

  describe('GET /api/tak/config', () => {
    it('should return TAK configuration', async () => {
      const response = await request(app)
        .get('/api/tak/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('takServer');
      expect(response.body.data).toHaveProperty('antenna');
      expect(response.body.data).toHaveProperty('scan');
      expect(response.body.data).toHaveProperty('callsign');
    });
  });

  describe('POST /api/tak/config', () => {
    it('should update TAK configuration', async () => {
      const newConfig = {
        callsign: 'TEST-CALLSIGN',
        team: 'Red',
        antenna: {
          height: 5,
          gain: 3.0
        }
      };

      const response = await request(app)
        .post('/api/tak/config')
        .send(newConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.callsign).toBe('TEST-CALLSIGN');
      expect(response.body.data.team).toBe('Red');
      expect(response.body.data.antenna.height).toBe(5);
    });
  });

  describe('GET /api/tak/status', () => {
    it('should return TAK server status', async () => {
      const response = await request(app)
        .get('/api/tak/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('connected');
      expect(response.body.data).toHaveProperty('protocol');
      expect(response.body.data).toHaveProperty('server');
      expect(response.body.data).toHaveProperty('port');
      expect(response.body.data).toHaveProperty('messagesSent');
      expect(response.body.data).toHaveProperty('lastHeartbeat');
    });
  });

  describe('POST /api/tak/connect', () => {
    it('should connect to TAK server', async () => {
      // Mock successful connection
      vi.spyOn(takBroadcaster, 'connect').mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tak/connect')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Mock connection failure
      vi.spyOn(takBroadcaster, 'connect').mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .post('/api/tak/connect')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to connect to TAK server');
    });
  });

  describe('POST /api/tak/disconnect', () => {
    it('should disconnect from TAK server', async () => {
      const response = await request(app)
        .post('/api/tak/disconnect')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(false);
    });
  });

  describe('POST /api/tak/send', () => {
    it('should send TAK message', async () => {
      const takMessage: TAKMessage = {
        uid: 'TEST-UID',
        type: 'a-f-G-U-C',
        how: 'm-g',
        time: new Date().toISOString(),
        start: new Date().toISOString(),
        stale: new Date(Date.now() + 300000).toISOString(),
        point: {
          lat: 40.7128,
          lon: -74.0060,
          hae: 10,
          ce: 5,
          le: 5
        },
        detail: {
          contact: { callsign: 'TEST' },
          uid: 'TEST-UID'
        }
      };

      // Mock successful send
      vi.spyOn(takBroadcaster, 'sendMessage').mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tak/send')
        .send(takMessage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sent).toBe(true);
    });

    it('should reject invalid TAK message', async () => {
      const invalidMessage = {
        uid: 'TEST-UID'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/tak/send')
        .send(invalidMessage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid TAK message format');
    });
  });

  describe('POST /api/tak/broadcast/device/:mac', () => {
    it('should broadcast specific device to TAK', async () => {
      const device: WifiDevice = {
        mac: '00:11:22:33:44:55',
        ssid: 'TestNetwork',
        type: 'AP',
        channel: 6,
        signal: -70,
        latitude: 40.7128,
        longitude: -74.0060,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };

      deviceManager.addDevice(device);

      // Mock successful send
      vi.spyOn(takBroadcaster, 'sendMessage').mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/tak/broadcast/device/${device.mac}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sent).toBe(true);
      expect(response.body.data.message).toHaveProperty('uid');
      expect(response.body.data.message.uid).toContain('WIGLE');
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .post('/api/tak/broadcast/device/00:00:00:00:00:00')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Device not found');
    });
  });

  describe('POST /api/tak/broadcast/devices', () => {
    it('should broadcast all devices to TAK', async () => {
      // Add test devices
      for (let i = 0; i < 3; i++) {
        deviceManager.addDevice({
          mac: `00:11:22:33:44:${i.toString().padStart(2, '0')}`,
          ssid: `TestNetwork${i}`,
          type: 'AP',
          channel: 6,
          signal: -70,
          latitude: 40.7128,
          longitude: -74.0060,
          firstSeen: Date.now(),
          lastSeen: Date.now()
        });
      }

      // Mock successful sends
      vi.spyOn(takBroadcaster, 'sendMessage').mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tak/broadcast/devices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sent).toBe(3);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.total).toBe(3);
    });
  });

  describe('GET /api/tak/messages', () => {
    it('should return TAK message history', async () => {
      const response = await request(app)
        .get('/api/tak/messages?limit=50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/tak/heartbeat', () => {
    it('should send heartbeat message', async () => {
      // Mock successful send
      vi.spyOn(takBroadcaster, 'sendMessage').mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tak/heartbeat')
        .send({ lat: 40.7128, lon: -74.0060, hae: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sent).toBe(true);
    });
  });
});