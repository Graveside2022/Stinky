import { writable, derived } from 'svelte/store'
import { WebSocketClient } from '$lib/services/websocket/WebSocketClient'
import { getWebSocketUrl } from '$lib/config/api'
import type { 
  WigleMessage, 
  WigleDevice, 
  WigleScanStatus,
  WebSocketState 
} from '$lib/services/websocket/types'

// Connection state store
const connectionState = writable<WebSocketState>({
  connected: false,
  connecting: false,
  error: null,
  lastConnected: null,
  reconnectAttempts: 0
})

// Wigle data stores
const devices = writable<Map<string, WigleDevice>>(new Map())
const scanStatus = writable<WigleScanStatus | null>(null)
const recentDevices = writable<WigleDevice[]>([])

// WebSocket client instance
let wsClient: WebSocketClient<WigleMessage> | null = null

// Initialize WebSocket connection
export function connectWigle(url?: string): void {
  const wsUrl = url || getWebSocketUrl('wigle')
  if (wsClient?.isConnected) {
    console.warn('Wigle WebSocket already connected')
    return
  }
  
  connectionState.update(state => ({ ...state, connecting: true, error: null }))
  
  wsClient = new WebSocketClient<WigleMessage>(
    {
      url: wsUrl,
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000
    },
    {
      onConnect: () => {
        connectionState.update(state => ({
          ...state,
          connected: true,
          connecting: false,
          lastConnected: new Date(),
          reconnectAttempts: 0
        }))
        
        // Request initial device list
        wsClient?.emit('get_devices')
      },
      
      onDisconnect: (reason) => {
        connectionState.update(state => ({
          ...state,
          connected: false,
          connecting: false
        }))
      },
      
      onError: (error) => {
        connectionState.update(state => ({
          ...state,
          error,
          connecting: false
        }))
      },
      
      onMessage: (message) => {
        handleWigleMessage(message as WigleMessage)
      },
      
      onReconnectAttempt: (attempt) => {
        connectionState.update(state => ({
          ...state,
          connecting: true,
          reconnectAttempts: attempt
        }))
      }
    }
  )
}

// Disconnect WebSocket
export function disconnectWigle(): void {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
  
  connectionState.set({
    connected: false,
    connecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0
  })
}

// Handle incoming messages
function handleWigleMessage(message: WigleMessage): void {
  switch (message.type) {
    case 'device_new':
    case 'device_update':
      const device = message.payload as WigleDevice
      // Use MAC address as the device ID since WigleDevice uses 'mac' not 'id'
      const deviceId = device.mac || device.id
      devices.update(deviceMap => {
        deviceMap.set(deviceId, device)
        return new Map(deviceMap)
      })
      
      // Update recent devices
      recentDevices.update(recent => {
        const updated = [device, ...recent.filter(d => (d.mac || d.id) !== deviceId)]
        return updated.slice(0, 50) // Keep last 50 devices
      })
      break
      
    case 'device_lost':
      const lostDevice = message.payload as WigleDevice
      const lostDeviceId = lostDevice.mac || lostDevice.id
      devices.update(deviceMap => {
        deviceMap.delete(lostDeviceId)
        return new Map(deviceMap)
      })
      break
      
    case 'scan_status':
      scanStatus.set(message.payload as WigleScanStatus)
      break
      
    default:
      console.log('Unknown Wigle message type:', message.type)
  }
}

// Actions
export function startScan(): void {
  if (!wsClient?.isConnected) {
    throw new Error('Wigle WebSocket not connected')
  }
  
  wsClient.emit('start_scan')
}

export function stopScan(): void {
  if (!wsClient?.isConnected) {
    throw new Error('Wigle WebSocket not connected')
  }
  
  wsClient.emit('stop_scan')
}

export function clearDevices(): void {
  devices.set(new Map())
  recentDevices.set([])
}

// Derived stores
export const isConnected = derived(connectionState, $state => $state.connected)
export const isConnecting = derived(connectionState, $state => $state.connecting)
export const connectionError = derived(connectionState, $state => $state.error)
export const deviceCount = derived(devices, $devices => $devices.size)
export const deviceList = derived(devices, $devices => Array.from($devices.values()))

// Export stores
export {
  connectionState,
  devices,
  scanStatus,
  recentDevices
}