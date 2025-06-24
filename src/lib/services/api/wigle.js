import { BaseAPIService } from './base.js'

class WigleToTAKAPIService extends BaseAPIService {
  constructor() {
    super('/api/wigle')
  }
  
  // Get current status
  async getStatus() {
    return this.get('/status')
  }
  
  // Get all devices
  async getDevices() {
    return this.get('/devices')
  }
  
  // Get device by MAC
  async getDevice(mac) {
    return this.get(`/devices/${mac}`)
  }
  
  // Clear device cache
  async clearDevices() {
    return this.post('/devices/clear')
  }
  
  // Start/stop processing
  async startProcessing() {
    return this.post('/processing/start')
  }
  
  async stopProcessing() {
    return this.post('/processing/stop')
  }
  
  // TAK operations
  async getTAKStatus() {
    return this.get('/tak/status')
  }
  
  async connectTAK(config) {
    return this.post('/tak/connect', config)
  }
  
  async disconnectTAK() {
    return this.post('/tak/disconnect')
  }
  
  async sendToTAK(deviceMac) {
    return this.post('/tak/send', { mac: deviceMac })
  }
  
  // Kismet operations
  async getKismetStatus() {
    return this.get('/kismet/status')
  }
  
  async getKismetFiles() {
    return this.get('/kismet/files')
  }
  
  async processKismetFile(filename) {
    return this.post('/kismet/process', { filename })
  }
  
  // Configuration
  async getConfig() {
    return this.get('/config')
  }
  
  async updateConfig(config) {
    return this.post('/config', config)
  }
  
  // Statistics
  async getStats() {
    return this.get('/stats')
  }
  
  // Export data
  async exportCSV() {
    return this.get('/export/csv', {
      responseType: 'blob'
    })
  }
  
  async exportJSON() {
    return this.get('/export/json')
  }
}

export const wigleAPI = new WigleToTAKAPIService()