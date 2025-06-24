import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketClient } from './WebSocketClient'
import type { WebSocketMessage } from '$shared/types'

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    id: 'test-socket-id',
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    io: {
      on: vi.fn()
    }
  }
  
  return {
    io: vi.fn(() => mockSocket)
  }
})

describe('WebSocketClient', () => {
  let client: WebSocketClient<unknown>
  let mockSocket: any
  
  beforeEach(async () => {
    vi.clearAllMocks()
    const { io } = await import('socket.io-client')
    mockSocket = io('test-url')
  })
  
  afterEach(() => {
    if (client) {
      client.destroy()
    }
  })
  
  describe('constructor', () => {
    it('should create client with default config', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      expect(client).toBeDefined()
    })
    
    it('should auto-connect when autoConnect is true', async () => {
      const { io } = await import('socket.io-client')
      client = new WebSocketClient({ url: 'ws://localhost:8080', autoConnect: true })
      
      expect(io).toHaveBeenCalledWith('ws://localhost:8080', expect.objectContaining({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
      }))
    })
    
    it('should not auto-connect when autoConnect is false', async () => {
      vi.clearAllMocks() // Clear the mock calls from beforeEach
      const { io } = await import('socket.io-client')
      client = new WebSocketClient({ url: 'ws://localhost:8080', autoConnect: false })
      
      expect(io).not.toHaveBeenCalled()
    })
  })
  
  describe('connect', () => {
    it('should establish connection', async () => {
      const { io } = await import('socket.io-client')
      client = new WebSocketClient({ url: 'ws://localhost:8080', autoConnect: false })
      
      client.connect()
      
      expect(io).toHaveBeenCalledWith('ws://localhost:8080', expect.any(Object))
    })
    
    it('should not reconnect if already connected', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      mockSocket.connected = true
      
      const consoleSpy = vi.spyOn(console, 'warn')
      client.connect()
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket already connected')
    })
    
    it('should setup event handlers on connect', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function))
    })
  })
  
  describe('disconnect', () => {
    it('should disconnect and cleanup', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      client.disconnect()
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })
  
  describe('send', () => {
    it('should send message when connected', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      mockSocket.connected = true
      
      const payload = { data: 'test' }
      client.send('test-type', payload)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'test-type',
        payload,
        timestamp: expect.any(Number)
      }))
    })
    
    it('should throw error when not connected', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      mockSocket.connected = false
      
      expect(() => client.send('test-type', {})).toThrow('WebSocket is not connected')
    })
  })
  
  describe('emit', () => {
    it('should emit custom event when connected', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      mockSocket.connected = true
      
      client.emit('custom-event', { data: 'test' })
      
      expect(mockSocket.emit).toHaveBeenCalledWith('custom-event', { data: 'test' })
    })
    
    it('should throw error when not connected', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      mockSocket.connected = false
      
      expect(() => client.emit('custom-event')).toThrow('WebSocket is not connected')
    })
  })
  
  describe('event handlers', () => {
    it('should call onConnect handler', () => {
      const onConnect = vi.fn()
      client = new WebSocketClient({ url: 'ws://localhost:8080' }, { onConnect })
      
      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1]
      connectHandler?.()
      
      expect(onConnect).toHaveBeenCalled()
    })
    
    it('should call onDisconnect handler', () => {
      const onDisconnect = vi.fn()
      client = new WebSocketClient({ url: 'ws://localhost:8080' }, { onDisconnect })
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1]
      disconnectHandler?.('transport close')
      
      expect(onDisconnect).toHaveBeenCalledWith('transport close')
    })
    
    it('should call onMessage handler', () => {
      const onMessage = vi.fn()
      client = new WebSocketClient({ url: 'ws://localhost:8080' }, { onMessage })
      
      // Simulate message event
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1]
      const testMessage: WebSocketMessage = {
        type: 'test',
        payload: { data: 'test' },
        timestamp: Date.now()
      }
      messageHandler?.(testMessage)
      
      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })
    
    it('should call onError handler', () => {
      const onError = vi.fn()
      client = new WebSocketClient({ url: 'ws://localhost:8080' }, { onError })
      
      // Simulate error event
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1]
      const error = new Error('Connection failed')
      errorHandler?.(error)
      
      expect(onError).toHaveBeenCalledWith(error)
    })
  })
  
  describe('getters', () => {
    it('should return connection status', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      
      expect(client.isConnected).toBe(false)
      
      mockSocket.connected = true
      expect(client.isConnected).toBe(true)
    })
    
    it('should return socket id', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      
      expect(client.id).toBe('test-socket-id')
    })
  })
  
  describe('on/off methods', () => {
    it('should add event listener', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      const handler = vi.fn()
      
      client.on('custom-event', handler)
      
      expect(mockSocket.on).toHaveBeenCalledWith('custom-event', handler)
    })
    
    it('should remove event listener', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      const handler = vi.fn()
      
      client.off('custom-event', handler)
      
      expect(mockSocket.off).toHaveBeenCalledWith('custom-event', handler)
    })
    
    it('should remove all listeners for event', () => {
      client = new WebSocketClient({ url: 'ws://localhost:8080' })
      
      client.off('custom-event')
      
      expect(mockSocket.off).toHaveBeenCalledWith('custom-event')
    })
  })
})