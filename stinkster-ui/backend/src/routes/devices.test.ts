/**
 * Device API Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app, server, deviceManager } from '../server.js';
import type { WifiDevice } from '../types/index.js';

describe('Device API Routes', () => {
  const testDevice: WifiDevice = {
    mac: '00:11:22:33:44:55',
    ssid: 'TestNetwork',
    type: 'AP',
    channel: 6,
    signal: -70,
    latitude: 40.7128,
    longitude: -74.0060,
    altitude: 10,
    accuracy: 5,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    manufacturer: 'TestCorp',
    encryption: 'WPA2',
    packets: 100
  };

  beforeEach(() => {
    // Clear devices before each test
    deviceManager.clearDevices();
  });

  afterEach(() => {
    // Clean up
    deviceManager.clearDevices();
  });

  describe('GET /api/devices', () => {
    it('should return empty list when no devices', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return devices with pagination', async () => {
      // Add test devices
      for (let i = 0; i < 10; i++) {
        deviceManager.addDevice({
          ...testDevice,
          mac: `00:11:22:33:44:${i.toString().padStart(2, '0')}`,
          ssid: `TestNetwork${i}`
        });
      }

      const response = await request(app)
        .get('/api/devices?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(5);
      expect(response.body.data.total).toBe(10);
      expect(response.body.data.hasNext).toBe(true);
    });

    it('should filter devices by type', async () => {
      deviceManager.addDevice({ ...testDevice, type: 'AP' });
      deviceManager.addDevice({ ...testDevice, mac: '00:11:22:33:44:66', type: 'Client' });

      const response = await request(app)
        .get('/api/devices?type=AP')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].type).toBe('AP');
    });
  });

  describe('GET /api/devices/:mac', () => {
    it('should return specific device', async () => {
      deviceManager.addDevice(testDevice);

      const response = await request(app)
        .get(`/api/devices/${testDevice.mac}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mac).toBe(testDevice.mac);
      expect(response.body.data.ssid).toBe(testDevice.ssid);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/00:00:00:00:00:00')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Device not found');
    });
  });

  describe('PATCH /api/devices/:mac', () => {
    it('should update device properties', async () => {
      deviceManager.addDevice(testDevice);

      const updates = { ssid: 'UpdatedNetwork', signal: -80 };
      const response = await request(app)
        .patch(`/api/devices/${testDevice.mac}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ssid).toBe('UpdatedNetwork');
      expect(response.body.data.signal).toBe(-80);
      expect(response.body.data.mac).toBe(testDevice.mac); // MAC should not change
    });
  });

  describe('DELETE /api/devices/:mac', () => {
    it('should delete device', async () => {
      deviceManager.addDevice(testDevice);

      const response = await request(app)
        .delete(`/api/devices/${testDevice.mac}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);

      // Verify device is deleted
      const device = deviceManager.getDevice(testDevice.mac);
      expect(device).toBeUndefined();
    });
  });

  describe('POST /api/devices/clear', () => {
    it('should clear all devices', async () => {
      // Add multiple devices
      for (let i = 0; i < 5; i++) {
        deviceManager.addDevice({
          ...testDevice,
          mac: `00:11:22:33:44:${i.toString().padStart(2, '0')}`
        });
      }

      const response = await request(app)
        .post('/api/devices/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(5);
      expect(deviceManager.getStats().totalDevices).toBe(0);
    });

    it('should clear devices with filter', async () => {
      deviceManager.addDevice({ ...testDevice, type: 'AP' });
      deviceManager.addDevice({ ...testDevice, mac: '00:11:22:33:44:66', type: 'Client' });

      const response = await request(app)
        .post('/api/devices/clear')
        .send({ type: 'AP' })
        .expect(200);

      expect(response.body.data.deleted).toBe(1);
      expect(deviceManager.getStats().totalDevices).toBe(1);
    });
  });
});