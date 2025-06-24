/**
 * Shared Health Check Middleware
 * Provides standardized health check endpoints for all services
 */

const os = require('os');
const process = require('process');

class HealthCheck {
  constructor(serviceName, version = '1.0.0') {
    this.serviceName = serviceName;
    this.version = version;
    this.startTime = Date.now();
    this.checks = new Map();
  }

  // Register a custom health check
  addCheck(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new Error('Health check must be a function');
    }
    this.checks.set(name, checkFn);
  }

  // Remove a health check
  removeCheck(name) {
    this.checks.delete(name);
  }

  // Get system metrics
  getSystemMetrics() {
    const uptime = Date.now() - this.startTime;
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: Math.floor(uptime / 1000), // seconds
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000), // ms
        system: Math.round(cpuUsage.system / 1000), // ms
      },
      system: {
        loadavg: os.loadavg(),
        freemem: Math.round(os.freemem() / 1024 / 1024), // MB
        totalmem: Math.round(os.totalmem() / 1024 / 1024), // MB
        cpus: os.cpus().length,
      }
    };
  }

  // Run all health checks
  async runChecks() {
    const results = {
      healthy: true,
      checks: {}
    };

    for (const [name, checkFn] of this.checks) {
      try {
        const startTime = Date.now();
        const result = await checkFn();
        const duration = Date.now() - startTime;
        
        results.checks[name] = {
          healthy: result.healthy !== false,
          message: result.message || 'OK',
          duration,
          ...(result.details || {})
        };
        
        if (result.healthy === false) {
          results.healthy = false;
        }
      } catch (error) {
        results.healthy = false;
        results.checks[name] = {
          healthy: false,
          message: error.message || 'Check failed',
          error: error.toString()
        };
      }
    }

    return results;
  }

  // Express middleware for health endpoint
  middleware() {
    return async (req, res) => {
      try {
        const checks = await this.runChecks();
        const metrics = this.getSystemMetrics();
        
        const status = {
          service: this.serviceName,
          version: this.version,
          timestamp: new Date().toISOString(),
          healthy: checks.healthy,
          uptime: metrics.uptime,
          metrics,
          checks: checks.checks
        };
        
        // Set appropriate status code
        const statusCode = checks.healthy ? 200 : 503;
        
        res.status(statusCode).json(status);
      } catch (error) {
        res.status(500).json({
          service: this.serviceName,
          version: this.version,
          timestamp: new Date().toISOString(),
          healthy: false,
          error: error.message || 'Health check failed'
        });
      }
    };
  }

  // Simple liveness check middleware
  liveness() {
    return (req, res) => {
      res.status(200).json({
        service: this.serviceName,
        status: 'alive',
        timestamp: new Date().toISOString()
      });
    };
  }

  // Readiness check middleware
  readiness() {
    return async (req, res) => {
      const checks = await this.runChecks();
      
      if (checks.healthy) {
        res.status(200).json({
          service: this.serviceName,
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          service: this.serviceName,
          status: 'not ready',
          timestamp: new Date().toISOString(),
          checks: checks.checks
        });
      }
    };
  }
}

// Factory function for creating health checks
function createHealthCheck(serviceName, version) {
  return new HealthCheck(serviceName, version);
}

// Common health checks
const commonChecks = {
  // Database connectivity check
  database: (connection) => async () => {
    try {
      // Example: await connection.query('SELECT 1');
      return { healthy: true, message: 'Database connected' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  },

  // External service check
  externalService: (url, timeout = 5000) => async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        method: 'HEAD'
      });
      
      clearTimeout(timeoutId);
      
      return { 
        healthy: response.ok, 
        message: `Service responded with ${response.status}`,
        details: { statusCode: response.status }
      };
    } catch (error) {
      return { 
        healthy: false, 
        message: error.message || 'Service unreachable' 
      };
    }
  },

  // File system check
  fileSystem: (path) => async () => {
    const fs = require('fs').promises;
    try {
      await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
      return { healthy: true, message: 'File system accessible' };
    } catch (error) {
      return { healthy: false, message: `Cannot access ${path}: ${error.message}` };
    }
  },

  // Memory usage check
  memoryUsage: (maxHeapMB = 512) => async () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const healthy = used < maxHeapMB;
    
    return {
      healthy,
      message: healthy 
        ? `Memory usage OK (${Math.round(used)}MB)`
        : `High memory usage (${Math.round(used)}MB)`,
      details: { usedMB: Math.round(used), maxMB: maxHeapMB }
    };
  }
};

module.exports = {
  HealthCheck,
  createHealthCheck,
  commonChecks
};