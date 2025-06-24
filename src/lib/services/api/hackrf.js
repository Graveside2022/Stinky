import { BaseAPIService } from './base.js'

class HackRFAPIService extends BaseAPIService {
  constructor() {
    super('/api/hackrf')
  }
  
  // Get current HackRF status
  async getStatus() {
    return this.get('/status')
  }
  
  // Get device info
  async getDeviceInfo() {
    return this.get('/device_info')
  }
  
  // Start spectrum scan
  async startScan(config) {
    return this.post('/scan/start', config)
  }
  
  // Stop spectrum scan
  async stopScan() {
    return this.post('/scan/stop')
  }
  
  // Update frequency
  async updateFrequency(frequency) {
    return this.post('/frequency', { frequency })
  }
  
  // Update gain
  async updateGain(gain) {
    return this.post('/gain', { gain })
  }
  
  // Update sample rate
  async updateSampleRate(sampleRate) {
    return this.post('/sample_rate', { sample_rate: sampleRate })
  }
  
  // Get frequency bands
  async getFrequencyBands() {
    return this.get('/bands')
  }
  
  // Save current configuration
  async saveConfig(config) {
    return this.post('/config', config)
  }
  
  // Load saved configuration
  async loadConfig() {
    return this.get('/config')
  }
  
  // Record spectrum data
  async startRecording(filename) {
    return this.post('/record/start', { filename })
  }
  
  async stopRecording() {
    return this.post('/record/stop')
  }
  
  // Get recorded files
  async getRecordings() {
    return this.get('/recordings')
  }
  
  // Download recording
  async downloadRecording(filename) {
    return this.get(`/recordings/${filename}`, {
      responseType: 'blob'
    })
  }
}

export const hackrfAPI = new HackRFAPIService()