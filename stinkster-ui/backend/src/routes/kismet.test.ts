import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import kismetRouter from './kismet';

// Mock modules
vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
  promisify: vi.fn()
}));

vi.mock('axios');
vi.mock('fs/promises');

describe('Kismet API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/kismet', kismetRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Management', () => {
    it('should start the kismet service', async () => {
      const { exec } = await import('child_process');
      const mockExec = vi.mocked(exec);
      
      mockExec.mockImplementation((cmd: string, cb: any) => {
        if (cmd.includes('is-active')) {
          cb(null, { stdout: 'inactive' });
        } else {
          cb(null, { stdout: '' });
        }
      });

      const response = await request(app)
        .post('/api/kismet/service/start')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String)
      });
    });

    it('should get service status', async () => {
      const { exec } = await import('child_process');
      const mockExec = vi.mocked(exec);
      
      mockExec.mockImplementation((cmd: string, cb: any) => {
        cb(null, { stdout: 'active' });
      });

      const response = await request(app)
        .get('/api/kismet/service/status')
        .expect(200);

      expect(response.body).toMatchObject({
        running: true,
        service: 'kismet'
      });
    });
  });

  describe('Device Management', () => {
    it('should list devices with pagination', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.post).mockResolvedValue({
        data: {
          data: [
            {
              'kismet.device.base.key': 'device1',
              'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
              'kismet.device.base.type': 'Wi-Fi AP'
            }
          ],
          total: 1
        }
      });

      const response = await request(app)
        .get('/api/kismet/devices?page=1&limit=10')
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should search devices', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.post).mockResolvedValue({
        data: {
          data: [],
          total: 0
        }
      });

      const response = await request(app)
        .post('/api/kismet/devices/search')
        .send({
          criteria: { text: 'test' },
          page: 1,
          limit: 100
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        total: 0
      });
    });

    it('should get device statistics', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.post).mockResolvedValue({
        data: {
          data: [
            {
              'kismet.device.base.type': 'Wi-Fi AP',
              'kismet.device.base.packets.total': 100
            },
            {
              'kismet.device.base.type': 'Wi-Fi Client',
              'kismet.device.base.packets.total': 50
            }
          ]
        }
      });

      const response = await request(app)
        .get('/api/kismet/devices/stats?groupBy=type')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          groupBy: 'type',
          stats: expect.any(Object),
          totalDevices: 2
        }
      });
    });
  });

  describe('Script Management', () => {
    it('should list available scripts', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/kismet/scripts')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
      
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        executable: expect.any(Boolean)
      });
    });

    it('should execute a script', async () => {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = vi.fn().mockResolvedValue({
        stdout: 'Script output',
        stderr: ''
      });
      vi.mocked(promisify).mockReturnValue(execAsync);

      const response = await request(app)
        .post('/api/kismet/scripts/stop/execute')
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          executionId: expect.any(String),
          output: expect.any(String)
        }
      });
    });

    it('should get script execution history', async () => {
      const response = await request(app)
        .get('/api/kismet/scripts/history')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });
  });

  describe('Configuration Management', () => {
    it('should get configuration', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readdir).mockResolvedValue(['kismet.conf']);
      vi.mocked(fs.readFile).mockResolvedValue('server_name=Kismet\nlog_types=pcap,kismet');

      const response = await request(app)
        .get('/api/kismet/config')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          'kismet.conf': {
            server_name: 'Kismet',
            log_types: 'pcap,kismet'
          }
        }
      });
    });

    it('should validate configuration', async () => {
      const response = await request(app)
        .post('/api/kismet/config/validate')
        .send({
          config: {
            server_name: 'Test',
            log_types: 'pcap,invalid',
            log_prefix: 'test'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: false,
        validationErrors: expect.arrayContaining([
          'Invalid log type: invalid'
        ])
      });
    });
  });

  describe('System Monitoring', () => {
    it('should get system status', async () => {
      const { exec } = await import('child_process');
      const axios = await import('axios');
      
      vi.mocked(axios.default.get).mockResolvedValue({
        data: {
          kismet: {
            version: '2021-08-R1'
          }
        }
      });

      const response = await request(app)
        .get('/api/kismet/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          service: expect.any(Object),
          kismet: expect.any(Object),
          system: expect.any(Object)
        }
      });
    });

    it('should get real-time metrics', async () => {
      const axios = await import('axios');
      vi.mocked(axios.default.get).mockResolvedValue({ data: {} });

      const response = await request(app)
        .get('/api/kismet/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          timestamp: expect.any(Number),
          packets: expect.any(Object),
          devices: expect.any(Object),
          datasources: expect.any(Object),
          system: expect.any(Object)
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle script not found', async () => {
      const response = await request(app)
        .post('/api/kismet/scripts/nonexistent/execute')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Script not found'
      });
    });

    it('should handle configuration file not found', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const response = await request(app)
        .put('/api/kismet/config/nonexistent.conf')
        .send({ config: {} })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Configuration file not found'
      });
    });
  });
});