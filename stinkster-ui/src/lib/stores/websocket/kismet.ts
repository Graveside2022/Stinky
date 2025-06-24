import { writable, derived } from 'svelte/store'
import { WebSocketClient } from '$lib/services/websocket/WebSocketClient'
import type { 
  KismetMessage, 
  KismetDevice, 
  KismetAlert,
  KismetSystemStatus,
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

// Kismet data stores
const devices = writable<Map<string, KismetDevice>>(new Map())
const alerts = writable<KismetAlert[]>([])
const systemStatus = writable<KismetSystemStatus | null>(null)
const selectedDevice = writable<KismetDevice | null>(null)

// WebSocket client instance
let wsClient: WebSocketClient<KismetMessage> | null = null

// Initialize WebSocket connection
export function connectKismet(url: string = 'ws://localhost:2501'): void {
  if (wsClient?.isConnected) {
    console.warn('Kismet WebSocket already connected')
    return
  }
  
  connectionState.update(state => ({ ...state, connecting: true, error: null }))
  
  wsClient = new WebSocketClient<KismetMessage>(
    {
      url,
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
        
        // Subscribe to Kismet events
        wsClient?.emit('subscribe', {
          events: ['device_summary', 'system_status', 'alert']
        })
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
        handleKismetMessage(message as KismetMessage)
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
export function disconnectKismet(): void {
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
function handleKismetMessage(message: KismetMessage): void {
  switch (message.type) {
    case 'device_summary':
    case 'device_detail':
      const device = message.payload as KismetDevice
      devices.update(deviceMap => {
        deviceMap.set(device.id, device)
        return new Map(deviceMap)
      })
      
      // Update selected device if it matches
      selectedDevice.update(selected => {
        if (selected?.id === device.id) {
          return device
        }
        return selected
      })
      break
      
    case 'alert':
      const alert = message.payload as KismetAlert
      alerts.update(alertList => {
        // Keep last 100 alerts
        return [alert, ...alertList].slice(0, 100)
      })
      break
      
    case 'system_status':
      systemStatus.set(message.payload as KismetSystemStatus)
      break
      
    default:
      console.log('Unknown Kismet message type:', message.type)
  }
}

// Actions
export function requestDeviceDetails(deviceId: string): void {
  if (!wsClient?.isConnected) {
    throw new Error('Kismet WebSocket not connected')
  }
  
  wsClient.emit('get_device_detail', { device_id: deviceId })
}

export function selectDevice(device: KismetDevice | null): void {
  selectedDevice.set(device)
  
  if (device) {
    requestDeviceDetails(device.id)
  }
}

export function clearAlerts(): void {
  alerts.set([])
}

export function acknowledgeAlert(alertId: string): void {
  alerts.update(alertList => 
    alertList.filter(alert => alert.id !== alertId)
  )
}

// Derived stores
export const isConnected = derived(connectionState, $state => $state.connected)
export const isConnecting = derived(connectionState, $state => $state.connecting)
export const connectionError = derived(connectionState, $state => $state.error)
export const deviceCount = derived(devices, $devices => $devices.size)
export const deviceList = derived(devices, $devices => Array.from($devices.values()))

export const criticalAlerts = derived(alerts, $alerts => 
  $alerts.filter(alert => alert.severity === 'critical')
)

export const warningAlerts = derived(alerts, $alerts => 
  $alerts.filter(alert => alert.severity === 'warning')
)

export const devicesByType = derived(devices, $devices => {
  const grouped = new Map<string, KismetDevice[]>()
  
  $devices.forEach(device => {
    const type = device.type || 'other'
    if (!grouped.has(type)) {
      grouped.set(type, [])
    }
    grouped.get(type)!.push(device)
  })
  
  return grouped
})

// Export stores
export {
  connectionState,
  devices,
  alerts,
  systemStatus,
  selectedDevice
}