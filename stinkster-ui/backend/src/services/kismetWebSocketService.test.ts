/**
 * Tests for Kismet WebSocket Service
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { EventEmitter } from 'events';
import axios from 'axios';
import winston from 'winston';
import { KismetWebSocketService } from './kismetWebSocketService.js';
import { WebSocketHandler } from './websocketHandler.js';
import type { KismetDevice, KismetAlert, KismetSystemStatus } from './kismetWebSocketService.js';

// Mock axios
vi.mock('axios');

// Create mock logger
const createMockLogger = (): winston.Logger => {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn()
  } as any;
  
  // Make child return the same logger
  logger.child.mockReturnValue(logger);
  
  return logger;
};

// Create mock WebSocket handler
const createMockWsHandler = (): WebSocketHandler => ({
  emitDeviceUpdate: vi.fn(),
  emitScanStatus: vi.fn(),
  emitAlert: vi.fn(),
  emitTAKStatus: vi.fn(),
  emitTAKMessage: vi.fn(),
  emitError: vi.fn(),
  broadcast: vi.fn(),
  getClients: vi.fn(() => []),
  getRoomStats: vi.fn(() => ({})),
  disconnectClient: vi.fn(),
  shutdown: vi.fn(),
  getIO: vi.fn()
} as any);

describe('KismetWebSocketService', () => {
  let service: KismetWebSocketService;
  let mockWsHandler: WebSocketHandler;
  let mockLogger: winston.Logger;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockWsHandler = createMockWsHandler();
    mockLogger = createMockLogger();

    // Setup axios mock
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn()
    };
    (axios.create as Mock).mockReturnValue(mockAxiosInstance);

    service = new KismetWebSocketService(mockWsHandler, mockLogger);
  });

  afterEach(async () => {
    await service.stop();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start successfully when Kismet is available', async () => {
      // Mock successful connection test
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          'kismet.system.devices.count': 10,
          'kismet.system.packets.rate': 100
        }
      });

      await service.start();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system/status.json');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting Kismet WebSocket service');
      expect(mockLogger.info).toHaveBeenCalledWith('Kismet WebSocket service started successfully');
    });

    it('should throw error when Kismet is not available', async () => {
      // Mock failed connection
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(service.start()).rejects.toThrow('Cannot connect to Kismet API');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Kismet API:',
        expect.any(Error)
      );
    });
  });

  describe('device polling', () => {
    const mockDevices: KismetDevice[] = [
      {
        'kismet.device.base.key': 'device1',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.name': 'TestAP',
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.phyname': 'IEEE802.11',
        'kismet.device.base.frequency': 2412000000,
        'kismet.device.base.channel': '1',
        'kismet.device.base.signal': -50,
        'kismet.device.base.first_time': 1700000000,
        'kismet.device.base.last_time': 1700001000,
        'kismet.device.base.packets.total': 1000,
        'kismet.device.base.packets.data': 800,
        'kismet.device.base.packets.retry': 50,
        'kismet.device.base.location': {
          'kismet.common.location.lat': 40.7128,
          'kismet.common.location.lon': -74.0060,
          'kismet.common.location.alt': 10,
          'kismet.common.location.fix': 3
        },
        'dot11.device': {
          'dot11.device.ssid_len': 6,
          'dot11.device.ssid': 'TestAP',
          'dot11.device.bssid': 'AA:BB:CC:DD:EE:FF',
          'dot11.device.client_map': {},
          'dot11.device.responded_ssid_map': {},
          'dot11.device.beacon_info': 'WPA2'
        }
      }
    ];

    beforeEach(async () => {
      // Mock successful start
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockResolvedValue({ data: [] });
      await service.start();
      vi.clearAllMocks();
    });

    it('should emit new device event for first-time devices', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockDevices });

      // Trigger polling
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockWsHandler.emitDeviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          mac: 'AA:BB:CC:DD:EE:FF',
          ssid: 'TestAP',
          type: 'AP',
          signal: -50
        }),
        'new',
        undefined
      );
    });

    it('should emit update event for changed devices', async () => {
      // First poll - new device
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockDevices });
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      // Second poll - updated device
      const updatedDevices = [{
        ...mockDevices[0],
        'kismet.device.base.signal': -45,
        'kismet.device.base.packets.total': 1200
      }];
      mockAxiosInstance.post.mockResolvedValueOnce({ data: updatedDevices });
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockWsHandler.emitDeviceUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          mac: 'AA:BB:CC:DD:EE:FF',
          signal: -45
        }),
        'update',
        expect.objectContaining({
          signal: -45,
          packets: 1200
        })
      );
    });

    it('should emit remove event for disappeared devices', async () => {
      // First poll - device present
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockDevices });
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      // Second poll - device gone
      mockAxiosInstance.post.mockResolvedValueOnce({ data: [] });
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockWsHandler.emitDeviceUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          mac: 'AA:BB:CC:DD:EE:FF'
        }),
        'remove',
        undefined
      );
    });
  });

  describe('alert polling', () => {
    const mockAlerts: KismetAlert[] = [
      {
        'kismet.alert.timestamp': 1700002000,
        'kismet.alert.header': 'DEAUTH_FLOOD',
        'kismet.alert.class': 'DENIAL',
        'kismet.alert.severity': 15,
        'kismet.alert.text': 'Deauthentication flood detected',
        'kismet.alert.device_key': 'device1'
      }
    ];

    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockResolvedValue({ data: [] });
      await service.start();
      vi.clearAllMocks();
    });

    it('should emit alert events for new alerts', async () => {
      mockAxiosInstance.get.mockImplementation((url) => {
        if (url === '/alerts/last/10.json') {
          return Promise.resolve({ data: mockAlerts });
        }
        return Promise.resolve({ data: {} });
      });

      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockWsHandler.emitAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kismet',
          severity: 'high',
          message: 'Deauthentication flood detected',
          header: 'DEAUTH_FLOOD'
        })
      );
    });

    it('should not re-emit already processed alerts', async () => {
      mockAxiosInstance.get.mockImplementation((url) => {
        if (url === '/alerts/last/10.json') {
          return Promise.resolve({ data: mockAlerts });
        }
        return Promise.resolve({ data: {} });
      });

      // First poll
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      // Clear mock calls
      (mockWsHandler.emitAlert as Mock).mockClear();

      // Second poll with same alerts
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockWsHandler.emitAlert).not.toHaveBeenCalled();
    });
  });

  describe('system status polling', () => {
    const mockStatus: KismetSystemStatus = {
      'kismet.system.battery.percentage': 85,
      'kismet.system.battery.charging': 'false',
      'kismet.system.battery.ac': 0,
      'kismet.system.timestamp.start_sec': 1700000000,
      'kismet.system.timestamp.start_usec': 0,
      'kismet.system.devices.count': 25,
      'kismet.system.packets.rate': 150,
      'kismet.system.memory.rss': 1024000,
      'kismet.system.memory.virt': 2048000,
      'kismet.system.channels.channels': ['1', '6', '11']
    };

    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockResolvedValue({ data: [] });
      await service.start();
      vi.clearAllMocks();
    });

    it('should emit scan status events', async () => {
      mockAxiosInstance.get.mockImplementation((url) => {
        if (url === '/system/status.json') {
          return Promise.resolve({ data: mockStatus });
        }
        return Promise.resolve({ data: {} });
      });

      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockWsHandler.emitScanStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          scanning: true,
          devicesFound: 25,
          packetsProcessed: 150,
          currentChannel: 1
        })
      );
    });
  });

  describe('event throttling', () => {
    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockResolvedValue({ data: [] });
      await service.start();
      vi.clearAllMocks();
    });

    it('should throttle device update events', async () => {
      const device1: KismetDevice = {
        'kismet.device.base.key': 'device1',
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.signal': -50,
        'kismet.device.base.type': 'Wi-Fi AP',
        'kismet.device.base.phyname': 'IEEE802.11',
        'kismet.device.base.frequency': 2412000000,
        'kismet.device.base.channel': '1',
        'kismet.device.base.name': 'Test',
        'kismet.device.base.first_time': 1700000000,
        'kismet.device.base.last_time': 1700001000,
        'kismet.device.base.packets.total': 100,
        'kismet.device.base.packets.data': 80,
        'kismet.device.base.packets.retry': 5,
        'kismet.device.base.location': {},
        'dot11.device': {
          'dot11.device.ssid_len': 4,
          'dot11.device.ssid': 'Test',
          'dot11.device.bssid': 'AA:BB:CC:DD:EE:FF',
          'dot11.device.client_map': {},
          'dot11.device.responded_ssid_map': {},
          'dot11.device.beacon_info': ''
        }
      };

      // First poll - new device
      mockAxiosInstance.post.mockResolvedValueOnce({ data: [device1] });
      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      // Rapid updates
      for (let i = 0; i < 5; i++) {
        const updatedDevice = {
          ...device1,
          'kismet.device.base.signal': -50 + i
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: [updatedDevice] });
        vi.advanceTimersByTime(100); // Fast polling
        await vi.runAllTimersAsync();
      }

      // Should have throttled the updates
      const updateCalls = (mockWsHandler.emitDeviceUpdate as Mock).mock.calls
        .filter(call => call[1] === 'update');
      
      expect(updateCalls.length).toBeLessThan(5);
    });
  });

  describe('connection recovery', () => {
    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockResolvedValue({ data: [] });
      await service.start();
      vi.clearAllMocks();
    });

    it('should retry on connection failure', async () => {
      // Simulate connection failure
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Connection lost'));
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection lost'));

      vi.advanceTimersByTime(2000);
      await vi.runAllTimersAsync();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection error. Retry')
      );

      // Simulate successful reconnection
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      vi.advanceTimersByTime(5000); // Retry delay
      await vi.runAllTimersAsync();

      expect(mockLogger.info).toHaveBeenCalledWith('Reconnected to Kismet');
    });

    it('should stop service after max retries', async () => {
      const stopSpy = vi.spyOn(service, 'stop');
      
      // Simulate repeated failures
      for (let i = 0; i < 10; i++) {
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Connection lost'));
        mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection lost'));
        vi.advanceTimersByTime(2000);
        await vi.runAllTimersAsync();
        
        if (i < 5) {
          vi.advanceTimersByTime(5000 * Math.pow(2, i)); // Exponential backoff
          await vi.runAllTimersAsync();
        }
      }

      expect(stopSpy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Max connection retries reached. Stopping service.'
      );
    });
  });

  describe('event subscriptions', () => {
    it('should handle event subscriptions', () => {
      const callback = vi.fn();
      service.subscribe('device', callback);

      service.emit('device', { test: true });
      
      expect(callback).toHaveBeenCalledWith({ test: true });
    });

    it('should handle event unsubscriptions', () => {
      const callback = vi.fn();
      service.subscribe('device', callback);
      service.unsubscribe('device', callback);

      service.emit('device', { test: true });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return current connection status', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      await service.start();

      const status = service.getConnectionStatus();
      
      expect(status).toEqual({
        connected: true,
        retries: 0,
        deviceCount: 0,
        lastPoll: 0
      });
    });
  });

  describe('forceRefresh', () => {
    beforeEach(async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      mockAxiosInstance.post.mockResolvedValue({ data: [] });
      await service.start();
      vi.clearAllMocks();
    });

    it('should force refresh all data', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: [] });
      mockAxiosInstance.get.mockImplementation((url) => {
        if (url === '/alerts/last/10.json') {
          return Promise.resolve({ data: [] });
        }
        if (url === '/system/status.json') {
          return Promise.resolve({ data: {} });
        }
        return Promise.resolve({ data: {} });
      });

      await service.forceRefresh();

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alerts/last/10.json');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system/status.json');
    });
  });
});