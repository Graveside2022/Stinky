import { writable, derived } from 'svelte/store'
import { createWebSocketStore } from './websocket.js'

// HackRF specific stores
export const spectrumData = writable(null)
export const frequency = writable(915000000)
export const sampleRate = writable(20000000)
export const gain = writable(20)
export const scanStatus = writable('idle')

// Create WebSocket connection for HackRF
export const hackrfWS = createWebSocketStore('/ws/hackrf', {
  path: '/socket.io/'
})

// Subscribe to spectrum data
hackrfWS.on('spectrum_data', (data) => {
  spectrumData.set(data)
})

// Subscribe to status updates
hackrfWS.on('scan_status', (status) => {
  scanStatus.set(status)
})

// Helper functions for HackRF control
export function startScan() {
  hackrfWS.emit('start_scan', {
    frequency: frequency.get(),
    sample_rate: sampleRate.get(),
    gain: gain.get()
  })
}

export function stopScan() {
  hackrfWS.emit('stop_scan')
}

export function updateFrequency(freq) {
  frequency.set(freq)
  hackrfWS.emit('update_frequency', { frequency: freq })
}

export function updateGain(newGain) {
  gain.set(newGain)
  hackrfWS.emit('update_gain', { gain: newGain })
}

// Derived stores for UI
export const isScanning = derived(scanStatus, $status => $status === 'scanning')
export const canStartScan = derived(
  [hackrfWS.connected, scanStatus],
  ([$connected, $status]) => $connected && $status === 'idle'
)