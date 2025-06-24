/**
 * WebSocket utility functions for error handling and retry logic
 */

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
    config.maxDelay
  )
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay
  return Math.floor(delay + jitter)
}

/**
 * WebSocket error categories for better error handling
 */
export enum WebSocketErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Categorize WebSocket errors
 */
export function categorizeError(error: Error | string): WebSocketErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
    return WebSocketErrorType.CONNECTION_FAILED
  }
  
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
    return WebSocketErrorType.AUTHENTICATION_FAILED
  }
  
  if (errorMessage.includes('timeout')) {
    return WebSocketErrorType.TIMEOUT
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('ENETUNREACH')) {
    return WebSocketErrorType.NETWORK_ERROR
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('server')) {
    return WebSocketErrorType.SERVER_ERROR
  }
  
  return WebSocketErrorType.UNKNOWN
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(errorType: WebSocketErrorType): boolean {
  switch (errorType) {
    case WebSocketErrorType.CONNECTION_FAILED:
    case WebSocketErrorType.TIMEOUT:
    case WebSocketErrorType.NETWORK_ERROR:
    case WebSocketErrorType.SERVER_ERROR:
      return true
    case WebSocketErrorType.AUTHENTICATION_FAILED:
    case WebSocketErrorType.UNKNOWN:
    default:
      return false
  }
}

/**
 * Format WebSocket URL with proper protocol
 */
export function formatWebSocketUrl(url: string, secure: boolean = false): string {
  // Remove any existing protocol
  const cleanUrl = url.replace(/^(ws|wss|http|https):\/\//, '')
  
  // Add appropriate WebSocket protocol
  const protocol = secure ? 'wss://' : 'ws://'
  return protocol + cleanUrl
}

/**
 * Validate WebSocket URL
 */
export function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:'
  } catch {
    return false
  }
}

/**
 * Create a connection health monitor
 */
export class ConnectionHealthMonitor {
  private pingInterval: NodeJS.Timeout | null = null
  private lastPong: number = Date.now()
  private healthCheckCallbacks: ((healthy: boolean) => void)[] = []
  
  constructor(
    private pingIntervalMs: number = 30000,
    private pongTimeoutMs: number = 5000
  ) {}
  
  start(
    sendPing: () => void,
    onUnhealthy?: () => void
  ): void {
    this.stop()
    
    this.pingInterval = setInterval(() => {
      const now = Date.now()
      
      // Check if we've received a pong recently
      if (now - this.lastPong > this.pingIntervalMs + this.pongTimeoutMs) {
        this.notifyUnhealthy()
        onUnhealthy?.()
      } else {
        sendPing()
      }
    }, this.pingIntervalMs)
  }
  
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
  
  recordPong(): void {
    this.lastPong = Date.now()
    this.notifyHealthy()
  }
  
  onHealthChange(callback: (healthy: boolean) => void): void {
    this.healthCheckCallbacks.push(callback)
  }
  
  private notifyHealthy(): void {
    this.healthCheckCallbacks.forEach(cb => cb(true))
  }
  
  private notifyUnhealthy(): void {
    this.healthCheckCallbacks.forEach(cb => cb(false))
  }
  
  destroy(): void {
    this.stop()
    this.healthCheckCallbacks = []
  }
}

/**
 * WebSocket message queue for offline support
 */
export class MessageQueue<T = unknown> {
  private queue: Array<{ type: string; payload: T; timestamp: number }> = []
  private maxSize: number
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }
  
  enqueue(type: string, payload: T): void {
    this.queue.push({
      type,
      payload,
      timestamp: Date.now()
    })
    
    // Remove oldest messages if queue is full
    while (this.queue.length > this.maxSize) {
      this.queue.shift()
    }
  }
  
  dequeueAll(): Array<{ type: string; payload: T; timestamp: number }> {
    const messages = [...this.queue]
    this.queue = []
    return messages
  }
  
  size(): number {
    return this.queue.length
  }
  
  clear(): void {
    this.queue = []
  }
}