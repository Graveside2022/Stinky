import { io, Socket } from 'socket.io-client'
import type { WebSocketMessage } from '$shared/types'

export interface WebSocketConfig {
  url: string
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  reconnectionDelayMax?: number
  timeout?: number
  transports?: string[]
  path?: string
  extraHeaders?: Record<string, string>
}

export interface WebSocketEvents<T = unknown> {
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
  onError?: (error: Error) => void
  onMessage?: (message: WebSocketMessage<T>) => void
  onReconnectAttempt?: (attempt: number) => void
  onReconnectFailed?: () => void
  onReconnect?: (attempt: number) => void
}

export class WebSocketClient<T = unknown> {
  private socket: Socket | null = null
  private config: Required<WebSocketConfig>
  private events: WebSocketEvents<T>
  private reconnectTimer: NodeJS.Timeout | null = null
  private isManuallyDisconnected = false
  
  constructor(config: WebSocketConfig, events: WebSocketEvents<T> = {}) {
    this.config = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      extraHeaders: {},
      ...config
    }
    this.events = events
    
    if (this.config.autoConnect) {
      this.connect()
    }
  }
  
  connect(): void {
    if (this.socket?.connected) {
      console.warn('WebSocket already connected')
      return
    }
    
    this.isManuallyDisconnected = false
    
    try {
      this.socket = io(this.config.url, {
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        transports: this.config.transports,
        path: this.config.path,
        extraHeaders: this.config.extraHeaders
      })
      
      this.setupEventHandlers()
    } catch (error) {
      this.handleError(error as Error)
    }
  }
  
  disconnect(): void {
    this.isManuallyDisconnected = true
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
  
  send(type: string, payload: T): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket is not connected')
    }
    
    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: Date.now()
    }
    
    this.socket.emit('message', message)
  }
  
  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket is not connected')
    }
    
    this.socket.emit(event, data)
  }
  
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized')
    }
    
    this.socket.on(event, handler)
  }
  
  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (!this.socket) {
      return
    }
    
    if (handler) {
      this.socket.off(event, handler)
    } else {
      this.socket.off(event)
    }
  }
  
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }
  
  get id(): string | undefined {
    return this.socket?.id
  }
  
  private setupEventHandlers(): void {
    if (!this.socket) return
    
    this.socket.on('connect', () => {
      console.log(`WebSocket connected to ${this.config.url}`)
      this.events.onConnect?.()
    })
    
    this.socket.on('disconnect', (reason: string) => {
      console.log(`WebSocket disconnected from ${this.config.url}: ${reason}`)
      this.events.onDisconnect?.(reason)
      
      if (!this.isManuallyDisconnected && this.config.reconnection) {
        this.handleReconnection()
      }
    })
    
    this.socket.on('connect_error', (error: Error) => {
      this.handleError(error)
    })
    
    this.socket.on('message', (message: WebSocketMessage<T>) => {
      this.events.onMessage?.(message)
    })
    
    this.socket.io.on('reconnect_attempt', (attempt: number) => {
      console.log(`Reconnection attempt ${attempt} to ${this.config.url}`)
      this.events.onReconnectAttempt?.(attempt)
    })
    
    this.socket.io.on('reconnect_failed', () => {
      console.error(`Failed to reconnect to ${this.config.url}`)
      this.events.onReconnectFailed?.()
    })
    
    this.socket.io.on('reconnect', (attempt: number) => {
      console.log(`Reconnected to ${this.config.url} after ${attempt} attempts`)
      this.events.onReconnect?.(attempt)
    })
  }
  
  private handleError(error: Error): void {
    console.error(`WebSocket error for ${this.config.url}:`, error)
    this.events.onError?.(error)
  }
  
  private handleReconnection(): void {
    // Socket.IO handles reconnection internally with exponential backoff
    // This method is here for any custom reconnection logic if needed
    console.log(`Attempting to reconnect to ${this.config.url}`)
  }
  
  destroy(): void {
    this.disconnect()
    this.events = {}
  }
}

export default WebSocketClient