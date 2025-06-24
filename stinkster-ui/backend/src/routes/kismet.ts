import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import type { Request, Response } from 'express';
import type { 
  KismetDeviceDetails, 
  KismetQueryOptions,
  KismetDeviceFilter,
  KismetDatasource,
  KismetAlertConfig,
  KismetPCAPOptions
} from '../types/kismet';
import type { 
  PaginatedRequest, 
  PaginatedResponse, 
  ApiResponse 
} from '../types';

const execAsync = promisify(exec);
const router = Router();

// Kismet service configuration
const KISMET_SERVICE = 'kismet';
const KISMET_API_URL = process.env.KISMET_API_URL || 'http://localhost:2501';
const KISMET_API_KEY = process.env.KISMET_API_KEY || '';
const KISMET_CONFIG_DIR = process.env.KISMET_CONFIG_DIR || '/etc/kismet';
const KISMET_LOG_DIR = process.env.KISMET_LOG_DIR || '/var/log/kismet';
const KISMET_SCRIPTS_DIR = '/home/pi/Scripts';

// Script configurations
const KISMET_SCRIPTS = {
  start: {
    path: '/home/pi/Scripts/start_kismet.sh',
    name: 'Start Kismet',
    description: 'Start Kismet with custom configuration'
  },
  stop: {
    path: 'pkill -f "kismet"',
    name: 'Stop Kismet',
    description: 'Stop all Kismet processes',
    isCommand: true
  },
  gps_kismet_wigle: {
    path: '/home/pi/stinky/gps_kismet_wigle.sh',
    name: 'GPS + Kismet + Wigle',
    description: 'Start GPS, Kismet, and WigleToTAK services'
  },
  monitor_mode: {
    path: '/home/pi/Scripts/monitor_mode.sh',
    name: 'Configure Monitor Mode',
    description: 'Set WiFi adapter to monitor mode'
  }
};

// Helper to check if service is running
async function isServiceRunning(serviceName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`systemctl is-active ${serviceName}`);
    return stdout.trim() === 'active';
  } catch {
    return false;
  }
}

// Service control endpoints
router.post('/service/start', async (req: Request, res: Response) => {
  try {
    // Check if already running
    const isRunning = await isServiceRunning(KISMET_SERVICE);
    if (isRunning) {
      return res.json({ success: true, message: 'Service already running' });
    }

    // Start the service
    await execAsync(`sudo systemctl start ${KISMET_SERVICE}`);
    
    // Wait a moment for service to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify it started
    const nowRunning = await isServiceRunning(KISMET_SERVICE);
    
    res.json({ 
      success: nowRunning, 
      message: nowRunning ? 'Service started successfully' : 'Failed to start service' 
    });
  } catch (error) {
    console.error('Failed to start Kismet service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/service/stop', async (req: Request, res: Response) => {
  try {
    // Check if running
    const isRunning = await isServiceRunning(KISMET_SERVICE);
    if (!isRunning) {
      return res.json({ success: true, message: 'Service already stopped' });
    }

    // Stop the service
    await execAsync(`sudo systemctl stop ${KISMET_SERVICE}`);
    
    res.json({ success: true, message: 'Service stopped successfully' });
  } catch (error) {
    console.error('Failed to stop Kismet service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stop service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/service/restart', async (req: Request, res: Response) => {
  try {
    await execAsync(`sudo systemctl restart ${KISMET_SERVICE}`);
    
    // Wait for service to come back up
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const isRunning = await isServiceRunning(KISMET_SERVICE);
    
    res.json({ 
      success: isRunning, 
      message: isRunning ? 'Service restarted successfully' : 'Service restart may have failed' 
    });
  } catch (error) {
    console.error('Failed to restart Kismet service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restart service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/service/status', async (req: Request, res: Response) => {
  try {
    const isRunning = await isServiceRunning(KISMET_SERVICE);
    
    let details = {};
    if (isRunning) {
      try {
        // Get detailed status from systemd
        const { stdout } = await execAsync(`systemctl status ${KISMET_SERVICE} --no-pager -n 0`);
        const pidMatch = stdout.match(/Main PID: (\d+)/);
        const memoryMatch = stdout.match(/Memory: ([\d.]+[MG]?)/);
        
        details = {
          pid: pidMatch ? parseInt(pidMatch[1]) : undefined,
          memory: memoryMatch ? memoryMatch[1] : undefined
        };
      } catch {
        // Ignore errors getting detailed status
      }
    }
    
    res.json({ 
      running: isRunning,
      service: KISMET_SERVICE,
      ...details
    });
  } catch (error) {
    console.error('Failed to check service status:', error);
    res.status(500).json({ 
      running: false, 
      error: 'Failed to check service status' 
    });
  }
});

// Kismet API proxy endpoints
router.get('/api/*', async (req: Request, res: Response) => {
  try {
    const path = req.params[0];
    const url = `${KISMET_API_URL}/${path}`;
    
    const headers: any = {
      'Accept': 'application/json'
    };
    
    if (KISMET_API_KEY) {
      headers['KISMET'] = KISMET_API_KEY;
    }
    
    const response = await axios.get(url, {
      headers,
      params: req.query
    });
    
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: 'Kismet API error',
        message: error.response?.data || error.message
      });
    } else {
      res.status(500).json({ error: 'Failed to proxy request' });
    }
  }
});

router.post('/api/*', async (req: Request, res: Response) => {
  try {
    const path = req.params[0];
    const url = `${KISMET_API_URL}/${path}`;
    
    const headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (KISMET_API_KEY) {
      headers['KISMET'] = KISMET_API_KEY;
    }
    
    const response = await axios.post(url, req.body, { headers });
    
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        error: 'Kismet API error',
        message: error.response?.data || error.message
      });
    } else {
      res.status(500).json({ error: 'Failed to proxy request' });
    }
  }
});

// Log streaming endpoint
router.get('/logs/stream', async (req: Request, res: Response) => {
  try {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Start streaming logs
    const child = exec(`sudo journalctl -u ${KISMET_SERVICE} -f -n 100 --no-pager`);
    
    child.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach((line: string) => {
        // Parse journalctl output
        const match = line.match(/^(\w+\s+\d+\s+[\d:]+)\s+\S+\s+(\S+)\[(\d+)\]:\s+(.*)$/);
        if (match) {
          const [, timestamp, service, pid, message] = match;
          const logEntry = {
            timestamp: new Date(timestamp).getTime() / 1000,
            type: detectLogLevel(message),
            message: message.trim(),
            source: service
          };
          res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        }
      });
    });
    
    child.stderr?.on('data', (data) => {
      console.error('Log streaming error:', data.toString());
    });
    
    // Clean up on client disconnect
    req.on('close', () => {
      child.kill();
    });
  } catch (error) {
    console.error('Failed to stream logs:', error);
    res.status(500).json({ error: 'Failed to stream logs' });
  }
});

function detectLogLevel(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('error') || lower.includes('failed')) return 'error';
  if (lower.includes('warning') || lower.includes('warn')) return 'warning';
  if (lower.includes('debug')) return 'debug';
  return 'info';
}

// ========== DEVICE AND NETWORK ENDPOINTS ==========

// Get all devices with pagination and filtering
router.get('/devices', async (req: Request<{}, {}, {}, PaginatedRequest & KismetDeviceFilter>, res: Response) => {
  try {
    const {
      page = 1,
      limit = 100,
      sort = 'kismet.device.base.last_time',
      order = 'desc',
      ...filters
    } = req.query;

    // Build Kismet query
    const query: KismetQueryOptions = {
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      sort: {
        field: sort,
        desc: order === 'desc'
      }
    };

    // Apply filters
    if (filters.phyname) {
      query.regex = query.regex || [];
      query.regex.push({
        field: 'kismet.device.base.phyname',
        regex: Array.isArray(filters.phyname) ? filters.phyname.join('|') : filters.phyname
      });
    }

    if (filters.ssidRegex) {
      query.regex = query.regex || [];
      query.regex.push({
        field: 'dot11.device.last_beaconed_ssid',
        regex: filters.ssidRegex
      });
    }

    if (filters.macRegex) {
      query.regex = query.regex || [];
      query.regex.push({
        field: 'kismet.device.base.macaddr',
        regex: filters.macRegex
      });
    }

    if (filters.manufacturer) {
      query.regex = query.regex || [];
      query.regex.push({
        field: 'kismet.device.base.manuf',
        regex: filters.manufacturer
      });
    }

    if (filters.deviceType) {
      query.regex = query.regex || [];
      const types = Array.isArray(filters.deviceType) ? filters.deviceType : [filters.deviceType];
      query.regex.push({
        field: 'kismet.device.base.type',
        regex: types.join('|')
      });
    }

    // Time-based filters
    if (filters.lastSeen !== undefined) {
      query.last_time = Number(filters.lastSeen);
    }

    if (filters.firstSeen !== undefined) {
      query.first_time = Number(filters.firstSeen);
    }

    // Signal strength filters
    if (filters.minSignal !== undefined || filters.maxSignal !== undefined) {
      query.bounded = true;
      // Additional signal filtering can be done post-query if needed
    }

    // Field selection for performance
    if (!query.fields) {
      query.fields = [
        'kismet.device.base.key',
        'kismet.device.base.macaddr',
        'kismet.device.base.name',
        'kismet.device.base.type',
        'kismet.device.base.phyname',
        'kismet.device.base.signal',
        'kismet.device.base.channel',
        'kismet.device.base.frequency',
        'kismet.device.base.last_time',
        'kismet.device.base.first_time',
        'kismet.device.base.packets.total',
        'kismet.device.base.datasize',
        'kismet.device.base.manuf',
        'dot11.device.last_beaconed_ssid',
        'dot11.device.client_map'
      ];
    }

    const response = await kismetApiPost('/devices/summary/devices.json', query);
    
    // Apply additional client-side filtering if needed
    let devices = response.data || [];
    
    if (filters.minSignal !== undefined) {
      devices = devices.filter((d: any) => 
        d['kismet.device.base.signal'] >= Number(filters.minSignal)
      );
    }
    
    if (filters.maxSignal !== undefined) {
      devices = devices.filter((d: any) => 
        d['kismet.device.base.signal'] <= Number(filters.maxSignal)
      );
    }

    if (filters.channels && filters.channels.length > 0) {
      const channelSet = new Set(filters.channels.map(String));
      devices = devices.filter((d: any) => 
        channelSet.has(String(d['kismet.device.base.channel']))
      );
    }

    if (filters.datasource) {
      devices = devices.filter((d: any) => {
        const seenBy = d['kismet.device.base.seenby'] || [];
        return seenBy.includes(filters.datasource);
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagSet = new Set(filters.tags);
      devices = devices.filter((d: any) => {
        const deviceTags = d['kismet.device.base.tags'] || [];
        return deviceTags.some((tag: string) => tagSet.has(tag));
      });
    }
    
    const result: PaginatedResponse<any> = {
      data: devices,
      total: response.total || devices.length,
      page: Number(page),
      limit: Number(limit),
      hasNext: (Number(page) * Number(limit)) < (response.total || devices.length),
      hasPrev: Number(page) > 1
    };

    res.json(result);
  } catch (error) {
    console.error('Failed to get devices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve devices',
      timestamp: Date.now()
    });
  }
});

// Search devices by multiple criteria
router.post('/devices/search', async (req: Request, res: Response) => {
  try {
    const { criteria, page = 1, limit = 100 } = req.body;
    
    const query: KismetQueryOptions = {
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      regex: []
    };

    // Build complex search query
    if (criteria.text) {
      // Search across multiple fields
      const searchFields = [
        'kismet.device.base.name',
        'kismet.device.base.macaddr',
        'dot11.device.last_beaconed_ssid',
        'kismet.device.base.manuf'
      ];
      
      query.regex = searchFields.map(field => ({
        field,
        regex: criteria.text
      }));
    }

    const response = await kismetApiPost('/devices/summary/devices.json', query);
    
    res.json({
      success: true,
      data: response.data || [],
      total: response.total || 0,
      page: Number(page),
      limit: Number(limit),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to search devices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search devices',
      timestamp: Date.now()
    });
  }
});

// Get device statistics by various groupings
router.get('/devices/stats', async (req: Request, res: Response) => {
  try {
    const { groupBy = 'type' } = req.query;
    
    // Get all devices for statistics
    const response = await kismetApiPost('/devices/summary/devices.json', {
      fields: [
        'kismet.device.base.type',
        'kismet.device.base.phyname',
        'kismet.device.base.manuf',
        'kismet.device.base.channel',
        'kismet.device.base.signal',
        'kismet.device.base.packets.total',
        'dot11.device.client_map'
      ]
    });
    
    const devices = response.data || [];
    const stats: Record<string, any> = {};
    
    switch (groupBy) {
      case 'type':
        devices.forEach((device: any) => {
          const type = device['kismet.device.base.type'] || 'Unknown';
          if (!stats[type]) {
            stats[type] = { count: 0, packets: 0 };
          }
          stats[type].count++;
          stats[type].packets += device['kismet.device.base.packets.total'] || 0;
        });
        break;
        
      case 'manufacturer':
        devices.forEach((device: any) => {
          const manuf = device['kismet.device.base.manuf'] || 'Unknown';
          if (!stats[manuf]) {
            stats[manuf] = { count: 0, avgSignal: 0, signals: [] };
          }
          stats[manuf].count++;
          const signal = device['kismet.device.base.signal'];
          if (signal) {
            stats[manuf].signals.push(signal);
          }
        });
        
        // Calculate average signals
        Object.keys(stats).forEach(key => {
          if (stats[key].signals.length > 0) {
            stats[key].avgSignal = 
              stats[key].signals.reduce((a: number, b: number) => a + b, 0) / 
              stats[key].signals.length;
          }
          delete stats[key].signals;
        });
        break;
        
      case 'channel':
        devices.forEach((device: any) => {
          const channel = device['kismet.device.base.channel'] || 'Unknown';
          if (!stats[channel]) {
            stats[channel] = { count: 0, types: {} };
          }
          stats[channel].count++;
          const type = device['kismet.device.base.type'] || 'Unknown';
          stats[channel].types[type] = (stats[channel].types[type] || 0) + 1;
        });
        break;
        
      case 'phy':
        devices.forEach((device: any) => {
          const phy = device['kismet.device.base.phyname'] || 'Unknown';
          if (!stats[phy]) {
            stats[phy] = { count: 0, active: 0, packets: 0 };
          }
          stats[phy].count++;
          stats[phy].packets += device['kismet.device.base.packets.total'] || 0;
          
          // Consider active if seen in last 5 minutes
          const lastTime = device['kismet.device.base.last_time'];
          if (lastTime && (Date.now() / 1000 - lastTime) < 300) {
            stats[phy].active++;
          }
        });
        break;
    }
    
    res.json({
      success: true,
      data: {
        groupBy,
        stats,
        totalDevices: devices.length,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get device statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get device statistics',
      timestamp: Date.now()
    });
  }
});

// Get device details by key
router.get('/devices/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const response = await kismetApiGet(`/devices/by-key/${key}/device.json`);
    
    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get device details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve device details',
      timestamp: Date.now()
    });
  }
});

// Get networks (APs only)
router.get('/networks', async (req: Request<{}, {}, {}, PaginatedRequest>, res: Response) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const query: KismetQueryOptions = {
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      regex: [{
        field: 'kismet.device.base.type',
        regex: 'Wi-Fi AP'
      }]
    };

    const response = await kismetApiPost('/devices/summary/devices.json', query);
    
    const result: PaginatedResponse<any> = {
      data: response.data || [],
      total: response.total || 0,
      page: Number(page),
      limit: Number(limit),
      hasNext: (Number(page) * Number(limit)) < (response.total || 0),
      hasPrev: Number(page) > 1
    };

    res.json(result);
  } catch (error) {
    console.error('Failed to get networks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve networks',
      timestamp: Date.now()
    });
  }
});

// Get clients
router.get('/clients', async (req: Request<{}, {}, {}, PaginatedRequest>, res: Response) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const query: KismetQueryOptions = {
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      regex: [{
        field: 'kismet.device.base.type',
        regex: 'Wi-Fi Client'
      }]
    };

    const response = await kismetApiPost('/devices/summary/devices.json', query);
    
    const result: PaginatedResponse<any> = {
      data: response.data || [],
      total: response.total || 0,
      page: Number(page),
      limit: Number(limit),
      hasNext: (Number(page) * Number(limit)) < (response.total || 0),
      hasPrev: Number(page) > 1
    };

    res.json(result);
  } catch (error) {
    console.error('Failed to get clients:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve clients',
      timestamp: Date.now()
    });
  }
});

// ========== SCRIPT MANAGEMENT ENDPOINTS ==========

// Script execution tracking
const scriptExecutions = new Map<string, {
  id: string;
  script: string;
  pid?: number;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
}>();

// List available scripts
router.get('/scripts', async (req: Request, res: Response) => {
  try {
    const scriptList = await Promise.all(
      Object.entries(KISMET_SCRIPTS).map(async ([id, script]) => {
        const isExec = script.isCommand ? true : await isExecutable(script.path);
        
        // Check if script is currently running
        const runningExecution = Array.from(scriptExecutions.values())
          .find(exec => exec.script === id && exec.status === 'running');
        
        return {
          id,
          ...script,
          executable: isExec,
          running: !!runningExecution,
          lastExecution: runningExecution?.startTime
        };
      })
    );

    // Also check for custom scripts in the scripts directory
    try {
      const customScripts = await fs.readdir(KISMET_SCRIPTS_DIR);
      for (const file of customScripts) {
        if (file.endsWith('.sh') && !Object.keys(KISMET_SCRIPTS).some(k => KISMET_SCRIPTS[k as keyof typeof KISMET_SCRIPTS].path.includes(file))) {
          const fullPath = path.join(KISMET_SCRIPTS_DIR, file);
          const isExec = await isExecutable(fullPath);
          
          scriptList.push({
            id: `custom_${file.replace('.sh', '')}`,
            path: fullPath,
            name: file,
            description: 'Custom script',
            executable: isExec,
            running: false,
            custom: true
          });
        }
      }
    } catch (error) {
      // Ignore errors reading custom scripts
      console.warn('Could not read custom scripts:', error);
    }

    res.json({
      success: true,
      data: scriptList,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to list scripts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list scripts',
      timestamp: Date.now()
    });
  }
});

// Get script execution history
router.get('/scripts/history', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    
    const history = Array.from(scriptExecutions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, Number(limit));
    
    res.json({
      success: true,
      data: history,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get script history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get script history',
      timestamp: Date.now()
    });
  }
});

// Execute a script
router.post('/scripts/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { args = [], env = {}, detached = false } = req.body;
    
    // Check if it's a custom script
    let scriptPath: string;
    let scriptName: string;
    let isCommand = false;
    
    if (id.startsWith('custom_')) {
      scriptName = id.replace('custom_', '') + '.sh';
      scriptPath = path.join(KISMET_SCRIPTS_DIR, scriptName);
    } else {
      const script = KISMET_SCRIPTS[id as keyof typeof KISMET_SCRIPTS];
      if (!script) {
        return res.status(404).json({ 
          success: false, 
          error: 'Script not found',
          timestamp: Date.now()
        });
      }
      scriptPath = script.path;
      scriptName = script.name;
      isCommand = script.isCommand || false;
    }

    // Check if already running
    const runningExecution = Array.from(scriptExecutions.values())
      .find(exec => exec.script === id && exec.status === 'running');
    
    if (runningExecution && !isCommand) {
      return res.status(409).json({ 
        success: false, 
        error: 'Script is already running',
        executionId: runningExecution.id,
        timestamp: Date.now()
      });
    }

    // Generate execution ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For commands (like pkill), execute directly
    if (isCommand) {
      const execution = {
        id: executionId,
        script: id,
        startTime: Date.now(),
        status: 'running' as const
      };
      scriptExecutions.set(executionId, execution);
      
      try {
        const result = await execAsync(scriptPath);
        execution.status = 'completed';
        execution.endTime = Date.now();
        execution.output = result.stdout;
        execution.error = result.stderr;
        
        return res.json({
          success: true,
          data: {
            executionId,
            output: result.stdout,
            error: result.stderr,
            duration: execution.endTime - execution.startTime
          },
          timestamp: Date.now()
        });
      } catch (error) {
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.error = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      }
    }

    // For scripts, check if executable
    if (!await isExecutable(scriptPath)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Script is not executable',
        timestamp: Date.now()
      });
    }

    // Execute the script
    if (detached) {
      // Run in background
      const child = spawn(scriptPath, args, {
        env: { ...process.env, ...env },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      const execution = {
        id: executionId,
        script: id,
        pid: child.pid,
        startTime: Date.now(),
        status: 'running' as const,
        output: '',
        error: ''
      };
      scriptExecutions.set(executionId, execution);
      
      // Collect output
      child.stdout?.on('data', (data) => {
        execution.output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        execution.error += data.toString();
      });
      
      child.on('exit', (code) => {
        execution.status = code === 0 ? 'completed' : 'failed';
        execution.endTime = Date.now();
      });
      
      // Unref so parent can exit
      child.unref();
      
      res.json({
        success: true,
        data: {
          executionId,
          pid: child.pid,
          detached: true
        },
        timestamp: Date.now()
      });
    } else {
      // Run and wait for completion
      const execution = {
        id: executionId,
        script: id,
        startTime: Date.now(),
        status: 'running' as const
      };
      scriptExecutions.set(executionId, execution);
      
      try {
        const result = await execAsync(`${scriptPath} ${args.join(' ')}`, {
          env: { ...process.env, ...env }
        });
        
        execution.status = 'completed';
        execution.endTime = Date.now();
        execution.output = result.stdout;
        execution.error = result.stderr;
        
        res.json({
          success: true,
          data: {
            executionId,
            output: result.stdout,
            error: result.stderr,
            duration: execution.endTime - execution.startTime
          },
          timestamp: Date.now()
        });
      } catch (error) {
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.error = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to execute script:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to execute script',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

// Stop a running script
router.post('/scripts/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find running execution
    const execution = Array.from(scriptExecutions.values())
      .find(exec => exec.script === id && exec.status === 'running');
    
    if (!execution) {
      return res.status(404).json({ 
        success: false, 
        error: 'No running execution found for this script',
        timestamp: Date.now()
      });
    }
    
    if (execution.pid) {
      try {
        process.kill(execution.pid, 'SIGTERM');
        
        // Give it a moment to terminate gracefully
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if still running and force kill if needed
        try {
          process.kill(execution.pid, 0); // Check if process exists
          process.kill(execution.pid, 'SIGKILL'); // Force kill
        } catch {
          // Process already terminated
        }
        
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.error = (execution.error || '') + '\nProcess terminated by user';
        
        res.json({
          success: true,
          message: 'Script execution stopped',
          executionId: execution.id,
          timestamp: Date.now()
        });
      } catch (error) {
        throw new Error(`Failed to stop process: ${error}`);
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot stop this execution (no PID)',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Failed to stop script:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stop script',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

// Get script execution status
router.get('/scripts/execution/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    
    const execution = scriptExecutions.get(executionId);
    if (!execution) {
      return res.status(404).json({ 
        success: false, 
        error: 'Execution not found',
        timestamp: Date.now()
      });
    }
    
    // Check if process is still running
    if (execution.status === 'running' && execution.pid) {
      try {
        process.kill(execution.pid, 0); // Check if process exists
      } catch {
        // Process no longer exists
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.error = (execution.error || '') + '\nProcess terminated unexpectedly';
      }
    }
    
    res.json({
      success: true,
      data: execution,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to check execution status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check execution status',
      timestamp: Date.now()
    });
  }
});

// Get script output stream (for long-running scripts)
router.get('/scripts/execution/:executionId/stream', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    
    const execution = scriptExecutions.get(executionId);
    if (!execution) {
      return res.status(404).json({ 
        success: false, 
        error: 'Execution not found',
        timestamp: Date.now()
      });
    }
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send current output
    if (execution.output) {
      res.write(`data: ${JSON.stringify({ type: 'stdout', data: execution.output })}\n\n`);
    }
    if (execution.error) {
      res.write(`data: ${JSON.stringify({ type: 'stderr', data: execution.error })}\n\n`);
    }
    
    // If execution is complete, send status and close
    if (execution.status !== 'running') {
      res.write(`data: ${JSON.stringify({ 
        type: 'status', 
        status: execution.status,
        endTime: execution.endTime,
        duration: execution.endTime ? execution.endTime - execution.startTime : undefined
      })}\n\n`);
      res.end();
      return;
    }
    
    // For running executions, we'll need to implement real-time streaming
    // This is a simplified version - in production you'd want to tail the process output
    const checkInterval = setInterval(() => {
      const currentExecution = scriptExecutions.get(executionId);
      if (!currentExecution || currentExecution.status !== 'running') {
        res.write(`data: ${JSON.stringify({ 
          type: 'status', 
          status: currentExecution?.status || 'unknown',
          endTime: currentExecution?.endTime,
          duration: currentExecution?.endTime ? currentExecution.endTime - currentExecution.startTime : undefined
        })}\n\n`);
        clearInterval(checkInterval);
        res.end();
      }
    }, 1000);
    
    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(checkInterval);
    });
  } catch (error) {
    console.error('Failed to stream execution output:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stream execution output',
      timestamp: Date.now()
    });
  }
});

// ========== CONFIGURATION ENDPOINTS ==========

// Get Kismet configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const configFiles = await fs.readdir(KISMET_CONFIG_DIR);
    const configs: Record<string, any> = {};

    for (const file of configFiles) {
      if (file.endsWith('.conf')) {
        const content = await fs.readFile(path.join(KISMET_CONFIG_DIR, file), 'utf-8');
        configs[file] = parseKismetConfig(content);
      }
    }

    res.json({
      success: true,
      data: configs,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve configuration',
      timestamp: Date.now()
    });
  }
});

// Update Kismet configuration
router.put('/config/:file', async (req: Request, res: Response) => {
  try {
    const { file } = req.params;
    const { config } = req.body;

    if (!file.endsWith('.conf')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration file',
        timestamp: Date.now()
      });
    }

    const configPath = path.join(KISMET_CONFIG_DIR, file);
    
    // Check if file exists
    try {
      await fs.access(configPath, fs.constants.F_OK);
    } catch {
      return res.status(404).json({ 
        success: false, 
        error: 'Configuration file not found',
        timestamp: Date.now()
      });
    }
    
    // Backup existing config
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.copyFile(configPath, backupPath);
    
    // Validate configuration
    const validationErrors = validateKismetConfig(config);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration',
        validationErrors,
        timestamp: Date.now()
      });
    }
    
    // Write new config
    const configContent = stringifyKismetConfig(config);
    await fs.writeFile(configPath, configContent);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      backupPath,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to update configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update configuration',
      timestamp: Date.now()
    });
  }
});

// Restore configuration from backup
router.post('/config/:file/restore', async (req: Request, res: Response) => {
  try {
    const { file } = req.params;
    const { backupPath } = req.body;
    
    if (!file.endsWith('.conf')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration file',
        timestamp: Date.now()
      });
    }
    
    const configPath = path.join(KISMET_CONFIG_DIR, file);
    const fullBackupPath = backupPath || `${configPath}.backup`;
    
    // Check if backup exists
    try {
      await fs.access(fullBackupPath, fs.constants.F_OK);
    } catch {
      return res.status(404).json({ 
        success: false, 
        error: 'Backup file not found',
        timestamp: Date.now()
      });
    }
    
    // Restore from backup
    await fs.copyFile(fullBackupPath, configPath);
    
    res.json({
      success: true,
      message: 'Configuration restored successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to restore configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restore configuration',
      timestamp: Date.now()
    });
  }
});

// List configuration backups
router.get('/config/:file/backups', async (req: Request, res: Response) => {
  try {
    const { file } = req.params;
    
    if (!file.endsWith('.conf')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration file',
        timestamp: Date.now()
      });
    }
    
    const configPath = path.join(KISMET_CONFIG_DIR, file);
    const dir = path.dirname(configPath);
    const basename = path.basename(configPath);
    
    const files = await fs.readdir(dir);
    const backups = files
      .filter(f => f.startsWith(`${basename}.backup`))
      .map(f => {
        const match = f.match(/\.backup\.(\d+)$/);
        const timestamp = match ? parseInt(match[1]) : 0;
        return {
          filename: f,
          path: path.join(dir, f),
          timestamp,
          date: timestamp ? new Date(timestamp).toISOString() : 'Unknown'
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      success: true,
      data: backups,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list backups',
      timestamp: Date.now()
    });
  }
});

// Validate configuration
router.post('/config/validate', async (req: Request, res: Response) => {
  try {
    const { config } = req.body;
    
    const validationErrors = validateKismetConfig(config);
    
    res.json({
      success: validationErrors.length === 0,
      validationErrors,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to validate configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate configuration',
      timestamp: Date.now()
    });
  }
});

// Get datasources
router.get('/datasources', async (req: Request, res: Response) => {
  try {
    const response = await kismetApiGet('/datasource/all_sources.json');
    
    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get datasources:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve datasources',
      timestamp: Date.now()
    });
  }
});

// Configure datasource
router.put('/datasources/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    const { hop_rate, hop_channels, channel } = req.body;

    const commands: Promise<any>[] = [];

    if (hop_rate !== undefined) {
      commands.push(kismetApiPost(`/datasource/by-uuid/${uuid}/set_hop_rate.cmd`, { rate: hop_rate }));
    }

    if (hop_channels !== undefined) {
      commands.push(kismetApiPost(`/datasource/by-uuid/${uuid}/set_hop_channels.cmd`, { channels: hop_channels }));
    }

    if (channel !== undefined) {
      commands.push(kismetApiPost(`/datasource/by-uuid/${uuid}/set_channel.cmd`, { channel }));
    }

    await Promise.all(commands);

    res.json({
      success: true,
      message: 'Datasource configured successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to configure datasource:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to configure datasource',
      timestamp: Date.now()
    });
  }
});

// ========== MONITORING AND STATUS ENDPOINTS ==========

// Get comprehensive system status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status: any = {
      service: {
        name: KISMET_SERVICE,
        running: false,
        pid: null,
        memory: null,
        uptime: null
      },
      kismet: {
        api: {
          available: false,
          version: null,
          url: KISMET_API_URL
        }
      },
      system: {
        loadAverage: null,
        memoryUsage: null,
        diskUsage: null
      }
    };
    
    // Check service status
    try {
      status.service.running = await isServiceRunning(KISMET_SERVICE);
      
      if (status.service.running) {
        const { stdout } = await execAsync(`systemctl show ${KISMET_SERVICE} --property=MainPID,MemoryCurrent,ActiveEnterTimestamp`);
        const lines = stdout.trim().split('\n');
        
        lines.forEach(line => {
          const [key, value] = line.split('=');
          switch (key) {
            case 'MainPID':
              status.service.pid = parseInt(value) || null;
              break;
            case 'MemoryCurrent':
              const memBytes = parseInt(value);
              if (!isNaN(memBytes) && memBytes > 0) {
                status.service.memory = `${(memBytes / 1024 / 1024).toFixed(2)} MB`;
              }
              break;
            case 'ActiveEnterTimestamp':
              if (value && value !== '') {
                const timestamp = new Date(value).getTime();
                status.service.uptime = Math.floor((Date.now() - timestamp) / 1000);
              }
              break;
          }
        });
      }
    } catch (error) {
      console.warn('Could not get detailed service status:', error);
    }
    
    // Check Kismet API availability
    try {
      const apiStatus = await kismetApiGet('/system/status.json');
      status.kismet.api.available = true;
      status.kismet.api.version = apiStatus.kismet.version || null;
      status.kismet.api.startTime = apiStatus.kismet.starttime || null;
      status.kismet.api.servername = apiStatus.kismet.servername || null;
      status.kismet.api.serveruuid = apiStatus.kismet.serveruuid || null;
    } catch (error) {
      console.warn('Kismet API not available:', error);
    }
    
    // Get system metrics
    try {
      // Load average
      const { stdout: loadAvg } = await execAsync('cat /proc/loadavg');
      const loads = loadAvg.trim().split(' ').slice(0, 3).map(parseFloat);
      status.system.loadAverage = {
        '1min': loads[0],
        '5min': loads[1],
        '15min': loads[2]
      };
      
      // Memory usage
      const { stdout: memInfo } = await execAsync('free -b');
      const memLines = memInfo.trim().split('\n');
      const memValues = memLines[1].split(/\s+/);
      status.system.memoryUsage = {
        total: parseInt(memValues[1]),
        used: parseInt(memValues[2]),
        free: parseInt(memValues[3]),
        percent: Math.round((parseInt(memValues[2]) / parseInt(memValues[1])) * 100)
      };
      
      // Disk usage
      const { stdout: diskInfo } = await execAsync('df -B1 /');
      const diskLines = diskInfo.trim().split('\n');
      const diskValues = diskLines[1].split(/\s+/);
      status.system.diskUsage = {
        total: parseInt(diskValues[1]),
        used: parseInt(diskValues[2]),
        available: parseInt(diskValues[3]),
        percent: parseInt(diskValues[4])
      };
    } catch (error) {
      console.warn('Could not get system metrics:', error);
    }
    
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
      timestamp: Date.now()
    });
  }
});

// Get detailed system statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats: any = {
      devices: {},
      packets: {},
      datasources: {},
      memory: {},
      channels: {},
      alerts: {}
    };
    
    // Fetch all statistics in parallel
    const [deviceStats, packetStats, datasourceStats, systemStats, channelStats, alertStats] = await Promise.allSettled([
      kismetApiGet('/devices/summary/devices.json'),
      kismetApiGet('/packetchain/packet_stats.json'),
      kismetApiGet('/datasource/all_sources.json'),
      kismetApiGet('/system/status.json'),
      kismetApiGet('/channels/channels.json'),
      kismetApiGet('/alerts/all_alerts.json')
    ]);
    
    // Process device statistics
    if (deviceStats.status === 'fulfilled') {
      const devices = deviceStats.value.data || [];
      const now = Date.now() / 1000;
      
      stats.devices = {
        total: devices.length,
        byType: {},
        byPhy: {},
        active: devices.filter((d: any) => (now - d['kismet.device.base.last_time']) < 300).length,
        new: devices.filter((d: any) => (now - d['kismet.device.base.first_time']) < 3600).length
      };
      
      // Count by type and phy
      devices.forEach((device: any) => {
        const type = device['kismet.device.base.type'] || 'Unknown';
        const phy = device['kismet.device.base.phyname'] || 'Unknown';
        
        stats.devices.byType[type] = (stats.devices.byType[type] || 0) + 1;
        stats.devices.byPhy[phy] = (stats.devices.byPhy[phy] || 0) + 1;
      });
    }
    
    // Process packet statistics
    if (packetStats.status === 'fulfilled') {
      stats.packets = packetStats.value;
    }
    
    // Process datasource statistics
    if (datasourceStats.status === 'fulfilled') {
      const sources = datasourceStats.value.datasources || [];
      stats.datasources = {
        total: sources.length,
        running: sources.filter((s: any) => s['kismet.datasource.running']).length,
        error: sources.filter((s: any) => s['kismet.datasource.error']).length,
        sources: sources.map((s: any) => ({
          uuid: s['kismet.datasource.uuid'],
          name: s['kismet.datasource.name'],
          interface: s['kismet.datasource.interface'],
          type: s['kismet.datasource.type'],
          running: s['kismet.datasource.running'],
          channel: s['kismet.datasource.channel'],
          packets: s['kismet.datasource.packets_total']
        }))
      };
    }
    
    // Process system statistics
    if (systemStats.status === 'fulfilled') {
      stats.memory = {
        devices: systemStats.value.memory.devices || 0,
        datasize: systemStats.value.memory.datasize || 0,
        rss: systemStats.value.memory.rss || 0,
        virtual: systemStats.value.memory.virtual || 0
      };
    }
    
    // Process channel statistics
    if (channelStats.status === 'fulfilled') {
      stats.channels = channelStats.value.channels || {};
    }
    
    // Process alert statistics
    if (alertStats.status === 'fulfilled') {
      const alerts = alertStats.value.alerts || [];
      stats.alerts = {
        total: alerts.length,
        byType: {},
        recent: alerts.slice(-10).reverse()
      };
      
      alerts.forEach((alert: any) => {
        const type = alert['kismet.alert.class'] || 'Unknown';
        stats.alerts.byType[type] = (stats.alerts.byType[type] || 0) + 1;
      });
    }
    
    res.json({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve statistics',
      timestamp: Date.now()
    });
  }
});

// Get real-time metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = {
      timestamp: Date.now(),
      packets: {
        rate: 0,
        total: 0,
        dropped: 0,
        error: 0
      },
      devices: {
        rate: 0,
        active: 0,
        total: 0
      },
      datasources: {
        active: 0,
        total: 0,
        error: 0
      },
      system: {
        cpu: 0,
        memory: 0,
        uptime: 0
      }
    };
    
    // Get packet chain stats for rates
    try {
      const packetStats = await kismetApiGet('/packetchain/packet_stats.json');
      metrics.packets.rate = packetStats.rate || 0;
      metrics.packets.total = packetStats.total || 0;
      metrics.packets.dropped = packetStats.dropped || 0;
      metrics.packets.error = packetStats.error || 0;
    } catch (error) {
      console.warn('Could not get packet stats:', error);
    }
    
    // Get device rate
    try {
      const deviceStats = await kismetApiGet('/devicetracker/all_devices_dt.json');
      metrics.devices.rate = deviceStats.rate || 0;
      metrics.devices.active = deviceStats.active || 0;
      metrics.devices.total = deviceStats.total || 0;
    } catch (error) {
      console.warn('Could not get device stats:', error);
    }
    
    // Get datasource status
    try {
      const sources = await kismetApiGet('/datasource/all_sources.json');
      const datasources = sources.datasources || [];
      metrics.datasources.total = datasources.length;
      metrics.datasources.active = datasources.filter((s: any) => s['kismet.datasource.running']).length;
      metrics.datasources.error = datasources.filter((s: any) => s['kismet.datasource.error']).length;
    } catch (error) {
      console.warn('Could not get datasource stats:', error);
    }
    
    // Get system metrics
    try {
      const systemStatus = await kismetApiGet('/system/status.json');
      metrics.system.uptime = systemStatus.kismet.uptime || 0;
      
      // Get CPU usage from system
      const { stdout: cpuInfo } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'| cut -d'%' -f1");
      metrics.system.cpu = parseFloat(cpuInfo.trim()) || 0;
      
      // Memory usage from Kismet
      const memStats = systemStatus.memory || {};
      if (memStats.rss && memStats.virtual) {
        const { stdout: totalMem } = await execAsync("free -b | grep Mem | awk '{print $2}'");
        const total = parseInt(totalMem.trim());
        metrics.system.memory = Math.round((memStats.rss / total) * 100);
      }
    } catch (error) {
      console.warn('Could not get system metrics:', error);
    }
    
    res.json({
      success: true,
      data: metrics,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get metrics',
      timestamp: Date.now()
    });
  }
});

// Get alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const response = await kismetApiGet('/alerts/all_alerts.json');
    
    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve alerts',
      timestamp: Date.now()
    });
  }
});

// Configure alert
router.put('/alerts/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const config: KismetAlertConfig = req.body;

    await kismetApiPost(`/alerts/definitions/${type}/enable.cmd`, { 
      enabled: config.enabled ? 1 : 0 
    });

    res.json({
      success: true,
      message: 'Alert configured successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to configure alert:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to configure alert',
      timestamp: Date.now()
    });
  }
});

// Get GPS status
router.get('/gps/status', async (req: Request, res: Response) => {
  try {
    const response = await kismetApiGet('/gps/location.json');
    
    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get GPS status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve GPS status',
      timestamp: Date.now()
    });
  }
});

// Get channel usage statistics
router.get('/channels/stats', async (req: Request, res: Response) => {
  try {
    const response = await kismetApiGet('/channels/channels.json');
    
    res.json({
      success: true,
      data: response,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get channel statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve channel statistics',
      timestamp: Date.now()
    });
  }
});

// ========== PCAP EXPORT ENDPOINT ==========

// Stream PCAP data
router.get('/pcap/stream', async (req: Request, res: Response) => {
  try {
    const options: KismetPCAPOptions = req.query;
    
    res.setHeader('Content-Type', 'application/vnd.tcpdump.pcap');
    res.setHeader('Content-Disposition', 'attachment; filename="kismet-capture.pcap"');

    const url = `${KISMET_API_URL}/pcapng/all_packets.pcapng`;
    const headers: any = {
      'Accept': 'application/vnd.tcpdump.pcap'
    };
    
    if (KISMET_API_KEY) {
      headers['KISMET'] = KISMET_API_KEY;
    }

    const response = await axios.get(url, {
      headers,
      params: options,
      responseType: 'stream'
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Failed to stream PCAP:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stream PCAP data',
      timestamp: Date.now()
    });
  }
});

// ========== HELPER FUNCTIONS ==========

// Helper function to make Kismet API GET requests
async function kismetApiGet(path: string, params?: any): Promise<any> {
  const headers: any = {
    'Accept': 'application/json'
  };
  
  if (KISMET_API_KEY) {
    headers['KISMET'] = KISMET_API_KEY;
  }
  
  const response = await axios.get(`${KISMET_API_URL}${path}`, {
    headers,
    params
  });
  
  return response.data;
}

// Helper function to make Kismet API POST requests
async function kismetApiPost(path: string, data?: any): Promise<any> {
  const headers: any = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (KISMET_API_KEY) {
    headers['KISMET'] = KISMET_API_KEY;
  }
  
  const response = await axios.post(`${KISMET_API_URL}${path}`, data, { headers });
  
  return response.data;
}

// Check if a file is executable
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Parse Kismet configuration file
function parseKismetConfig(content: string): Record<string, any> {
  const config: Record<string, any> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      config[key.trim()] = value.trim();
    }
  }
  
  return config;
}

// Stringify Kismet configuration
function stringifyKismetConfig(config: Record<string, any>): string {
  const lines: string[] = [];
  
  // Add header
  lines.push('# Kismet configuration');
  lines.push(`# Generated at ${new Date().toISOString()}`);
  lines.push('');
  
  // Group related settings
  const groups: Record<string, Record<string, any>> = {};
  const ungrouped: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    const parts = key.split('_');
    if (parts.length > 1) {
      const group = parts[0];
      if (!groups[group]) groups[group] = {};
      groups[group][key] = value;
    } else {
      ungrouped[key] = value;
    }
  }
  
  // Write ungrouped settings first
  for (const [key, value] of Object.entries(ungrouped)) {
    if (Array.isArray(value)) {
      value.forEach(v => lines.push(`${key}=${v}`));
    } else if (typeof value === 'boolean') {
      lines.push(`${key}=${value ? 'true' : 'false'}`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  
  // Write grouped settings
  for (const [group, settings] of Object.entries(groups)) {
    lines.push('');
    lines.push(`# ${group} settings`);
    for (const [key, value] of Object.entries(settings)) {
      if (Array.isArray(value)) {
        value.forEach(v => lines.push(`${key}=${v}`));
      } else if (typeof value === 'boolean') {
        lines.push(`${key}=${value ? 'true' : 'false'}`);
      } else {
        lines.push(`${key}=${value}`);
      }
    }
  }
  
  return lines.join('\n');
}

// Validate Kismet configuration
function validateKismetConfig(config: Record<string, any>): string[] {
  const errors: string[] = [];
  
  // Required settings
  const requiredSettings = ['server_name', 'log_types', 'log_prefix'];
  for (const setting of requiredSettings) {
    if (!(setting in config)) {
      errors.push(`Missing required setting: ${setting}`);
    }
  }
  
  // Validate specific settings
  if ('gps' in config) {
    if (config.gps !== 'true' && config.gps !== 'false' && config.gps !== true && config.gps !== false) {
      errors.push('gps must be true or false');
    }
  }
  
  if ('channel_hop' in config) {
    if (config.channel_hop !== 'true' && config.channel_hop !== 'false' && config.channel_hop !== true && config.channel_hop !== false) {
      errors.push('channel_hop must be true or false');
    }
  }
  
  if ('channel_hop_speed' in config) {
    const speed = parseInt(config.channel_hop_speed);
    if (isNaN(speed) || speed < 1 || speed > 10) {
      errors.push('channel_hop_speed must be between 1 and 10');
    }
  }
  
  // Validate datasource format
  Object.entries(config).forEach(([key, value]) => {
    if (key === 'source' || key.startsWith('source_')) {
      if (typeof value !== 'string' || !value.includes(':')) {
        errors.push(`Invalid datasource format for ${key}: must be interface:options`);
      }
    }
  });
  
  // Validate log types
  if ('log_types' in config) {
    const validLogTypes = ['pcap', 'kismet', 'kml', 'gpx', 'netxml'];
    const logTypes = String(config.log_types).split(',').map(t => t.trim());
    for (const logType of logTypes) {
      if (!validLogTypes.includes(logType)) {
        errors.push(`Invalid log type: ${logType}`);
      }
    }
  }
  
  return errors;
}

export default router;