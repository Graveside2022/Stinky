import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get } from 'svelte/store'
import {
  connect,
  disconnect,
  isConnected,
  deviceList,
  connectionStats,
  sendMessage,
  subscribeToDevices,
  unsubscribeFromDevices,
  clearDevices
} from './wigle'
import type { WifiDevice } from '$lib/services/api/types'

// Mock socket.io
const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: false,
  id: 'test-socket-id'
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}))

describe('WigleToTAK WebSocket Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores
    disconnect()
    clearDevices()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Connection Management', () => {
    it('connects to WebSocket server', async () => {
      const url = 'http://localhost:8000'
      
      connect(url)
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
    })

    it('updates connection status on connect', () => {
      connect('http://localhost:8000')
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      
      mockSocket.connected = true
      connectHandler()
      
      expect(get(isConnected)).toBe(true)
    })

    it('updates connection status on disconnect', () => {
      connect('http://localhost:8000')
      
      // Simulate connection then disconnection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]
      
      mockSocket.connected = true
      connectHandler()
      
      mockSocket.connected = false
      disconnectHandler()
      
      expect(get(isConnected)).toBe(false)
    })

    it('handles connection errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      connect('http://localhost:8000')
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1]
      
      const error = new Error('Connection failed')
      errorHandler(error)
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket connection error:', error)
      expect(get(isConnected)).toBe(false)
      
      consoleSpy.mockRestore()
    })

    it('disconnects from server', () => {
      connect('http://localhost:8000')
      disconnect()
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockSocket.off).toHaveBeenCalled()
    })

    it('prevents multiple connections to same server', () => {
      const url = 'http://localhost:8000'
      
      connect(url)
      connect(url) // Second connection attempt
      
      // Should only create one connection
      expect(mockSocket.on).toHaveBeenCalledTimes(8) // 4 events * 2 = 8 if called twice
    })

    it('allows connection to different server', () => {
      connect('http://localhost:8000')
      disconnect()
      connect('http://localhost:8001')
      
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Device Updates', () => {
    beforeEach(() => {
      connect('http://localhost:8000')
    })

    it('receives device list updates', () => {
      const devices: WifiDevice[] = [
        {
          mac: 'AA:BB:CC:DD:EE:FF',
          ssid: 'TestNetwork',
          manufacturer: 'Apple',
          type: 'AP',
          channel: 6,
          frequency: 2437,
          signal: -65,
          lastSeen: Date.now()
        }
      ]
      
      const deviceListHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_list'
      )?.[1]
      
      deviceListHandler(devices)
      
      expect(get(deviceList)).toEqual(devices)
    })

    it('receives single device updates', () => {
      const newDevice: WifiDevice = {
        mac: '11:22:33:44:55:66',
        ssid: 'NewDevice',
        manufacturer: 'Samsung',
        type: 'Client',
        channel: 1,
        frequency: 2412,
        signal: -70,
        lastSeen: Date.now()
      }
      
      const deviceUpdateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_update'
      )?.[1]
      
      deviceUpdateHandler(newDevice)
      
      const devices = get(deviceList)
      expect(devices).toContainEqual(newDevice)
    })

    it('updates existing device', () => {
      const initialDevice: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'TestNetwork',
        signal: -65,
        lastSeen: Date.now() - 60000
      } as WifiDevice
      
      const deviceListHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_list'
      )?.[1]
      
      deviceListHandler([initialDevice])
      
      // Update the device
      const updatedDevice = {
        ...initialDevice,
        signal: -55,
        lastSeen: Date.now()
      }
      
      const deviceUpdateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_update'
      )?.[1]
      
      deviceUpdateHandler(updatedDevice)
      
      const devices = get(deviceList)
      expect(devices).toHaveLength(1)
      expect(devices[0].signal).toBe(-55)
    })

    it('removes devices', () => {
      const devices: WifiDevice[] = [
        { mac: 'AA:BB:CC:DD:EE:FF', ssid: 'Device1' } as WifiDevice,
        { mac: '11:22:33:44:55:66', ssid: 'Device2' } as WifiDevice
      ]
      
      const deviceListHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_list'
      )?.[1]
      
      deviceListHandler(devices)
      
      const deviceRemoveHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_remove'
      )?.[1]
      
      deviceRemoveHandler('AA:BB:CC:DD:EE:FF')
      
      const remainingDevices = get(deviceList)
      expect(remainingDevices).toHaveLength(1)
      expect(remainingDevices[0].mac).toBe('11:22:33:44:55:66')
    })

    it('clears all devices', () => {
      const devices: WifiDevice[] = [
        { mac: 'AA:BB:CC:DD:EE:FF', ssid: 'Device1' } as WifiDevice,
        { mac: '11:22:33:44:55:66', ssid: 'Device2' } as WifiDevice
      ]
      
      const deviceListHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_list'
      )?.[1]
      
      deviceListHandler(devices)
      expect(get(deviceList)).toHaveLength(2)
      
      clearDevices()
      expect(get(deviceList)).toHaveLength(0)
    })
  })

  describe('Connection Statistics', () => {
    beforeEach(() => {
      connect('http://localhost:8000')
    })

    it('updates connection statistics', () => {
      const stats = {
        connected: true,
        uptime: 3600,
        messagesReceived: 1500,
        messagesSent: 100,
        lastMessageTime: Date.now(),
        reconnectAttempts: 0,
        activeSubscriptions: 2
      }
      
      const statsHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connection_stats'
      )?.[1]
      
      statsHandler(stats)
      
      expect(get(connectionStats)).toEqual(stats)
    })

    it('tracks reconnection attempts', () => {
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_attempt'
      )?.[1]
      
      reconnectHandler(1)
      reconnectHandler(2)
      reconnectHandler(3)
      
      const stats = get(connectionStats)
      expect(stats.reconnectAttempts).toBe(3)
    })
  })

  describe('Message Sending', () => {
    beforeEach(() => {
      connect('http://localhost:8000')
      mockSocket.connected = true
    })

    it('sends messages when connected', () => {
      const message = { type: 'scan', data: { interval: 30 } }
      
      sendMessage('config_update', message)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('config_update', message)
    })

    it('queues messages when disconnected', () => {
      mockSocket.connected = false
      
      const message = { type: 'scan', data: { interval: 30 } }
      
      sendMessage('config_update', message)
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
      
      // Simulate reconnection
      mockSocket.connected = true
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]
      
      connectHandler()
      
      // Should send queued messages
      expect(mockSocket.emit).toHaveBeenCalledWith('config_update', message)
    })
  })

  describe('Subscriptions', () => {
    beforeEach(() => {
      connect('http://localhost:8000')
      mockSocket.connected = true
    })

    it('subscribes to device updates', () => {
      const filters = {
        type: 'AP',
        signalMin: -80
      }
      
      subscribeToDevices(filters)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_devices', filters)
    })

    it('unsubscribes from device updates', () => {
      unsubscribeFromDevices()
      
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe_devices')
    })

    it('handles subscription acknowledgment', () => {
      const ackHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscription_ack'
      )?.[1]
      
      ackHandler({ 
        subscribed: true, 
        filters: { type: 'AP' },
        deviceCount: 15 
      })
      
      const stats = get(connectionStats)
      expect(stats.activeSubscriptions).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      connect('http://localhost:8000')
    })

    it('handles server errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      const error = { message: 'Server error', code: 'SERVER_ERROR' }
      errorHandler(error)
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', error)
      
      consoleSpy.mockRestore()
    })

    it('handles malformed device data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const deviceUpdateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_update'
      )?.[1]
      
      // Send invalid device data
      deviceUpdateHandler({ invalid: 'data' })
      
      // Should not crash and devices should remain unchanged
      const devices = get(deviceList)
      expect(devices).toHaveLength(0)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Reconnection Logic', () => {
    it('implements exponential backoff', () => {
      const mockIo = vi.mocked(await import('socket.io-client')).io
      
      connect('http://localhost:8000', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      })
      
      expect(mockIo).toHaveBeenCalledWith(
        'http://localhost:8000',
        expect.objectContaining({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        })
      )
    })

    it('emits reconnection events', () => {
      connect('http://localhost:8000')
      
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )?.[1]
      
      reconnectHandler(3) // Reconnected after 3 attempts
      
      expect(get(isConnected)).toBe(true)
      expect(get(connectionStats).reconnectAttempts).toBe(0) // Reset after successful reconnect
    })
  })

  describe('Performance', () => {
    it('batches device updates', async () => {
      connect('http://localhost:8000')
      
      const deviceUpdateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_update'
      )?.[1]
      
      // Rapid fire updates
      const devices = Array.from({ length: 100 }, (_, i) => ({
        mac: `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0')}`,
        ssid: `Device${i}`,
        signal: -60 - i,
        lastSeen: Date.now()
      } as WifiDevice))
      
      devices.forEach(device => {
        deviceUpdateHandler(device)
      })
      
      // Should batch updates
      const deviceList = get(deviceList)
      expect(deviceList).toHaveLength(100)
    })

    it('limits device list size', () => {
      connect('http://localhost:8000')
      
      const deviceListHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'device_list'
      )?.[1]
      
      // Send more devices than the limit
      const devices = Array.from({ length: 1500 }, (_, i) => ({
        mac: `AA:BB:CC:DD:${Math.floor(i / 256).toString(16).padStart(2, '0')}:${(i % 256).toString(16).padStart(2, '0')}`,
        ssid: `Device${i}`,
        signal: -60,
        lastSeen: Date.now() - i * 1000
      } as WifiDevice))
      
      deviceListHandler(devices)
      
      const storedDevices = get(deviceList)
      expect(storedDevices.length).toBeLessThanOrEqual(1000) // Default max
    })
  })
})