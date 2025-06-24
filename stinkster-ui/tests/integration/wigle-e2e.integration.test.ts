import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testUtils } from './setup'
import type { WifiDevice, WigleConfig } from '$lib/services/api/types'

describe('WigleToTAK End-to-End Integration', () => {
  let wsConnection: WebSocket | null = null

  beforeAll(async () => {
    // Ensure backend is healthy
    const health = await testUtils.makeRequest('/api/health')
    expect(health.ok).toBe(true)
  })

  afterAll(async () => {
    if (wsConnection) {
      wsConnection.close()
    }
  })

  beforeEach(async () => {
    // Clear devices before each test
    await testUtils.makeRequest('/api/devices/clear', { method: 'POST' })
  })

  describe('Complete Workflow', () => {
    it('uploads file, processes devices, and broadcasts to TAK', async () => {
      // 1. Upload a WiGLE file
      const mockFile = testUtils.createMockWigleFile(5)
      const uploadResponse = await testUtils.uploadFile('/api/files/upload', mockFile)
      
      expect(uploadResponse.ok).toBe(true)
      expect(uploadResponse.data).toMatchObject({
        filename: 'test.wiglecsv',
        size: expect.any(Number),
        processed: false
      })

      // 2. Process the file
      const processResponse = await testUtils.makeRequest(
        `/api/files/${uploadResponse.data.filename}/process`,
        { method: 'POST' }
      )
      
      expect(processResponse.ok).toBe(true)
      expect(processResponse.data.deviceCount).toBe(5)

      // 3. Verify devices were extracted
      const devicesResponse = await testUtils.makeRequest('/api/devices')
      
      expect(devicesResponse.ok).toBe(true)
      expect(devicesResponse.data.data).toHaveLength(5)
      expect(devicesResponse.data.total).toBe(5)

      // 4. Configure TAK settings
      const takConfig: WigleConfig = {
        takServer: '127.0.0.1',
        takPort: 8089,
        callsign: 'TEST-1',
        team: 'Blue',
        role: 'Team Member',
        antennaHeight: 1.5,
        scanInterval: 5
      }
      
      const configResponse = await testUtils.makeRequest('/api/tak/config', {
        method: 'PUT',
        body: JSON.stringify(takConfig)
      })
      
      expect(configResponse.ok).toBe(true)

      // 5. Start TAK broadcast
      const startResponse = await testUtils.makeRequest('/api/tak/start', {
        method: 'POST'
      })
      
      expect(startResponse.ok).toBe(true)
      expect(startResponse.data.success).toBe(true)

      // 6. Wait for TAK messages to be generated
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 7. Get TAK messages
      const messagesResponse = await testUtils.makeRequest('/api/tak/messages')
      
      expect(messagesResponse.ok).toBe(true)
      expect(messagesResponse.data).toBeInstanceOf(Array)
      expect(messagesResponse.data.length).toBeGreaterThan(0)
      
      const takMessage = messagesResponse.data[0]
      expect(takMessage).toMatchObject({
        uid: expect.stringContaining('WIGLE'),
        type: expect.any(String),
        how: 'm-g',
        point: {
          lat: expect.any(Number),
          lon: expect.any(Number)
        }
      })

      // 8. Stop TAK broadcast
      const stopResponse = await testUtils.makeRequest('/api/tak/stop', {
        method: 'POST'
      })
      
      expect(stopResponse.ok).toBe(true)
    })

    it('handles real-time device updates via WebSocket', async () => {
      // 1. Connect to WebSocket
      const wsUrl = testUtils.baseUrl.replace('http', 'ws') + '/ws'
      wsConnection = await testUtils.waitForWebSocket(wsUrl)
      
      const messages: any[] = []
      wsConnection.onmessage = (event) => {
        messages.push(JSON.parse(event.data))
      }

      // 2. Subscribe to device updates
      wsConnection.send(JSON.stringify({
        type: 'subscribe',
        channel: 'devices'
      }))

      // Wait for subscription confirmation
      await new Promise(resolve => setTimeout(resolve, 500))

      // 3. Add a device via API
      const newDevice: Partial<WifiDevice> = {
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'WebSocketTest',
        manufacturer: 'TestCorp',
        type: 'AP',
        channel: 6,
        frequency: 2437,
        signal: -65,
        latitude: 40.7128,
        longitude: -74.0060
      }

      const addResponse = await testUtils.makeRequest('/api/devices', {
        method: 'POST',
        body: JSON.stringify(newDevice)
      })
      
      expect(addResponse.ok).toBe(true)

      // 4. Wait for WebSocket notification
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 5. Verify WebSocket message
      const deviceUpdate = messages.find(msg => 
        msg.type === 'device_update' && msg.data?.mac === 'AA:BB:CC:DD:EE:FF'
      )
      
      expect(deviceUpdate).toBeDefined()
      expect(deviceUpdate.data).toMatchObject({
        mac: 'AA:BB:CC:DD:EE:FF',
        ssid: 'WebSocketTest'
      })
    })

    it('applies filters and antenna adjustments', async () => {
      // 1. Upload test data
      const mockFile = testUtils.createMockWigleFile(20)
      await testUtils.uploadFile('/api/files/upload', mockFile)

      // 2. Set antenna configuration
      const antennaConfig = {
        height: 2.0,
        gain: 5.0,
        type: 'omnidirectional'
      }
      
      const antennaResponse = await testUtils.makeRequest('/api/antenna/config', {
        method: 'PUT',
        body: JSON.stringify(antennaConfig)
      })
      
      expect(antennaResponse.ok).toBe(true)

      // 3. Get devices with filters
      const filteredResponse = await testUtils.makeRequest(
        '/api/devices?signalMin=-70&type=AP&limit=10'
      )
      
      expect(filteredResponse.ok).toBe(true)
      expect(filteredResponse.data.data.every((d: WifiDevice) => 
        d.signal >= -70 && d.type === 'AP'
      )).toBe(true)

      // 4. Verify antenna adjustments were applied
      const device = filteredResponse.data.data[0]
      expect(device).toHaveProperty('adjustedSignal')
      expect(device.adjustedSignal).toBeGreaterThanOrEqual(device.signal)
    })

    it('exports and imports configuration', async () => {
      // 1. Set custom configuration
      const customConfig: WigleConfig = {
        takServer: '192.168.1.100',
        takPort: 8087,
        callsign: 'EXPORT-TEST',
        team: 'Red',
        role: 'Team Lead',
        antennaHeight: 3.0,
        scanInterval: 60
      }
      
      await testUtils.makeRequest('/api/tak/config', {
        method: 'PUT',
        body: JSON.stringify(customConfig)
      })

      // 2. Export configuration
      const exportResponse = await testUtils.makeRequest('/api/config/export')
      
      expect(exportResponse.ok).toBe(true)
      expect(exportResponse.data).toMatchObject({
        version: expect.any(String),
        exportTime: expect.any(String),
        config: expect.objectContaining({
          tak: expect.objectContaining({
            callsign: 'EXPORT-TEST'
          })
        })
      })

      // 3. Reset configuration
      await testUtils.makeRequest('/api/tak/config/reset', { method: 'POST' })

      // 4. Import configuration
      const importResponse = await testUtils.makeRequest('/api/config/import', {
        method: 'POST',
        body: JSON.stringify(exportResponse.data)
      })
      
      expect(importResponse.ok).toBe(true)

      // 5. Verify imported configuration
      const verifyResponse = await testUtils.makeRequest('/api/tak/config')
      
      expect(verifyResponse.ok).toBe(true)
      expect(verifyResponse.data.callsign).toBe('EXPORT-TEST')
    })

    it('handles geofencing and alerts', async () => {
      // 1. Create geofence
      const geofence = {
        name: 'Test Zone',
        type: 'circle',
        center: { lat: 40.7128, lon: -74.0060 },
        radius: 1000, // meters
        alerts: {
          onEnter: true,
          onExit: true,
          onDwell: true,
          dwellTime: 300 // 5 minutes
        }
      }
      
      const geofenceResponse = await testUtils.makeRequest('/api/geofence', {
        method: 'POST',
        body: JSON.stringify(geofence)
      })
      
      expect(geofenceResponse.ok).toBe(true)
      const geofenceId = geofenceResponse.data.id

      // 2. Add device inside geofence
      const deviceInside: Partial<WifiDevice> = {
        mac: '11:11:11:11:11:11',
        ssid: 'InsideDevice',
        latitude: 40.7128,
        longitude: -74.0060,
        signal: -60
      }
      
      await testUtils.makeRequest('/api/devices', {
        method: 'POST',
        body: JSON.stringify(deviceInside)
      })

      // 3. Check for alerts
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const alertsResponse = await testUtils.makeRequest('/api/alerts')
      
      expect(alertsResponse.ok).toBe(true)
      expect(alertsResponse.data).toContainEqual(
        expect.objectContaining({
          type: 'geofence_enter',
          deviceMac: '11:11:11:11:11:11',
          geofenceId: geofenceId
        })
      )

      // 4. Move device outside geofence
      await testUtils.makeRequest('/api/devices/11:11:11:11:11:11', {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: 40.7500,
          longitude: -74.0000
        })
      })

      // 5. Check for exit alert
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const exitAlertsResponse = await testUtils.makeRequest('/api/alerts')
      
      expect(exitAlertsResponse.ok).toBe(true)
      expect(exitAlertsResponse.data).toContainEqual(
        expect.objectContaining({
          type: 'geofence_exit',
          deviceMac: '11:11:11:11:11:11',
          geofenceId: geofenceId
        })
      )
    })

    it('generates statistics and reports', async () => {
      // 1. Upload and process multiple files
      for (let i = 0; i < 3; i++) {
        const file = testUtils.createMockWigleFile(10 + i * 5)
        const uploadResponse = await testUtils.uploadFile('/api/files/upload', file, `scan${i}.wiglecsv`)
        await testUtils.makeRequest(`/api/files/${uploadResponse.data.filename}/process`, {
          method: 'POST'
        })
      }

      // 2. Get device statistics
      const statsResponse = await testUtils.makeRequest('/api/stats/devices')
      
      expect(statsResponse.ok).toBe(true)
      expect(statsResponse.data).toMatchObject({
        totalDevices: expect.any(Number),
        accessPoints: expect.any(Number),
        clients: expect.any(Number),
        manufacturers: expect.any(Object),
        channelDistribution: expect.any(Object),
        signalDistribution: expect.any(Object),
        lastUpdateTime: expect.any(String)
      })

      // 3. Get activity timeline
      const timelineResponse = await testUtils.makeRequest(
        '/api/stats/timeline?interval=hour&duration=24'
      )
      
      expect(timelineResponse.ok).toBe(true)
      expect(timelineResponse.data).toBeInstanceOf(Array)
      expect(timelineResponse.data[0]).toMatchObject({
        timestamp: expect.any(String),
        deviceCount: expect.any(Number),
        newDevices: expect.any(Number)
      })

      // 4. Generate report
      const reportResponse = await testUtils.makeRequest('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'summary',
          format: 'json',
          dateRange: {
            start: new Date(Date.now() - 86400000).toISOString(),
            end: new Date().toISOString()
          }
        })
      })
      
      expect(reportResponse.ok).toBe(true)
      expect(reportResponse.data).toMatchObject({
        reportId: expect.any(String),
        generatedAt: expect.any(String),
        summary: expect.objectContaining({
          totalDevices: expect.any(Number),
          totalScans: expect.any(Number),
          coverage: expect.any(Object)
        })
      })
    })

    it('handles concurrent operations', async () => {
      // Test concurrent file uploads and processing
      const uploadPromises = Array.from({ length: 5 }, async (_, i) => {
        const file = testUtils.createMockWigleFile(20)
        return testUtils.uploadFile('/api/files/upload', file, `concurrent${i}.wiglecsv`)
      })
      
      const uploadResults = await Promise.all(uploadPromises)
      
      expect(uploadResults.every(r => r.ok)).toBe(true)
      
      // Process all files concurrently
      const processPromises = uploadResults.map(upload =>
        testUtils.makeRequest(`/api/files/${upload.data.filename}/process`, {
          method: 'POST'
        })
      )
      
      const processResults = await Promise.all(processPromises)
      
      expect(processResults.every(r => r.ok)).toBe(true)
      
      // Verify all devices were added
      const devicesResponse = await testUtils.makeRequest('/api/devices?limit=200')
      
      expect(devicesResponse.ok).toBe(true)
      expect(devicesResponse.data.total).toBe(100) // 5 files * 20 devices each
    })

    it('validates error handling and recovery', async () => {
      // 1. Test invalid file upload
      const invalidFile = new File(['invalid content'], 'bad.txt', { type: 'text/plain' })
      const invalidUpload = await testUtils.uploadFile('/api/files/upload', invalidFile)
      
      expect(invalidUpload.ok).toBe(false)
      expect(invalidUpload.status).toBe(400)
      
      // 2. Test invalid TAK configuration
      const invalidConfig = {
        takServer: 'invalid..ip',
        takPort: 99999,
        callsign: '!!!invalid!!!'
      }
      
      const invalidConfigResponse = await testUtils.makeRequest('/api/tak/config', {
        method: 'PUT',
        body: JSON.stringify(invalidConfig)
      })
      
      expect(invalidConfigResponse.ok).toBe(false)
      expect(invalidConfigResponse.data.errors).toBeDefined()
      
      // 3. Test recovery after error
      const validConfig: WigleConfig = {
        takServer: '127.0.0.1',
        takPort: 8087,
        callsign: 'VALID-1',
        team: 'Blue',
        role: 'Team Member',
        antennaHeight: 1.5,
        scanInterval: 30
      }
      
      const recoveryResponse = await testUtils.makeRequest('/api/tak/config', {
        method: 'PUT',
        body: JSON.stringify(validConfig)
      })
      
      expect(recoveryResponse.ok).toBe(true)
    })
  })
})