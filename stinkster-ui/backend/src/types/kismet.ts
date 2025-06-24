/**
 * Kismet-specific type definitions
 */

// Kismet event types for WebSocket
export type KismetEventType = 
  | 'kismet:device:new'
  | 'kismet:device:update'
  | 'kismet:device:remove'
  | 'kismet:alert'
  | 'kismet:system:status'
  | 'kismet:channel:hop'
  | 'kismet:datasource:update'
  | 'kismet:messagebus'
  | 'kismet:gps:update'
  | 'kismet:stats:update';

// Kismet GPS data
export interface KismetGPS {
  'kismet.common.location.lat': number;
  'kismet.common.location.lon': number;
  'kismet.common.location.alt': number;
  'kismet.common.location.speed': number;
  'kismet.common.location.heading': number;
  'kismet.common.location.magheading': number;
  'kismet.common.location.fix': number;
  'kismet.common.location.time': number;
  'kismet.common.location.gpsuuid': string;
  'kismet.common.location.gpsname': string;
}

// Kismet datasource information
export interface KismetDatasource {
  'kismet.datasource.uuid': string;
  'kismet.datasource.name': string;
  'kismet.datasource.interface': string;
  'kismet.datasource.type': string;
  'kismet.datasource.running': boolean;
  'kismet.datasource.channel': string;
  'kismet.datasource.channels': string[];
  'kismet.datasource.hop_rate': number;
  'kismet.datasource.hop_channels': string[];
  'kismet.datasource.packets_total': number;
  'kismet.datasource.packets_rrd': Record<string, any>;
}

// Kismet message types
export interface KismetMessage {
  'kismet.messagebus.timestamp': number;
  'kismet.messagebus.message': string;
  'kismet.messagebus.flags': number;
}

// Channel hopping event
export interface ChannelHopEvent {
  datasource: string;
  uuid: string;
  channel: number;
  frequency: number;
  timestamp: number;
}

// Datasource update event
export interface DatasourceUpdateEvent {
  datasource: KismetDatasource;
  action: 'added' | 'updated' | 'removed' | 'error';
  error?: string;
}

// GPS update event
export interface GPSUpdateEvent {
  gps: KismetGPS;
  source: string;
  timestamp: number;
}

// Statistics update event
export interface StatsUpdateEvent {
  devices: {
    total: number;
    new: number;
    active: number;
    removed: number;
  };
  packets: {
    total: number;
    rate: number;
    data: number;
    error: number;
  };
  datasources: {
    total: number;
    running: number;
    error: number;
  };
  memory: {
    rss: number;
    virtual: number;
    percent: number;
  };
  timestamp: number;
}

// Extended WebSocket event types for Kismet
export interface KismetWSEvent<T = any> {
  type: KismetEventType;
  data: T;
  timestamp: number;
  id: string;
  source?: string;
}

// Kismet-specific filter options
export interface KismetDeviceFilter {
  phyname?: string | string[];
  deviceType?: string | string[];
  minSignal?: number;
  maxSignal?: number;
  lastSeen?: number;
  firstSeen?: number;
  channels?: number[];
  datasource?: string;
  manufacturer?: string;
  ssidRegex?: string;
  macRegex?: string;
  tags?: string[];
}

// Kismet query options
export interface KismetQueryOptions {
  fields?: string[];
  regex?: Array<{
    field: string;
    regex: string;
  }>;
  last_time?: number;
  first_time?: number;
  bounded?: boolean;
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    desc?: boolean;
  };
}

// Kismet device details
export interface KismetDeviceDetails {
  base: {
    key: string;
    macaddr: string;
    name: string;
    type: string;
    phyname: string;
    frequency: number;
    channel: string;
    signal: number;
    noise: number;
    min_signal: number;
    max_signal: number;
    first_time: number;
    last_time: number;
    mod_time: number;
    packets: {
      total: number;
      filtered: number;
      error: number;
      data: number;
      crypt: number;
      dupe: number;
      fragments: number;
      retries: number;
    };
    datasize: number;
    location: KismetGPS;
    seenby: string[];
    server_uuid: string;
    tags: string[];
    notes: string;
  };
  dot11?: {
    device: {
      ssid: string;
      ssid_len: number;
      bssid: string;
      beacon_info: string;
      crypt_set: number;
      channel: string;
      frequency: number;
      rates: number[];
      beacon_rate: number;
      response_rate: number;
      client_disconnects: number;
      last_beaconed: number;
      last_probed: number;
      last_sequence: number;
      bss_timestamp: number;
      client_map: Record<string, any>;
      responded_ssid_map: Record<string, any>;
      probed_ssid_map: Record<string, any>;
      wpa_version: number;
      wpa_mfp: boolean;
    };
  };
}

// Kismet PCAP streaming options
export interface KismetPCAPOptions {
  device?: string;
  datasource?: string;
  filter?: string;
  limit?: number;
}

// Kismet alert configuration
export interface KismetAlertConfig {
  alertType: string;
  enabled: boolean;
  severity: number;
  burstMax?: number;
  burstUnit?: number;
  limitMax?: number;
  limitUnit?: number;
  description?: string;
}