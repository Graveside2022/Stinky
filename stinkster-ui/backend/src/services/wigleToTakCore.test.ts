/**
 * WigleToTakCore Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WigleToTakCore } from './wigleToTakCore.js';
import type { WifiDevice, WigleConfig } from '../types/index.js';

describe('WigleToTakCore', () => {
  let core: WigleToTakCore;
  let config: WigleConfig;

  beforeEach(() => {
    config = {
      takServer: {
        host: '239.2.3.1',
        port: 6969,
        multicast: true,
        protocol: 'UDP',
        secure: false
      },
      antenna: {
        height: 2,
        gain: 2.15,
        pattern: 'omnidirectional',
        sensitivity: 'standard'
      },
      scan: {
        scanInterval: 30,
        signalThreshold: -95,
        maxAge: 300,
        channels: [1, 6, 11],
        ignoreBSSIDs: [],
        analysisMode: 'realtime'
      },
      callsign: 'TEST-TAK',
      team: 'Blue',
      role: 'Test'
    };

    core = new WigleToTakCore(config);
  });

  describe('deviceToTAK', () => {
    it('should convert WiFi device to TAK message', () => {
      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'TestNetwork',
        type: 'AP',
        channel: 6,
        frequency: 2437,
        signal: -70,
        firstSeen: Date.now() - 3600000,
        lastSeen: Date.now(),
        latitude: 40.7128,
        longitude: -74.0060,
        manufacturer: 'TestCorp'
      };

      const takMessage = core.deviceToTAK(device);

      expect(takMessage).toBeDefined();
      expect(takMessage.uid).toBe('WIGLE-AABBCCDDEEFF');
      expect(takMessage.type).toBe('a-f-G-U-C-I');
      expect(takMessage.how).toBe('m-g');
      expect(takMessage.point.lat).toBe(40.7128);
      expect(takMessage.point.lon).toBe(-74.0060);
      expect(takMessage.detail.contact?.callsign).toBe('TestNetwork');
    });

    it('should handle devices without location', () => {
      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'NoLocation',
        type: 'AP',
        channel: 1,
        frequency: 2412,
        signal: -80,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };

      const takMessage = core.deviceToTAK(device);

      expect(takMessage.point.lat).toBe(0);
      expect(takMessage.point.lon).toBe(0);
    });

    it('should apply antenna height to altitude', () => {
      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'TestAltitude',
        type: 'AP',
        channel: 11,
        frequency: 2462,
        signal: -65,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        altitude: 100
      };

      const takMessage = core.deviceToTAK(device);

      expect(takMessage.point.hae).toBe(102); // 100 + 2 (antenna height)
    });

    it('should compensate signal based on antenna sensitivity', () => {
      // Test with high gain antenna
      config.antenna.sensitivity = 'high_gain';
      core = new WigleToTakCore(config);

      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'HighGain',
        type: 'AP',
        channel: 6,
        frequency: 2437,
        signal: -70,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };

      const takMessage = core.deviceToTAK(device);
      
      // Signal should be compensated
      expect(takMessage.detail.signal).toBeDefined();
      expect(takMessage.detail.signal).not.toBe(-70);
      expect(takMessage.detail.signalRaw).toBe(-70);
    });
  });

  describe('takMessageToXML', () => {
    it('should convert TAK message to valid XML', () => {
      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'XMLTest',
        type: 'AP',
        channel: 6,
        frequency: 2437,
        signal: -75,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        latitude: 40.7128,
        longitude: -74.0060
      };

      const takMessage = core.deviceToTAK(device);
      const xml = core.takMessageToXML(takMessage);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<event');
      expect(xml).toContain('uid="WIGLE-AABBCCDDEEFF"');
      expect(xml).toContain('<point');
      expect(xml).toContain('lat="40.7128"');
      expect(xml).toContain('lon="-74.006"');
      expect(xml).toContain('<detail>');
      expect(xml).toContain('</event>');
    });

    it('should escape special XML characters', () => {
      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'Test & <Special> "Characters"',
        type: 'AP',
        channel: 1,
        frequency: 2412,
        signal: -80,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };

      const takMessage = core.deviceToTAK(device);
      const xml = core.takMessageToXML(takMessage);

      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&quot;');
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig: Partial<WigleConfig> = {
        callsign: 'NEW-CALLSIGN',
        antenna: {
          height: 5,
          gain: 3,
          pattern: 'directional',
          sensitivity: 'alfa_card'
        }
      };

      core.updateConfig(newConfig);
      const updatedConfig = core.getConfig();

      expect(updatedConfig.callsign).toBe('NEW-CALLSIGN');
      expect(updatedConfig.antenna.height).toBe(5);
      expect(updatedConfig.antenna.sensitivity).toBe('alfa_card');
    });

    it('should handle custom sensitivity factor', () => {
      config.antenna.sensitivity = 'custom';
      config.antenna.customSensitivityFactor = 1.8;
      core = new WigleToTakCore(config);

      const device: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'CustomSensitivity',
        type: 'AP',
        channel: 6,
        frequency: 2437,
        signal: -70,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };

      const takMessage = core.deviceToTAK(device);
      
      // Should use custom factor
      expect(takMessage.detail.signal).toBeDefined();
      expect(takMessage.detail.signalRaw).toBe(-70);
    });
  });
});