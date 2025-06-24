/**
 * WigleToTAK Core Service - TypeScript implementation
 * Converts WiFi device data to TAK messages
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  WifiDevice,
  TAKMessage,
  TAKPoint,
  TAKDetail,
  WigleConfig,
  AntennaConfig,
  SENSITIVITY_FACTORS
} from '../types/index.js';

export class WigleToTakCore {
  private config: WigleConfig;
  private sensitivityFactor: number;

  constructor(config: WigleConfig) {
    this.config = config;
    this.sensitivityFactor = this.calculateSensitivityFactor(config.antenna);
  }

  /**
   * Calculate antenna sensitivity factor for signal compensation
   */
  private calculateSensitivityFactor(antenna: AntennaConfig): number {
    if (antenna.sensitivity === 'custom' && antenna.customSensitivityFactor) {
      return antenna.customSensitivityFactor;
    }
    
    const factors: Record<string, number> = {
      standard: 1.0,
      alfa_card: 1.5,
      high_gain: 2.0,
      rpi_internal: 0.7
    };
    
    return factors[antenna.sensitivity] || 1.0;
  }

  /**
   * Convert WiFi device to TAK message
   */
  public deviceToTAK(device: WifiDevice): TAKMessage {
    const now = new Date();
    const staleTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    // Generate unique UID for the device
    const uid = `WIGLE-${device.mac.replace(/:/g, '')}`;

    // Determine device type and icon
    const { type, how } = this.getDeviceType(device);

    // Calculate position with antenna height
    const point: TAKPoint = {
      lat: device.latitude || 0,
      lon: device.longitude || 0,
      hae: (device.altitude || 0) + this.config.antenna.height,
      ce: device.accuracy || 10,
      le: device.accuracy || 10
    };

    // Build detail object
    const detail: TAKDetail = {
      contact: {
        callsign: device.ssid || device.mac
      },
      remarks: this.buildRemarks(device),
      color: this.getDeviceColor(device),
      strokeColor: this.getStrokeColor(device),
      strokeWeight: 2,
      uid: uid
    };

    // Add custom fields
    if (device.manufacturer) {
      detail.manufacturer = device.manufacturer;
    }
    
    if (device.signal) {
      detail.signal = this.compensateSignal(device.signal);
      detail.signalRaw = device.signal;
    }

    if (device.channel) {
      detail.channel = device.channel;
    }

    if (device.encryption) {
      detail.encryption = device.encryption;
    }

    const takMessage: TAKMessage = {
      uid: uid,
      type: type,
      how: how,
      time: now.toISOString(),
      start: now.toISOString(),
      stale: staleTime.toISOString(),
      point: point,
      detail: detail
    };

    return takMessage;
  }

  /**
   * Get device type and how for TAK
   */
  private getDeviceType(device: WifiDevice): { type: string; how: string } {
    let type = 'a-u-G'; // Unknown ground unit default
    let how = 'm-g'; // Machine generated

    if (device.type === 'AP') {
      type = 'a-f-G-U-C-I'; // Friendly ground unit communications infrastructure
    } else if (device.type === 'Client') {
      type = 'a-f-G-U-C'; // Friendly ground unit communications
    }

    // Add special markers for specific conditions
    if (device.signal && this.compensateSignal(device.signal) > -50) {
      type = 'a-h-G'; // Hostile ground (strong signal, potential threat)
    }

    return { type, how };
  }

  /**
   * Compensate signal strength based on antenna sensitivity
   */
  private compensateSignal(signal: number): number {
    // Apply sensitivity factor to normalize signal readings
    const compensated = signal + (10 * Math.log10(this.sensitivityFactor));
    return Math.round(compensated);
  }

  /**
   * Build remarks for device
   */
  private buildRemarks(device: WifiDevice): string {
    const parts: string[] = [];

    if (device.ssid) {
      parts.push(`SSID: ${device.ssid}`);
    }

    parts.push(`MAC: ${device.mac}`);

    if (device.manufacturer) {
      parts.push(`Manufacturer: ${device.manufacturer}`);
    }

    if (device.signal) {
      const compensated = this.compensateSignal(device.signal);
      parts.push(`Signal: ${compensated} dBm (raw: ${device.signal} dBm)`);
    }

    if (device.channel) {
      parts.push(`Channel: ${device.channel}`);
    }

    if (device.encryption) {
      parts.push(`Encryption: ${device.encryption}`);
    }

    const lastSeenDate = new Date(device.lastSeen);
    parts.push(`Last seen: ${lastSeenDate.toLocaleString()}`);

    if (device.packets) {
      parts.push(`Packets: ${device.packets}`);
    }

    return parts.join(' | ');
  }

  /**
   * Get device color based on signal strength
   */
  private getDeviceColor(device: WifiDevice): string {
    if (!device.signal) return 'Yellow';

    const signal = this.compensateSignal(device.signal);

    if (signal >= -50) return 'Red';      // Very strong
    if (signal >= -70) return 'Orange';   // Strong
    if (signal >= -85) return 'Yellow';   // Medium
    return 'Green';                       // Weak
  }

  /**
   * Get stroke color based on device type
   */
  private getStrokeColor(device: WifiDevice): string {
    if (device.type === 'AP') return 'Blue';
    if (device.type === 'Client') return 'Cyan';
    return 'Gray';
  }

  /**
   * Create TAK XML from message
   */
  public takMessageToXML(message: TAKMessage): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="${message.uid}" type="${message.type}" how="${message.how}" time="${message.time}" start="${message.start}" stale="${message.stale}">
  <point lat="${message.point.lat}" lon="${message.point.lon}" hae="${message.point.hae}" ce="${message.point.ce}" le="${message.point.le}"/>
  <detail>
    ${this.detailToXML(message.detail)}
  </detail>
</event>`;
    return xml;
  }

  /**
   * Convert detail object to XML
   */
  private detailToXML(detail: TAKDetail): string {
    const parts: string[] = [];

    if (detail.contact) {
      const attrs = Object.entries(detail.contact)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      parts.push(`<contact ${attrs}/>`);
    }

    if (detail.remarks) {
      parts.push(`<remarks>${this.escapeXML(detail.remarks)}</remarks>`);
    }

    if (detail.color || detail.strokeColor) {
      const colorAttrs: string[] = [];
      if (detail.color) colorAttrs.push(`argb="-1-${this.colorToHex(detail.color)}"`);
      if (detail.strokeColor) colorAttrs.push(`strokeColor="${this.colorToHex(detail.strokeColor)}"`);
      if (detail.strokeWeight) colorAttrs.push(`strokeWeight="${detail.strokeWeight}"`);
      parts.push(`<color ${colorAttrs.join(' ')}/>`);
    }

    // Add custom attributes
    const customKeys = Object.keys(detail).filter(
      key => !['contact', 'remarks', 'color', 'strokeColor', 'strokeWeight', 'uid'].includes(key)
    );

    customKeys.forEach(key => {
      const value = detail[key];
      if (typeof value === 'string' || typeof value === 'number') {
        parts.push(`<${key}>${value}</${key}>`);
      }
    });

    return parts.join('\n    ');
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert color name to hex
   */
  private colorToHex(color: string): string {
    const colors: Record<string, string> = {
      'Red': 'FF0000',
      'Orange': 'FF8C00',
      'Yellow': 'FFFF00',
      'Green': '00FF00',
      'Blue': '0000FF',
      'Cyan': '00FFFF',
      'Gray': '808080',
      'White': 'FFFFFF',
      'Black': '000000'
    };
    return colors[color] || 'FFFFFF';
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<WigleConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.antenna) {
      this.sensitivityFactor = this.calculateSensitivityFactor(this.config.antenna);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): WigleConfig {
    return { ...this.config };
  }
}