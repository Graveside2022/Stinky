// Kismet Types for WiFi Scanning and Device Tracking
// Types for Kismet API responses and device data

export interface KismetDevice {
  'kismet.device.base.key': string;
  'kismet.device.base.macaddr': string;
  'kismet.device.base.name'?: string;
  'kismet.device.base.type': string;
  'kismet.device.base.first_time': number;
  'kismet.device.base.last_time': number;
  'kismet.device.base.server_uuid': string;
  'kismet.device.base.phyname': string;
  'kismet.device.base.commonname'?: string;
  'kismet.device.base.crypt'?: string;
  'kismet.device.base.channel'?: string;
  'kismet.device.base.frequency'?: number;
  'kismet.device.base.tags'?: Record<string, any>;
  'kismet.device.base.location'?: KismetLocation;
  'kismet.device.base.signal'?: KismetSignal;
  'kismet.device.base.packets'?: KismetPacketCounts;
  'kismet.device.base.datasize'?: number;
  'kismet.device.base.manuf'?: string;
  'kismet.device.base.mod_time'?: number;
}

export interface KismetLocation {
  'kismet.common.location.lat': number;
  'kismet.common.location.lon': number;
  'kismet.common.location.alt': number;
  'kismet.common.location.fix': number;
  'kismet.common.location.time_sec': number;
  'kismet.common.location.time_usec': number;
  'kismet.common.location.valid': boolean;
}

export interface KismetSignal {
  'kismet.common.signal.last_signal_dbm': number;
  'kismet.common.signal.last_noise_dbm'?: number;
  'kismet.common.signal.min_signal_dbm': number;
  'kismet.common.signal.max_signal_dbm': number;
  'kismet.common.signal.peak_loc'?: KismetLocation;
  'kismet.common.signal.maxseenrate'?: number;
  'kismet.common.signal.encodingset'?: string[];
  'kismet.common.signal.carrier'?: string;
  'kismet.common.signal.encoding'?: string;
}

export interface KismetPacketCounts {
  'kismet.device.base.packets.total': number;
  'kismet.device.base.packets.llc': number;
  'kismet.device.base.packets.error': number;
  'kismet.device.base.packets.data': number;
  'kismet.device.base.packets.crypt': number;
  'kismet.device.base.packets.filtered': number;
  'kismet.device.base.packets.datasize': number;
}

export interface KismetWiFiDevice extends KismetDevice {
  'dot11.device'?: KismetDot11Device;
}

export interface KismetDot11Device {
  'dot11.device.last_beaconed_ssid': string;
  'dot11.device.last_beaconed_ssid_csum': number;
  'dot11.device.last_beacon_timestamp': number;
  'dot11.device.beacon_info': KismetBeaconInfo;
  'dot11.device.client_map'?: Record<string, KismetClient>;
  'dot11.device.advertised_ssid_map'?: Record<string, KismetSSID>;
  'dot11.device.probed_ssid_map'?: Record<string, KismetSSID>;
  'dot11.device.associated_clients'?: string[];
  'dot11.device.last_sequence'?: number;
  'dot11.device.num_fragments'?: number;
  'dot11.device.num_retries'?: number;
  'dot11.device.datasize'?: number;
  'dot11.device.datasize_retry'?: number;
  'dot11.device.eapol_seen'?: boolean;
  'dot11.device.krack_seen'?: boolean;
  'dot11.device.pmkid_seen'?: boolean;
  'dot11.device.wpa_handshake_list'?: KismetHandshake[];
}

export interface KismetBeaconInfo {
  'dot11.advertisedssid.beacon_info': string;
  'dot11.advertisedssid.maxrate': number;
  'dot11.advertisedssid.beaconrate': number;
  'dot11.advertisedssid.channel': string;
  'dot11.advertisedssid.ht_cc': boolean;
  'dot11.advertisedssid.ht_40': boolean;
  'dot11.advertisedssid.dot11d_country': string;
  'dot11.advertisedssid.dot11d_list': any[];
  'dot11.advertisedssid.crypt_set': number[];
  'dot11.advertisedssid.dot11r_mobility': boolean;
  'dot11.advertisedssid.dot11r_mobility_domain_id': number;
  'dot11.advertisedssid.dot11e_qbss': boolean;
  'dot11.advertisedssid.dot11e_channel_utilization_perc': number;
}

export interface KismetSSID {
  'dot11.advertisedssid.ssid': string;
  'dot11.advertisedssid.ssidlen': number;
  'dot11.advertisedssid.crypt_set': number[];
  'dot11.advertisedssid.maxrate': number;
  'dot11.advertisedssid.beacon_info': string;
  'dot11.advertisedssid.first_time': number;
  'dot11.advertisedssid.last_time': number;
  'dot11.advertisedssid.channel': string;
  'dot11.advertisedssid.ht_mode': string;
  'dot11.advertisedssid.ht_cc': boolean;
  'dot11.advertisedssid.ht_40': boolean;
  'dot11.advertisedssid.vht_mode': string;
  'dot11.advertisedssid.vht_160': boolean;
  'dot11.advertisedssid.vht_80_80': boolean;
}

export interface KismetClient {
  'dot11.client.bssid': string;
  'dot11.client.first_time': number;
  'dot11.client.last_time': number;
  'dot11.client.type': string;
  'dot11.client.datasize': number;
  'dot11.client.last_sequence': number;
  'dot11.client.packets': number;
  'dot11.client.eapol_seen': boolean;
  'dot11.client.pmkid_seen': boolean;
  'dot11.client.kr00k_seen': boolean;
  'dot11.client.wpa_handshake_list': KismetHandshake[];
}

export interface KismetHandshake {
  'dot11.eapol.timestamp': number;
  'dot11.eapol.direction': string;
  'dot11.eapol.message_num': number;
  'dot11.eapol.replay_counter': number;
  'dot11.eapol.install': boolean;
  'dot11.eapol.nonce': string;
}

export interface KismetDataSource {
  'kismet.datasource.name': string;
  'kismet.datasource.uuid': string;
  'kismet.datasource.type': string;
  'kismet.datasource.definition': string;
  'kismet.datasource.interface': string;
  'kismet.datasource.hardware': string;
  'kismet.datasource.capture': boolean;
  'kismet.datasource.in_error': boolean;
  'kismet.datasource.error_reason': string;
  'kismet.datasource.packets': number;
  'kismet.datasource.packets_filtered': number;
  'kismet.datasource.packets_dropped': number;
  'kismet.datasource.channel': string;
  'kismet.datasource.hop_rate': number;
  'kismet.datasource.hop_channels': string[];
  'kismet.datasource.hop_offset': number;
  'kismet.datasource.hop_shuffle': boolean;
  'kismet.datasource.hop_shuffle_skip': number;
  'kismet.datasource.hop_split': boolean;
  'kismet.datasource.running': boolean;
  'kismet.datasource.retry': boolean;
  'kismet.datasource.retry_attempts': number;
}

export interface KismetSystemStatus {
  'kismet.system.battery.percentage': number;
  'kismet.system.battery.charging': string;
  'kismet.system.battery.ac': boolean;
  'kismet.system.battery.remaining': number;
  'kismet.system.memory.rss': number;
  'kismet.system.memory.vsize': number;
  'kismet.system.timestamp.sec': number;
  'kismet.system.timestamp.usec': number;
  'kismet.system.running_time': number;
  'kismet.system.user_time': number;
  'kismet.system.sys_time': number;
  'kismet.system.start_time': number;
  'kismet.system.devices': number;
  'kismet.system.packets': number;
  'kismet.system.packets_dropped': number;
  'kismet.system.alerts': number;
}

export interface KismetMessageBus {
  'kismet.messagebus.timestamp': number;
  'kismet.messagebus.message': string;
  'kismet.messagebus.flags': number;
}

export interface KismetChannelDetails {
  channel: string;
  frequency: number;
  type: string;
  packets: number;
  usec: number;
  active: boolean;
}

export interface KismetAlert {
  'kismet.alert.timestamp': number;
  'kismet.alert.hash': number;
  'kismet.alert.header': string;
  'kismet.alert.text': string;
  'kismet.alert.class': string;
  'kismet.alert.severity': number;
  'kismet.alert.transmitter_mac': string;
  'kismet.alert.source_mac': string;
  'kismet.alert.dest_mac': string;
  'kismet.alert.other_mac': string;
  'kismet.alert.channel': string;
  'kismet.alert.frequency': number;
  'kismet.alert.location': KismetLocation;
}

export interface KismetDeviceList {
  last_time: number;
  last_row: number;
  total_size: number;
  filtered_size: number;
  data: KismetDevice[];
}

export interface KismetDataSummary {
  datasources: KismetDataSource[];
  devices: number;
  packets: number;
  packets_dropped: number;
  packets_filtered: number;
  alerts: number;
  channels: KismetChannelDetails[];
  memory_usage: number;
  running_time: number;
  start_time: number;
  version: string;
  build_revision: string;
  build_time: string;
  uid: string;
  servername: string;
  dumpfile_location: string;
  log_location: string;
  webui_url: string;
}