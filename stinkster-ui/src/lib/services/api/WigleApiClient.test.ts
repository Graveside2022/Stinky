import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WigleApiClient } from './WigleApiClient'
import type { WifiDevice, TAKMessage, WigleConfig } from './types'

// Mock fetch globally
global.fetch = vi.fn()

describe('WigleApiClient', () => {
  let client: WigleApiClient
  const baseURL = 'http://localhost:8000'

  beforeEach(() => {
    client = new WigleApiClient({ baseURL })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Device Management', () => {
    it('fetches devices with pagination', async () => {
      const mockResponse = {
        data: [
          { mac: 'AA:BB:CC:DD:EE:FF', ssid: 'Test1' },
          { mac: '11:22:33:44:55:66', ssid: 'Test2' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        hasNext: false,
        hasPrev: false
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.getDevices({ page: 1, limit: 20 })

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/devices?page=1&limit=20`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )

      expect(result.data).toEqual(mockResponse)
    })

    it('gets device by MAC address', async () => {
      const mockDevice: WifiDevice = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'TestNetwork',
        manufacturer: 'Apple',
        type: 'AP',
        channel: 6,
        frequency: 2437,
        signal: -65,
        lastSeen: Date.now(),
        latitude: 40.7128,
        longitude: -74.0060
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDevice,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.getDeviceByMac('AA:BB:CC:DD:EE:FF')

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/devices/AA:BB:CC:DD:EE:FF`,
        expect.any(Object)
      )

      expect(result.data).toEqual(mockDevice)
    })

    it('searches devices with filters', async () => {
      const filters = {
        ssid: 'Test',
        manufacturer: 'Apple',
        signalMin: -80,
        type: 'AP'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await client.searchDevices(filters)

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/devices/search?ssid=Test&manufacturer=Apple&signalMin=-80&type=AP`,
        expect.any(Object)
      )
    })

    it('updates device information', async () => {
      const updates = {
        manufacturer: 'Apple Inc.',
        notes: 'Updated device'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await client.updateDevice('AA:BB:CC:DD:EE:FF', updates)

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/devices/AA:BB:CC:DD:EE:FF`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates)
        })
      )
    })

    it('deletes device', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await client.deleteDevice('AA:BB:CC:DD:EE:FF')

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/devices/AA:BB:CC:DD:EE:FF`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  describe('File Management', () => {
    it('uploads WiGLE file', async () => {
      const file = new File(['test content'], 'test.wiglecsv', { type: 'text/csv' })
      const mockResponse = {
        filename: 'test.wiglecsv',
        size: 12,
        deviceCount: 5,
        uploadTime: Date.now()
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.uploadWigleFile(file)

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/files/upload`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )

      const formData = vi.mocked(fetch).mock.calls[0][1]?.body as FormData
      expect(formData.get('file')).toBe(file)

      expect(result.data).toEqual(mockResponse)
    })

    it('uploads file with progress tracking', async () => {
      const file = new File(['test'], 'test.wiglecsv', { type: 'text/csv' })
      const onProgress = vi.fn()

      // Mock XMLHttpRequest for progress tracking
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        setRequestHeader: vi.fn(),
        upload: {
          addEventListener: vi.fn((event, handler) => {
            if (event === 'progress') {
              // Simulate progress events
              setTimeout(() => handler({ loaded: 50, total: 100 }), 10)
              setTimeout(() => handler({ loaded: 100, total: 100 }), 20)
            }
          })
        },
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            setTimeout(() => {
              mockXHR.status = 200
              mockXHR.responseText = JSON.stringify({ success: true })
              handler()
            }, 30)
          }
        }),
        status: 0,
        responseText: ''
      }

      global.XMLHttpRequest = vi.fn(() => mockXHR) as any

      await client.uploadWigleFile(file, onProgress)

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ loaded: 50, total: 100 })
      )
    })

    it('gets list of WiGLE files', async () => {
      const mockFiles = [
        { filename: 'scan1.wiglecsv', size: 1024, deviceCount: 10 },
        { filename: 'scan2.wiglecsv', size: 2048, deviceCount: 20 }
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.getWigleFiles()

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/files`,
        expect.any(Object)
      )

      expect(result.data).toEqual(mockFiles)
    })

    it('downloads WiGLE file', async () => {
      const mockBlob = new Blob(['file content'], { type: 'text/csv' })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: new Headers({
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="test.wiglecsv"'
        }),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.downloadWigleFile('test.wiglecsv')

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/files/test.wiglecsv`,
        expect.any(Object)
      )

      expect(result.data).toBe(mockBlob)
    })

    it('processes WiGLE file', async () => {
      const mockResponse = {
        deviceCount: 25,
        processed: true,
        processingTime: 1500
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.processWigleFile('test.wiglecsv')

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/files/test.wiglecsv/process`,
        expect.objectContaining({
          method: 'POST'
        })
      )

      expect(result.data).toEqual(mockResponse)
    })

    it('deletes WiGLE file', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await client.deleteWigleFile('test.wiglecsv')

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/files/test.wiglecsv`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  describe('TAK Integration', () => {
    it('gets TAK configuration', async () => {
      const mockConfig: WigleConfig = {
        takServer: '192.168.1.100',
        takPort: 8087,
        callsign: 'WIGLE-1',
        team: 'Blue',
        role: 'Team Member',
        antennaHeight: 1.5,
        scanInterval: 30
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.getTAKConfig()

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/tak/config`,
        expect.any(Object)
      )

      expect(result.data).toEqual(mockConfig)
    })

    it('updates TAK configuration', async () => {
      const config: WigleConfig = {
        takServer: '10.0.0.1',
        takPort: 8089,
        callsign: 'WIGLE-2',
        team: 'Red',
        role: 'Team Lead',
        antennaHeight: 2.0,
        scanInterval: 60
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await client.updateTAKConfig(config)

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/tak/config`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(config)
        })
      )
    })

    it('tests TAK connection', async () => {
      const connectionInfo = {
        server: '192.168.1.100',
        port: 8087
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          message: 'Connection successful',
          latency: 25
        }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.testTAKConnection(connectionInfo)

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/tak/test`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(connectionInfo)
        })
      )

      expect(result.data.success).toBe(true)
    })

    it('starts TAK broadcast', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, pid: 12345 }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.startTAKBroadcast()

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/tak/start`,
        expect.objectContaining({
          method: 'POST'
        })
      )

      expect(result.data.success).toBe(true)
    })

    it('stops TAK broadcast', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await client.stopTAKBroadcast()

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/tak/stop`,
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('gets TAK messages', async () => {
      const mockMessages: TAKMessage[] = [
        {
          uid: 'WIGLE-1',
          type: 'a-f-G-U-C',
          how: 'm-g',
          time: new Date().toISOString(),
          start: new Date().toISOString(),
          stale: new Date(Date.now() + 300000).toISOString(),
          point: {
            lat: 40.7128,
            lon: -74.0060,
            hae: 10,
            ce: 5,
            le: 5
          },
          detail: {
            contact: { callsign: 'WIGLE-1' },
            group: { name: 'Blue', role: 'Team Member' }
          }
        }
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessages,
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      const result = await client.getTAKMessages({ limit: 10 })

      expect(fetch).toHaveBeenCalledWith(
        `${baseURL}/api/tak/messages?limit=10`,
        expect.any(Object)
      )

      expect(result.data).toEqual(mockMessages)
    })
  })

  describe('Error Handling', () => {
    it('handles 404 errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Device not found' }),
        headers: new Headers()
      } as Response)

      await expect(client.getDeviceByMac('NOTFOUND')).rejects.toThrow('Device not found')
    })

    it('handles 500 server errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Database error' }),
        headers: new Headers()
      } as Response)

      await expect(client.getDevices()).rejects.toThrow('Database error')
    })

    it('handles network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      await expect(client.getDevices()).rejects.toThrow('Network error')
    })

    it('handles timeout', async () => {
      const controller = new AbortController()
      
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })
      )

      const clientWithTimeout = new WigleApiClient({ 
        baseURL, 
        timeout: 50 
      })

      await expect(clientWithTimeout.getDevices()).rejects.toThrow()
    })

    it('retries failed requests', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
          headers: new Headers(),
          status: 200,
          statusText: 'OK'
        } as Response)

      const clientWithRetries = new WigleApiClient({ 
        baseURL, 
        retries: 3,
        retryDelay: 10 
      })

      const result = await clientWithRetries.getDevices()

      expect(fetch).toHaveBeenCalledTimes(3)
      expect(result.data).toEqual({ data: [] })
    })
  })

  describe('Request Interceptors', () => {
    it('adds authentication headers', async () => {
      const clientWithAuth = new WigleApiClient({
        baseURL,
        auth: {
          type: 'bearer',
          credentials: 'test-token'
        }
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await clientWithAuth.getDevices()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    it('adds custom headers', async () => {
      const clientWithHeaders = new WigleApiClient({
        baseURL,
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
        headers: new Headers(),
        status: 200,
        statusText: 'OK'
      } as Response)

      await clientWithHeaders.getDevices()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value'
          })
        })
      )
    })
  })
})