/**
 * HackRF SDR API Routes
 * Provides SDR control, spectrum analysis, and signal processing endpoints
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import winston from 'winston';

const execAsync = promisify(exec);
const router = Router();

// HackRF service configurations
const HACKRF_API_URL = process.env.HACKRF_API_URL || 'http://localhost:8092';
const SPECTRUM_ANALYZER_URL = process.env.SPECTRUM_ANALYZER_URL || 'http://localhost:8092';
const OPENWEBRX_URL = process.env.OPENWEBRX_URL || 'http://localhost:8073';
const HACKRF_CONFIG_PATH = process.env.HACKRF_CONFIG_PATH || '/home/pi/HackRF';

interface HackRFStatus {
  connected: boolean;
  frequency: number;
  sampleRate: number;
  gain: {
    vga: number;
    lna: number;
    amp: boolean;
  };
  mode: 'idle' | 'receiving' | 'transmitting';
  error?: string;
}

interface SpectrumData {
  frequencies: number[];
  powers: number[];
  centerFreq: number;
  bandwidth: number;
  timestamp: number;
}

interface SDRConfig {
  centerFreq: number;
  sampleRate: number;
  gain: {
    vga: number;
    lna: number;
    amp: boolean;
  };
  bandwidth?: number;
  antenna?: string;
}

/**
 * GET /api/hackrf/status
 * Get HackRF device status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Check if HackRF device is connected
    const { stdout: lsusbOutput } = await execAsync('lsusb | grep -i hackrf || echo "Not found"');
    const deviceConnected = !lsusbOutput.includes('Not found');

    // Try to get status from spectrum analyzer if running
    let spectrumStatus: any = null;
    try {
      const response = await axios.get(`${SPECTRUM_ANALYZER_URL}/api/status`, { timeout: 2000 });
      spectrumStatus = response.data;
    } catch (error) {
      // Spectrum analyzer not running
    }

    // Check OpenWebRX status
    let openwebrxStatus: any = null;
    try {
      const response = await axios.get(`${OPENWEBRX_URL}/status`, { timeout: 2000 });
      openwebrxStatus = response.data;
    } catch (error) {
      // OpenWebRX not running
    }

    const status: HackRFStatus = {
      connected: deviceConnected,
      frequency: spectrumStatus?.frequency || 0,
      sampleRate: spectrumStatus?.sampleRate || 0,
      gain: spectrumStatus?.gain || {
        vga: 0,
        lna: 0,
        amp: false
      },
      mode: spectrumStatus?.mode || 'idle'
    };

    res.json({
      success: true,
      data: {
        hackrf: status,
        services: {
          spectrumAnalyzer: {
            running: !!spectrumStatus,
            url: SPECTRUM_ANALYZER_URL,
            status: spectrumStatus
          },
          openwebrx: {
            running: !!openwebrxStatus,
            url: OPENWEBRX_URL,
            status: openwebrxStatus
          }
        }
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get HackRF status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get HackRF status',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/hackrf/configure
 * Configure HackRF device parameters
 */
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const config: SDRConfig = req.body;

    // Validate configuration
    if (!config.centerFreq || !config.sampleRate) {
      return res.status(400).json({
        success: false,
        error: 'centerFreq and sampleRate are required',
        timestamp: Date.now()
      });
    }

    // Forward configuration to spectrum analyzer if available
    try {
      const response = await axios.post(`${SPECTRUM_ANALYZER_URL}/api/configure`, config);
      
      res.json({
        success: true,
        data: response.data,
        timestamp: Date.now()
      });
    } catch (error) {
      throw new Error('Spectrum analyzer not available or configuration failed');
    }
  } catch (error) {
    console.error('Failed to configure HackRF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure HackRF',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/hackrf/spectrum
 * Get current spectrum data
 */
router.get('/spectrum', async (req: Request, res: Response) => {
  try {
    const { startFreq, endFreq, resolution } = req.query;

    // Forward request to spectrum analyzer
    const response = await axios.get(`${SPECTRUM_ANALYZER_URL}/api/spectrum`, {
      params: { startFreq, endFreq, resolution }
    });

    res.json({
      success: true,
      data: response.data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get spectrum data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get spectrum data',
      details: error instanceof Error ? error.message : 'Spectrum analyzer not available',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/hackrf/spectrum/stream
 * Stream spectrum data via Server-Sent Events
 */
router.get('/spectrum/stream', async (req: Request, res: Response) => {
  try {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Proxy SSE stream from spectrum analyzer
    const response = await axios.get(`${SPECTRUM_ANALYZER_URL}/api/spectrum/stream`, {
      responseType: 'stream'
    });

    response.data.pipe(res);

    // Handle client disconnect
    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error('Failed to stream spectrum data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream spectrum data',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/hackrf/service/start
 * Start spectrum analyzer service
 */
router.post('/service/start', async (req: Request, res: Response) => {
  try {
    const { mode = 'spectrum' } = req.body;

    let command: string;
    let serviceName: string;

    switch (mode) {
      case 'spectrum':
        command = `cd ${HACKRF_CONFIG_PATH} && python3 spectrum_analyzer.py`;
        serviceName = 'Spectrum Analyzer';
        break;
      case 'openwebrx':
        command = 'cd /home/pi/openwebrx && docker-compose up -d';
        serviceName = 'OpenWebRX';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid mode. Use "spectrum" or "openwebrx"',
          timestamp: Date.now()
        });
    }

    // Execute command in background
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Failed to start ${serviceName}:`, error);
      }
    });

    // Give service time to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify service is running
    let isRunning = false;
    try {
      if (mode === 'spectrum') {
        await axios.get(`${SPECTRUM_ANALYZER_URL}/api/status`, { timeout: 2000 });
        isRunning = true;
      } else if (mode === 'openwebrx') {
        await axios.get(`${OPENWEBRX_URL}/status`, { timeout: 2000 });
        isRunning = true;
      }
    } catch (error) {
      // Service not responding yet
    }

    res.json({
      success: true,
      data: {
        service: serviceName,
        mode,
        running: isRunning,
        pid: child.pid
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to start HackRF service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start HackRF service',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/hackrf/service/stop
 * Stop spectrum analyzer service
 */
router.post('/service/stop', async (req: Request, res: Response) => {
  try {
    const { mode = 'spectrum' } = req.body;

    let command: string;
    let serviceName: string;

    switch (mode) {
      case 'spectrum':
        command = 'pkill -f "spectrum_analyzer.py"';
        serviceName = 'Spectrum Analyzer';
        break;
      case 'openwebrx':
        command = 'cd /home/pi/openwebrx && docker-compose down';
        serviceName = 'OpenWebRX';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid mode. Use "spectrum" or "openwebrx"',
          timestamp: Date.now()
        });
    }

    await execAsync(command);

    res.json({
      success: true,
      data: {
        service: serviceName,
        mode,
        stopped: true
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to stop HackRF service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop HackRF service',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/hackrf/signals
 * Get detected signals
 */
router.get('/signals', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${SPECTRUM_ANALYZER_URL}/api/signals`);

    res.json({
      success: true,
      data: response.data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get signals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get signals',
      details: 'Spectrum analyzer not available',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/hackrf/waterfall
 * Get waterfall data
 */
router.get('/waterfall', async (req: Request, res: Response) => {
  try {
    const { duration = 60, resolution = 1024 } = req.query;

    const response = await axios.get(`${SPECTRUM_ANALYZER_URL}/api/waterfall`, {
      params: { duration, resolution }
    });

    res.json({
      success: true,
      data: response.data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get waterfall data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get waterfall data',
      details: 'Spectrum analyzer not available',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/hackrf/config
 * Get current HackRF configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // Try to read configuration from spectrum analyzer first
    let config: any = {};

    try {
      const response = await axios.get(`${SPECTRUM_ANALYZER_URL}/api/config`);
      config = response.data;
    } catch (error) {
      // Try to read from config file
      try {
        const configPath = path.join(HACKRF_CONFIG_PATH, 'config.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(configContent);
      } catch (fileError) {
        // Use defaults
        config = {
          centerFreq: 100000000,
          sampleRate: 2000000,
          gain: { vga: 20, lna: 20, amp: false },
          bandwidth: 2000000
        };
      }
    }

    res.json({
      success: true,
      data: config,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get HackRF config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get HackRF configuration',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/hackrf/test
 * Test HackRF device connectivity
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    // Test HackRF device
    const { stdout, stderr } = await execAsync('hackrf_info 2>&1 || echo "ERROR"');
    
    const deviceWorking = !stdout.includes('ERROR') && !stdout.includes('No HackRF boards found');
    
    res.json({
      success: true,
      data: {
        deviceConnected: deviceWorking,
        output: stdout,
        error: stderr || null,
        testTime: Date.now()
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to test HackRF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test HackRF device',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/hackrf/presets
 * Get frequency presets for common bands
 */
router.get('/presets', (req: Request, res: Response) => {
  const presets = [
    {
      name: '2m Amateur Radio',
      frequency: 145000000,
      bandwidth: 2000000,
      description: '2 meter amateur radio band'
    },
    {
      name: '70cm Amateur Radio', 
      frequency: 440000000,
      bandwidth: 2000000,
      description: '70 centimeter amateur radio band'
    },
    {
      name: 'FM Broadcast',
      frequency: 100000000,
      bandwidth: 20000000,
      description: 'FM radio broadcast band'
    },
    {
      name: 'WiFi 2.4GHz',
      frequency: 2442000000,
      bandwidth: 20000000,
      description: 'WiFi 2.4GHz band (channel 7)'
    },
    {
      name: 'ISM Band',
      frequency: 915000000,
      bandwidth: 2000000,
      description: 'ISM band 915MHz'
    },
    {
      name: 'Aircraft Band',
      frequency: 121500000,
      bandwidth: 2000000,
      description: 'Aircraft communication band'
    }
  ];

  res.json({
    success: true,
    data: presets,
    timestamp: Date.now()
  });
});

export default router;