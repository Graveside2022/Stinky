/**
 * System Status and Health Monitoring Routes
 * Provides comprehensive system status including data from port 8002 functionality
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import winston from 'winston';

const execAsync = promisify(exec);
const router = Router();

// Service URLs for monitoring
const KISMET_OPERATIONS_URL = process.env.KISMET_OPERATIONS_URL || 'http://localhost:8002';
const OPENWEBRX_URL = process.env.OPENWEBRX_URL || 'http://localhost:8073';
const SPECTRUM_ANALYZER_URL = process.env.SPECTRUM_ANALYZER_URL || 'http://localhost:8092';

interface SystemStatus {
  timestamp: number;
  services: {
    backend: any;
    kismetOps: any;
    openwebrx: any;
    spectrumAnalyzer: any;
    kismet: any;
    gpsd: any;
  };
  system: {
    cpu: number;
    memory: any;
    disk: any;
    temperature: number;
    loadAverage: number[];
    uptime: number;
  };
  processes: {
    kismet: any;
    wigletotak: any;
    mavgps: any;
    openwebrx: any;
  };
  connectivity: {
    internet: boolean;
    dns: boolean;
    services: Record<string, boolean>;
  };
}

/**
 * GET /api/system/status
 * Comprehensive system status including all services
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status: SystemStatus = {
      timestamp: Date.now(),
      services: {
        backend: null,
        kismetOps: null,
        openwebrx: null,
        spectrumAnalyzer: null,
        kismet: null,
        gpsd: null
      },
      system: {
        cpu: 0,
        memory: {},
        disk: {},
        temperature: 0,
        loadAverage: [],
        uptime: process.uptime()
      },
      processes: {
        kismet: null,
        wigletotak: null,
        mavgps: null,
        openwebrx: null
      },
      connectivity: {
        internet: false,
        dns: false,
        services: {}
      }
    };

    // Check all services in parallel
    const serviceChecks = await Promise.allSettled([
      // Check Kismet Operations (port 8002 functionality)
      axios.get(`${KISMET_OPERATIONS_URL}/health`, { timeout: 3000 })
        .then(response => ({ kismetOps: response.data })),
      
      // Check OpenWebRX
      axios.get(`${OPENWEBRX_URL}/status`, { timeout: 3000 })
        .then(response => ({ openwebrx: response.data })),
      
      // Check Spectrum Analyzer
      axios.get(`${SPECTRUM_ANALYZER_URL}/api/status`, { timeout: 3000 })
        .then(response => ({ spectrumAnalyzer: response.data })),
      
      // Check GPSD
      execAsync('timeout 2 nc -z localhost 2947').then(() => ({ gpsd: { running: true } })),
      
      // System metrics
      getSystemMetrics(),
      
      // Process information
      getProcessInfo(),
      
      // Connectivity tests
      getConnectivityInfo()
    ]);

    // Process service check results
    serviceChecks.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.kismetOps) status.services.kismetOps = data.kismetOps;
        if (data.openwebrx) status.services.openwebrx = data.openwebrx;
        if (data.spectrumAnalyzer) status.services.spectrumAnalyzer = data.spectrumAnalyzer;
        if (data.gpsd) status.services.gpsd = data.gpsd;
        if (data.system) status.system = { ...status.system, ...data.system };
        if (data.processes) status.processes = data.processes;
        if (data.connectivity) status.connectivity = data.connectivity;
      }
    });

    // Mark connectivity for each service
    status.connectivity.services = {
      kismetOps: !!status.services.kismetOps,
      openwebrx: !!status.services.openwebrx,
      spectrumAnalyzer: !!status.services.spectrumAnalyzer,
      gpsd: !!status.services.gpsd
    };

    res.json({
      success: true,
      data: status,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/system/health
 * Quick health check with minimal data
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const checks = await Promise.allSettled([
      axios.get(`${KISMET_OPERATIONS_URL}/health`, { timeout: 2000 }),
      axios.get(`${SPECTRUM_ANALYZER_URL}/api/status`, { timeout: 2000 }),
      execAsync('timeout 1 nc -z localhost 2947') // GPSD check
    ]);

    const health = {
      status: 'healthy',
      services: {
        backend: 'running',
        kismetOps: checks[0].status === 'fulfilled' ? 'running' : 'unavailable',
        spectrumAnalyzer: checks[1].status === 'fulfilled' ? 'running' : 'unavailable',
        gpsd: checks[2].status === 'fulfilled' ? 'running' : 'unavailable'
      },
      uptime: process.uptime(),
      timestamp: Date.now()
    };

    // Determine overall health
    const runningServices = Object.values(health.services).filter(s => s === 'running').length;
    if (runningServices < 2) {
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/system/metrics
 * Real-time system performance metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics.system,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/system/services
 * Detailed service status and control
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const services = await Promise.allSettled([
      // Check systemd services
      execAsync('systemctl is-active kismet').then(result => ({ kismet: result.stdout.trim() === 'active' })),
      execAsync('systemctl is-active gpsd').then(result => ({ gpsd: result.stdout.trim() === 'active' })),
      
      // Check processes
      execAsync('pgrep -f "spectrum_analyzer"').then(() => ({ spectrumAnalyzer: true })),
      execAsync('pgrep -f "WigleToTak"').then(() => ({ wigletotak: true })),
      execAsync('pgrep -f "mavgps"').then(() => ({ mavgps: true })),
      execAsync('docker ps --filter "name=openwebrx" --format "{{.Status}}"').then(result => ({
        openwebrx: result.stdout.includes('Up')
      }))
    ]);

    const serviceStatus: Record<string, any> = {};
    services.forEach(result => {
      if (result.status === 'fulfilled') {
        Object.assign(serviceStatus, result.value);
      }
    });

    res.json({
      success: true,
      data: serviceStatus,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/system/service/:name/restart
 * Restart a system service
 */
router.post('/service/:name/restart', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const allowedServices = ['kismet', 'gpsd'];

    if (!allowedServices.includes(name)) {
      return res.status(400).json({
        success: false,
        error: 'Service not allowed for restart',
        timestamp: Date.now()
      });
    }

    await execAsync(`sudo systemctl restart ${name}`);
    
    // Wait a moment and check status
    await new Promise(resolve => setTimeout(resolve, 2000));
    const { stdout } = await execAsync(`systemctl is-active ${name}`);
    const isRunning = stdout.trim() === 'active';

    res.json({
      success: true,
      data: {
        service: name,
        action: 'restart',
        running: isRunning
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to restart service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart service',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

// Helper functions

async function getSystemMetrics(): Promise<{ system: any }> {
  try {
    const [cpu, memory, disk, temp, load] = await Promise.allSettled([
      // CPU usage
      execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"),
      
      // Memory info
      execAsync('free -m'),
      
      // Disk usage
      execAsync('df -h /'),
      
      // CPU temperature
      execAsync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0"'),
      
      // Load average
      execAsync('cat /proc/loadavg')
    ]);

    const systemMetrics: any = {
      cpu: 0,
      memory: {},
      disk: {},
      temperature: 0,
      loadAverage: [],
      uptime: process.uptime()
    };

    if (cpu.status === 'fulfilled') {
      systemMetrics.cpu = parseFloat(cpu.value.stdout.trim()) || 0;
    }

    if (memory.status === 'fulfilled') {
      const memLines = memory.value.stdout.trim().split('\n');
      const memData = memLines[1].split(/\s+/);
      systemMetrics.memory = {
        total: parseInt(memData[1]),
        used: parseInt(memData[2]),
        free: parseInt(memData[3]),
        available: parseInt(memData[6] || memData[3]),
        percentage: Math.round((parseInt(memData[2]) / parseInt(memData[1])) * 100)
      };
    }

    if (disk.status === 'fulfilled') {
      const diskLines = disk.value.stdout.trim().split('\n');
      const diskData = diskLines[1].split(/\s+/);
      systemMetrics.disk = {
        total: diskData[1],
        used: diskData[2],
        available: diskData[3],
        percentage: parseInt(diskData[4])
      };
    }

    if (temp.status === 'fulfilled') {
      const tempValue = parseInt(temp.value.stdout.trim());
      systemMetrics.temperature = tempValue > 1000 ? tempValue / 1000 : tempValue;
    }

    if (load.status === 'fulfilled') {
      const loads = load.value.stdout.trim().split(' ').slice(0, 3);
      systemMetrics.loadAverage = loads.map(parseFloat);
    }

    return { system: systemMetrics };
  } catch (error) {
    throw new Error(`Failed to get system metrics: ${error}`);
  }
}

async function getProcessInfo(): Promise<{ processes: any }> {
  try {
    const processes = await Promise.allSettled([
      execAsync('pgrep -f kismet').then(result => ({
        kismet: { running: true, pids: result.stdout.trim().split('\n').filter(Boolean) }
      })),
      execAsync('pgrep -f WigleToTak').then(result => ({
        wigletotak: { running: true, pids: result.stdout.trim().split('\n').filter(Boolean) }
      })),
      execAsync('pgrep -f mavgps').then(result => ({
        mavgps: { running: true, pids: result.stdout.trim().split('\n').filter(Boolean) }
      })),
      execAsync('docker ps --filter "name=openwebrx" --format "{{.ID}}"').then(result => ({
        openwebrx: { running: result.stdout.trim() !== '', containerIds: [result.stdout.trim()] }
      }))
    ]);

    const processInfo: any = {};
    processes.forEach(result => {
      if (result.status === 'fulfilled') {
        Object.assign(processInfo, result.value);
      } else {
        // Set default values for failed checks
        const errorKey = result.reason?.message?.includes('kismet') ? 'kismet' :
                         result.reason?.message?.includes('WigleToTak') ? 'wigletotak' :
                         result.reason?.message?.includes('mavgps') ? 'mavgps' :
                         result.reason?.message?.includes('openwebrx') ? 'openwebrx' : 'unknown';
        if (errorKey !== 'unknown') {
          processInfo[errorKey] = { running: false, pids: [] };
        }
      }
    });

    return { processes: processInfo };
  } catch (error) {
    throw new Error(`Failed to get process info: ${error}`);
  }
}

async function getConnectivityInfo(): Promise<{ connectivity: any }> {
  try {
    const connectivity = await Promise.allSettled([
      // Internet connectivity
      execAsync('timeout 3 ping -c 1 8.8.8.8').then(() => ({ internet: true })),
      
      // DNS resolution
      execAsync('timeout 3 nslookup google.com').then(() => ({ dns: true }))
    ]);

    const connectivityInfo: any = {
      internet: false,
      dns: false,
      services: {}
    };

    connectivity.forEach(result => {
      if (result.status === 'fulfilled') {
        Object.assign(connectivityInfo, result.value);
      }
    });

    return { connectivity: connectivityInfo };
  } catch (error) {
    return { connectivity: { internet: false, dns: false, services: {} } };
  }
}

export default router;