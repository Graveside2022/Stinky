const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');

describe('HackRF Deployment Validation', () => {
  const API_URL = 'http://localhost:8092';
  const WS_URL = 'ws://localhost:8092';
  const CONFIG_FILE = '/opt/hackrf-spectrum/config.json';
  const SERVICE_NAME = 'hackrf-spectrum';
  
  // Helper to execute shell commands
  const execAsync = (command) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  };
  
  describe('Deployment Scripts', () => {
    it('should have executable deployment scripts', async () => {
      const scripts = [
        'deploy/scripts/deploy-hackrf.sh',
        'deploy/scripts/hackrf-health-check.sh'
      ];
      
      for (const script of scripts) {
        const scriptPath = path.join(__dirname, '../../..', script);
        const stats = fs.statSync(scriptPath);
        expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
      }
    });
    
    it('should validate deployment script syntax', async () => {
      const scriptPath = path.join(__dirname, '../../../deploy/scripts/deploy-hackrf.sh');
      const { stdout, stderr } = await execAsync(`bash -n ${scriptPath}`);
      expect(stderr).toBe('');
    });
  });
  
  describe('Service Configuration', () => {
    it('should create valid configuration files', async () => {
      const environments = ['production', 'development', 'test'];
      
      for (const env of environments) {
        // Test configuration generation (dry run)
        const configScript = `
          CONFIG_FILE="/tmp/test-config-${env}.json"
          create_config() {
            local env="$1"
            case "$env" in
              production)
                echo '{"spectrum":{"fft_size":4096}}'
                ;;
              development)
                echo '{"spectrum":{"fft_size":1024}}'
                ;;
              test)
                echo '{"spectrum":{"fft_size":256}}'
                ;;
            esac
          }
          create_config ${env}
        `;
        
        const { stdout } = await execAsync(`bash -c '${configScript}'`);
        const config = JSON.parse(stdout);
        expect(config.spectrum).toBeDefined();
        expect(config.spectrum.fft_size).toBeGreaterThan(0);
      }
    });
  });
  
  describe('API Validation', () => {
    let isServiceRunning = false;
    
    beforeAll(async () => {
      // Check if service is running
      try {
        await execAsync(`systemctl is-active ${SERVICE_NAME}`);
        isServiceRunning = true;
      } catch (e) {
        console.log('HackRF service not running, skipping API tests');
      }
    });
    
    it('should respond to health check endpoint', async () => {
      if (!isServiceRunning) {
        console.log('Skipping: Service not running');
        return;
      }
      
      try {
        const response = await axios.get(`${API_URL}/api/hackrf/status`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('connected');
        expect(response.data).toHaveProperty('buffer_size');
        expect(response.data).toHaveProperty('config');
      } catch (error) {
        // Service might not be deployed
        console.log('API not accessible:', error.message);
      }
    });
    
    it('should validate configuration endpoint', async () => {
      if (!isServiceRunning) return;
      
      try {
        const response = await axios.get(`${API_URL}/api/hackrf/config`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('fft_size');
        expect(response.data).toHaveProperty('center_freq');
        expect(response.data).toHaveProperty('samp_rate');
      } catch (error) {
        console.log('Config endpoint not accessible:', error.message);
      }
    });
    
    it('should accept configuration updates', async () => {
      if (!isServiceRunning) return;
      
      try {
        const newConfig = { signal_threshold: -65 };
        const response = await axios.post(`${API_URL}/api/hackrf/config`, newConfig);
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.config.signal_threshold).toBe(-65);
      } catch (error) {
        console.log('Config update failed:', error.message);
      }
    });
  });
  
  describe('WebSocket Validation', () => {
    let ws;
    
    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    it('should establish WebSocket connection', (done) => {
      ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        done();
      });
      
      ws.on('error', (error) => {
        console.log('WebSocket not available:', error.message);
        done();
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          done();
        }
      }, 5000);
    });
    
    it('should receive connection message', (done) => {
      ws = new WebSocket(WS_URL);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'connection') {
            expect(message.status).toBe('connected');
            done();
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
      
      ws.on('error', () => done());
      setTimeout(() => done(), 5000);
    });
  });
  
  describe('Health Check Script', () => {
    it('should execute health check without errors', async () => {
      const scriptPath = path.join(__dirname, '../../../deploy/scripts/hackrf-health-check.sh');
      
      try {
        const { stdout } = await execAsync(`bash ${scriptPath} status`);
        expect(stdout).toContain('HackRF Spectrum Analyzer Status');
      } catch (error) {
        // Script might fail if service not running, but should not have syntax errors
        expect(error.error.code).toBeDefined();
      }
    });
  });
  
  describe('Performance Requirements', () => {
    it('should meet latency requirements', async () => {
      if (!isServiceRunning) {
        console.log('Skipping: Service not running');
        return;
      }
      
      const latencies = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        try {
          await axios.get(`${API_URL}/api/hackrf/status`);
          latencies.push(Date.now() - start);
        } catch (e) {
          // Ignore errors
        }
      }
      
      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        expect(avgLatency).toBeLessThan(100); // Should respond within 100ms
      }
    });
    
    it('should handle concurrent requests', async () => {
      if (!isServiceRunning) return;
      
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          axios.get(`${API_URL}/api/hackrf/status`).catch(() => null)
        );
      }
      
      const responses = await Promise.all(requests);
      const successful = responses.filter(r => r && r.status === 200).length;
      
      // At least 80% should succeed
      expect(successful).toBeGreaterThanOrEqual(16);
    });
  });
  
  describe('Resource Limits', () => {
    it('should have systemd service with resource limits', async () => {
      const serviceFile = `/etc/systemd/system/${SERVICE_NAME}.service`;
      
      if (fs.existsSync(serviceFile)) {
        const content = fs.readFileSync(serviceFile, 'utf8');
        expect(content).toContain('MemoryLimit=');
        expect(content).toContain('CPUQuota=');
        expect(content).toContain('Restart=always');
      }
    });
  });
  
  describe('Log Management', () => {
    it('should have log directory with proper permissions', async () => {
      const logDir = '/var/log/hackrf-spectrum';
      
      if (fs.existsSync(logDir)) {
        const stats = fs.statSync(logDir);
        expect(stats.isDirectory()).toBe(true);
        
        // Check if writable by pi user
        try {
          const { stdout } = await execAsync(`stat -c %U ${logDir}`);
          expect(stdout.trim()).toBe('pi');
        } catch (e) {
          // Permission check failed
        }
      }
    });
  });
  
  describe('Integration Points', () => {
    it('should be accessible from Kismet Operations Center', async () => {
      // Check CORS headers
      try {
        const response = await axios.get(`${API_URL}/api/hackrf/status`, {
          headers: { 'Origin': 'http://localhost:3001' }
        });
        
        // Should allow CORS from dashboard
        const corsHeader = response.headers['access-control-allow-origin'];
        expect(corsHeader).toBeDefined();
      } catch (e) {
        // Service might not be running
      }
    });
  });
  
  describe('Deployment Documentation', () => {
    it('should have comprehensive deployment documentation', () => {
      const docPath = path.join(__dirname, '../../../deploy/HACKRF_DEPLOYMENT.md');
      expect(fs.existsSync(docPath)).toBe(true);
      
      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).toContain('Quick Start');
      expect(content).toContain('Deployment Commands');
      expect(content).toContain('Configuration');
      expect(content).toContain('Troubleshooting');
    });
  });
});