import { writable, derived } from 'svelte/store'
import { WebSocketClient } from '$lib/services/websocket/WebSocketClient'
import { getWebSocketUrl } from '$lib/config/api'
import type { 
  HackRFMessage, 
  SpectrumData, 
  HackRFStatus,
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

// HackRF data stores
const spectrumData = writable<SpectrumData | null>(null)
const hackrfStatus = writable<HackRFStatus | null>(null)
const signalHistory = writable<SpectrumData[]>([])

// WebSocket client instance
let wsClient: WebSocketClient<HackRFMessage> | null = null

// Initialize WebSocket connection
export function connectHackRF(url?: string): void {
  const wsUrl = url || getWebSocketUrl('hackrf')
  if (wsClient?.isConnected) {
    console.warn('HackRF WebSocket already connected')
    return
  }
  
  connectionState.update(state => ({ ...state, connecting: true, error: null }))
  
  wsClient = new WebSocketClient<HackRFMessage>(
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
      },
      
      onDisconnect: (_reason) => {
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
        handleHackRFMessage(message as HackRFMessage)
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
export function disconnectHackRF(): void {
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
function handleHackRFMessage(message: HackRFMessage): void {
  switch (message.type) {
    case 'spectrum':
      const spectrum = message.payload as SpectrumData
      spectrumData.set(spectrum)
      
      // Update signal history (keep last 100 samples)
      signalHistory.update(history => {
        const newHistory = [...history, spectrum]
        return newHistory.slice(-100)
      })
      break
      
    case 'status':
      hackrfStatus.set(message.payload as HackRFStatus)
      break
      
    case 'error':
      console.error('HackRF error:', message.payload)
      connectionState.update(state => ({
        ...state,
        error: new Error(String(message.payload))
      }))
      break
      
    default:
      console.log('Unknown HackRF message type:', message.type)
  }
}

// Send configuration update
export function updateHackRFConfig(config: Partial<HackRFStatus>): void {
  if (!wsClient?.isConnected) {
    throw new Error('HackRF WebSocket not connected')
  }
  
  wsClient.emit('config_update', config)
}

// Derived stores
export const isConnected = derived(connectionState, $state => $state.connected)
export const isConnecting = derived(connectionState, $state => $state.connecting)
export const connectionError = derived(connectionState, $state => $state.error)

// Export stores
export {
  connectionState,
  spectrumData,
  hackrfStatus,
  signalHistory
}