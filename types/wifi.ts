/**
 * WiFi/Kismet Type Definitions
 * Types for WiFi scanning, device detection, and Kismet integration
 */

// WiFi Device Types
export interface WiFiDevice {
  macAddress: string;
  ssid?: string;
  manufacturer?: string;
  type: 'AP' | 'Client' | 'Bridge' | 'Unknown';
  firstSeen: string;
  lastSeen: string;
  channel: number;
  frequency: number;
  rssi: number;         // Received Signal Strength Indicator (dBm)
  snr?: number;         // Signal-to-Noise Ratio
  dataRate?: number;    // Mbps
  encryption: EncryptionType;
  lastLatitude?: number;
  lastLongitude?: number;
  altitude?: number;
  accuracy?: number;
  packets: {
    total: number;
    data: number;
    management: number;
    control: number;
  };
}

// Network/Access Point specific
export interface WiFiNetwork extends WiFiDevice {
  type: 'AP';
  bssid: string;
  beacon: {
    interval: number;
    capabilities: string[];
  };
  clients: string[];    // MAC addresses of connected clients
  channel: {
    primary: number;
    width: 20 | 40 | 80 | 160;
    secondary?: number;
  };
}

// Client Device specific
export interface WiFiClient extends WiFiDevice {
  type: 'Client';
  associatedBSSID?: string;
  associatedSSID?: string;
  probeRequests: string[];  // SSIDs probed for
}

// Encryption Types
export type EncryptionType = 
  | 'Open'
  | 'WEP'
  | 'WPA'
  | 'WPA2'
  | 'WPA3'
  | 'WPA2-PSK'
  | 'WPA2-Enterprise'
  | 'Unknown';

// Kismet API Response Types
export interface KismetDevice {
  'kismet.device.base.key': string;
  'kismet.device.base.macaddr': string;
  'kismet.device.base.name'?: string;
  'kismet.device.base.type': string;
  'kismet.device.base.phyname': string;
  'kismet.device.base.commonname'?: string;
  'kismet.device.base.manuf'?: string;
  'kismet.device.base.first_time': number;
  'kismet.device.base.last_time': number;
  'kismet.device.base.packets.total': number;
  'kismet.device.base.packets.data': number;
  'kismet.device.base.channel': string;
  'kismet.device.base.frequency': number;
  'kismet.device.base.signal'?: {
    'kismet.common.signal.last_signal': number;
    'kismet.common.signal.max_signal': number;
    'kismet.common.signal.min_signal': number;
    'kismet.common.signal.last_noise'?: number;
  };
  'kismet.device.base.location'?: KismetLocation;
  'dot11.device'?: Dot11Device;
}

export interface KismetLocation {
  'kismet.common.location.last': {
    'kismet.common.location.lat': number;
    'kismet.common.location.lon': number;
    'kismet.common.location.alt'?: number;
    'kismet.common.location.speed'?: number;
    'kismet.common.location.heading'?: number;
    'kismet.common.location.fix'?: number;
  };
  'kismet.common.location.avg': {
    'kismet.common.location.lat': number;
    'kismet.common.location.lon': number;
  };
}

export interface Dot11Device {
  'dot11.device.ssid'?: string;
  'dot11.device.bssid'?: string;
  'dot11.device.client_map'?: Record<string, any>;
  'dot11.device.probed_ssid_map'?: Record<string, {
    'dot11.probedssid.ssid': string;
    'dot11.probedssid.first_time': number;
    'dot11.probedssid.last_time': number;
  }>;
  'dot11.device.wpa_version'?: number;
  'dot11.device.wps_state'?: number;
}

// Kismet Alert Types
export interface KismetAlert {
  id: string;
  timestamp: number;
  phyname: string;
  deviceKey?: string;
  header: string;
  text: string;
  class: 'SPOOF' | 'PROBE' | 'DENIAL' | 'EXPLOIT' | 'OTHER';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  location?: {
    lat: number;
    lon: number;
  };
}

// Kismet System Status
export interface KismetStatus {
  running: boolean;
  startTime: number;
  devices: {
    total: number;
    wifi: number;
    bluetooth: number;
    other: number;
  };
  packets: {
    total: number;
    rate: number;  // packets/sec
  };
  memory: {
    used: number;
    total: number;
  };
  datasources: KismetDatasource[];
}

export interface KismetDatasource {
  uuid: string;
  name: string;
  interface: string;
  type: string;
  running: boolean;
  channel?: number;
  hopPattern?: number[];
  packetsReceived: number;
  errorCount: number;
}

// WiFi Scan Configuration
export interface WiFiScanConfig {
  interface: string;
  channels?: number[];
  dwellTime?: number;     // ms per channel
  hopPattern?: 'sequential' | 'random' | 'custom';
  customHopPattern?: number[];
  filterSSIDs?: string[];
  filterMACs?: string[];
  minRSSI?: number;
}

// Wigle CSV Format
export interface WigleCSVRow {
  MAC: string;
  SSID: string;
  AuthMode: string;
  FirstSeen: string;
  Channel: number;
  RSSI: number;
  CurrentLatitude: number;
  CurrentLongitude: number;
  AltitudeMeters: number;
  AccuracyMeters: number;
  Type: 'WIFI' | 'BT' | 'BLE' | 'CELL';
}

// Device Tracking
export interface DeviceTrack {
  macAddress: string;
  positions: Array<{
    timestamp: number;
    latitude: number;
    longitude: number;
    altitude?: number;
    rssi: number;
    accuracy?: number;
  }>;
  speed?: number;        // m/s
  heading?: number;      // degrees
  distance?: number;     // total distance traveled (meters)
}

// Filter Lists
export interface FilterLists {
  whitelist: {
    ssids: Set<string>;
    macs: Set<string>;
  };
  blacklist: {
    ssids: Map<string, string>;  // SSID -> color (ARGB)
    macs: Map<string, string>;   // MAC -> color (ARGB)
  };
}

// Antenna Configuration
export interface AntennaConfig {
  type: 'standard' | 'alfa_card' | 'high_gain' | 'rpi_internal' | 'custom';
  sensitivityFactor: number;
  customFactor?: number;
  gain?: number;         // dBi
  pattern?: 'omnidirectional' | 'directional' | 'panel';
}