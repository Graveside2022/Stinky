import { writable, derived } from 'svelte/store'
import { createWebSocketStore } from './websocket.js'

// WigleToTAK specific stores
export const devices = writable([])
export const activeDevices = writable(new Map())
export const takStatus = writable('disconnected')
export const kismetStatus = writable('disconnected')
export const processingStatus = writable('idle')

// Create WebSocket connection for WigleToTAK
export const wigleWS = createWebSocketStore('/ws/wigle', {
  path: '/socket.io/'
})

// Subscribe to device updates
wigleWS.on('device_update', (data) => {
  devices.update(devs => {
    const existingIndex = devs.findIndex(d => d.mac === data.mac)
    if (existingIndex >= 0) {
      devs[existingIndex] = data
      return [...devs]
    }
    return [...devs, data]
  })
  
  // Update active devices map
  activeDevices.update(map => {
    map.set(data.mac, data)
    return new Map(map)
  })
})

// Subscribe to status updates
wigleWS.on('tak_status', (status) => {
  takStatus.set(status)
})

wigleWS.on('kismet_status', (status) => {
  kismetStatus.set(status)
})

wigleWS.on('processing_status', (status) => {
  processingStatus.set(status)
})

// Helper functions for WigleToTAK control
export function startProcessing() {
  wigleWS.emit('start_processing')
}

export function stopProcessing() {
  wigleWS.emit('stop_processing')
}

export function clearDevices() {
  devices.set([])
  activeDevices.set(new Map())
  wigleWS.emit('clear_devices')
}

export function exportToTAK(deviceMac) {
  wigleWS.emit('export_to_tak', { mac: deviceMac })
}

// Derived stores for UI
export const deviceCount = derived(devices, $devices => $devices.length)
export const activeDeviceCount = derived(activeDevices, $map => $map.size)
export const isProcessing = derived(processingStatus, $status => $status === 'processing')
export const systemReady = derived(
  [wigleWS.connected, kismetStatus, takStatus],
  ([$connected, $kismet, $tak]) => $connected && $kismet === 'connected' && $tak === 'connected'
)