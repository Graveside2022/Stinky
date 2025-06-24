import type { WebSocketMessage, Device, GPSLocation } from '$shared/types'

// HackRF WebSocket Message Types
export interface SpectrumData {
  frequency: number
  magnitude: number[]
  sampleRate: number
  centerFrequency: number
  timestamp: number
}

export interface HackRFStatus {
  connected: boolean
  frequency: number
  sampleRate: number
  gain: number
  amplifierEnabled: boolean
}

export type HackRFMessageType = 'spectrum' | 'status' | 'error' | 'config'

export interface HackRFMessage extends WebSocketMessage {
  type: HackRFMessageType
}

export interface HackRFSpectrumMessage extends HackRFMessage {
  type: 'spectrum'
  payload: SpectrumData
}

export interface HackRFStatusMessage extends HackRFMessage {
  type: 'status'
  payload: HackRFStatus
}

// Wigle WebSocket Message Types
export interface WigleDevice extends Device {
  ssid?: string
  channel?: number
  frequency?: number
  encryption?: string
  location?: GPSLocation
}

export type WigleMessageType = 'device_update' | 'device_new' | 'device_lost' | 'scan_status'

export interface WigleMessage extends WebSocketMessage {
  type: WigleMessageType
}

export interface WigleDeviceMessage extends WigleMessage {
  type: 'device_update' | 'device_new' | 'device_lost'
  payload: WigleDevice
}

export interface WigleScanStatus {
  active: boolean
  devicesFound: number
  scanDuration: number
  lastUpdate: number
}

export interface WigleScanStatusMessage extends WigleMessage {
  type: 'scan_status'
  payload: WigleScanStatus
}

// Kismet WebSocket Message Types
export interface KismetDevice extends Device {
  type: 'wifi' | 'bluetooth' | 'other'
  channel?: number
  frequency?: number
  dataPackets?: number
  encryptedPackets?: number
  location?: GPSLocation
}

export type KismetMessageType = 'device_summary' | 'device_detail' | 'alert' | 'system_status'

export interface KismetMessage extends WebSocketMessage {
  type: KismetMessageType
}

export interface KismetDeviceMessage extends KismetMessage {
  type: 'device_summary' | 'device_detail'
  payload: KismetDevice
}

export interface KismetAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  device?: string
}

export interface KismetAlertMessage extends KismetMessage {
  type: 'alert'
  payload: KismetAlert
}

export interface KismetSystemStatus {
  devices: number
  packets: number
  dataRate: number
  memoryUsage: number
  cpuUsage: number
  uptime: number
}

export interface KismetSystemStatusMessage extends KismetMessage {
  type: 'system_status'
  payload: KismetSystemStatus
}

// Generic WebSocket connection state
export interface WebSocketState {
  connected: boolean
  connecting: boolean
  error: Error | null
  lastConnected: Date | null
  reconnectAttempts: number
}