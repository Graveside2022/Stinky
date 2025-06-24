import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  connectHackRF,
  disconnectHackRF,
  spectrumData,
  hackrfStatus,
  signalHistory,
  isConnected,
  updateHackRFConfig
} from './hackrf'

// Mock WebSocketClient
vi.mock('$lib/services/websocket/WebSocketClient', () => {
  return {
    WebSocketClient: vi.fn().mockImplementation((config, events) => {
      return {
        isConnected: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        events
      }
    })
  }
})

describe('HackRF WebSocket Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores
    disconnectHackRF()
  })
  
  afterEach(() => {
    disconnectHackRF()
  })
  
  describe('connection management', () => {
    it('should initialize with disconnected state', () => {
      expect(get(isConnected)).toBe(false)
      expect(get(spectrumData)).toBeNull()
      expect(get(hackrfStatus)).toBeNull()
    })
    
    it('should connect to WebSocket', async () => {
      const { WebSocketClient } = await import('$lib/services/websocket/WebSocketClient')
      
      connectHackRF('ws://test:8092')
      
      expect(WebSocketClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'ws://test:8092',
          reconnection: true
        }),
        expect.any(Object)
      )
    })
    
    it('should handle connection events', async () => {
      const { WebSocketClient } = await import('$lib/services/websocket/WebSocketClient')
      
      connectHackRF()
      
      // Get the event handlers
      const mockInstance = (WebSocketClient as any).mock.results[0].value
      const events = mockInstance.events
      
      // Simulate connection
      events.onConnect()
      expect(get(isConnected)).toBe(false) // Because mock isConnected is false
      
      // Simulate error
      const error = new Error('Test error')
      events.onError(error)
      // Error handling is internal, just verify it doesn't crash
    })
  })
  
  describe('data handling', () => {
    it('should update spectrum data on message', async () => {
      const { WebSocketClient } = await import('$lib/services/websocket/WebSocketClient')
      
      connectHackRF()
      
      const mockInstance = (WebSocketClient as any).mock.results[0].value
      const events = mockInstance.events
      
      const testSpectrum = {
        frequency: 433000000,
        magnitude: [10, 20, 30],
        sampleRate: 2000000,
        centerFrequency: 433000000,
        timestamp: Date.now()
      }
      
      events.onMessage({
        type: 'spectrum',
        payload: testSpectrum,
        timestamp: Date.now()
      })
      
      expect(get(spectrumData)).toEqual(testSpectrum)
      expect(get(signalHistory)).toHaveLength(1)
    })
    
    it('should update status on message', async () => {
      const { WebSocketClient } = await import('$lib/services/websocket/WebSocketClient')
      
      connectHackRF()
      
      const mockInstance = (WebSocketClient as any).mock.results[0].value
      const events = mockInstance.events
      
      const testStatus = {
        connected: true,
        frequency: 433000000,
        sampleRate: 2000000,
        gain: 30,
        amplifierEnabled: false
      }
      
      events.onMessage({
        type: 'status',
        payload: testStatus,
        timestamp: Date.now()
      })
      
      expect(get(hackrfStatus)).toEqual(testStatus)
    })
    
    it('should limit signal history to 100 entries', async () => {
      const { WebSocketClient } = await import('$lib/services/websocket/WebSocketClient')
      
      connectHackRF()
      
      const mockInstance = (WebSocketClient as any).mock.results[0].value
      const events = mockInstance.events
      
      // Add 150 spectrum messages
      for (let i = 0; i < 150; i++) {
        events.onMessage({
          type: 'spectrum',
          payload: {
            frequency: 433000000,
            magnitude: [i],
            sampleRate: 2000000,
            centerFrequency: 433000000,
            timestamp: Date.now() + i
          },
          timestamp: Date.now()
        })
      }
      
      const history = get(signalHistory)
      expect(history).toHaveLength(100)
      // Should have kept the last 100 entries
      expect(history[0].magnitude[0]).toBe(50)
      expect(history[99].magnitude[0]).toBe(149)
    })
  })
  
  describe('config updates', () => {
    it('should send config updates when connected', async () => {
      const { WebSocketClient } = await import('$lib/services/websocket/WebSocketClient')
      
      connectHackRF()
      
      const mockInstance = (WebSocketClient as any).mock.results[0].value
      mockInstance.isConnected = true
      
      const config = { frequency: 915000000, gain: 40 }
      updateHackRFConfig(config)
      
      expect(mockInstance.emit).toHaveBeenCalledWith('config_update', config)
    })
    
    it('should throw error when not connected', () => {
      expect(() => {
        updateHackRFConfig({ frequency: 915000000 })
      }).toThrow('HackRF WebSocket not connected')
    })
  })
})