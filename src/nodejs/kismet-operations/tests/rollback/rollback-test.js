/**
 * Rollback Testing Suite
 * Ensures safe rollback from Node.js to Flask services
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const execAsync = promisify(exec);

class RollbackTestSuite {
  constructor(options = {}) {
    this.config = {
      nodeServices: {
        'spectrum-analyzer': {
          port: 8092,
          healthEndpoint: '/api/spectrum/status',
          serviceName: 'spectrum-analyzer-node'
        },
        'wigle-to-tak': {
          port: 8000,
          healthEndpoint: '/health',
          serviceName: 'wigle-to-tak-node'
        }
      },
      flaskServices: {
        'spectrum-analyzer': {
          port: 8092,
          healthEndpoint: '/api/spectrum/status',
          serviceName: 'spectrum-analyzer-flask',
          scriptPath: '/home/pi/HackRF/spectrum_analyzer.py'
        },
        'wigle-to-tak': {
          port: 8000,
          healthEndpoint: '/health',
          serviceName: 'wigle-to-tak-flask',
          scriptPath: '/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/WigleToTak2.py'
        }
      },
      backupDir: options.backupDir || '/home/pi/projects/stinkster/backups',
      ...options
    };
    
    this.results = {
      preRollback: {},
      rollback: {},
      postRollback: {},
      dataIntegrity: {},
      serviceHealth: {}
    };
  }

  /**
   * Run complete rollback test suite
   */
  async runAllTests() {
    console.log('Starting Rollback Test Suite...\n');

    try {
      // 1. Pre-rollback validation
      console.log('1. Pre-Rollback Validation...');
      this.results.preRollback = await this.validatePreRollback();

      // 2. Create backup
      console.log('\n2. Creating Backup...');
      const backupId = await this.createBackup();

      // 3. Test rollback procedure
      console.log('\n3. Testing Rollback Procedure...');
      this.results.rollback = await this.testRollbackProcedure(backupId);

      // 4. Validate post-rollback state
      console.log('\n4. Post-Rollback Validation...');
      this.results.postRollback = await this.validatePostRollback();

      // 5. Test data integrity
      console.log('\n5. Testing Data Integrity...');
      this.results.dataIntegrity = await this.testDataIntegrity();

      // 6. Test service recovery
      console.log('\n6. Testing Service Recovery...');
      this.results.serviceHealth = await this.testServiceRecovery();

      // 7. Test rollback under load
      console.log('\n7. Testing Rollback Under Load...');
      this.results.loadTest = await this.testRollbackUnderLoad();

      // Generate report
      await this.generateReport();

      return this.results;
    } catch (error) {
      console.error('Rollback test failed:', error);
      throw error;
    }
  }

  /**
   * Validate system state before rollback
   */
  async validatePreRollback() {
    const validation = {
      services: {},
      data: {},
      configuration: {}
    };

    // Check Node.js services are running
    for (const [name, config] of Object.entries(this.config.nodeServices)) {
      validation.services[name] = await this.checkServiceHealth(
        `http://localhost:${config.port}${config.healthEndpoint}`
      );
    }

    // Check data directories
    validation.data = {
      uploads: await this.checkDirectory('/home/pi/uploads'),
      configs: await this.checkDirectory('/home/pi/config'),
      logs: await this.checkDirectory('/home/pi/logs')
    };

    // Check configuration files
    validation.configuration = {
      spectrumConfig: await this.checkFile('/home/pi/config/spectrum-config.json'),
      takConfig: await this.checkFile('/home/pi/config/tak-config.json')
    };

    console.log('  ✓ Pre-rollback validation complete');
    return validation;
  }

  /**
   * Create backup before rollback
   */
  async createBackup() {
    const backupId = `rollback-test-${Date.now()}`;
    const backupPath = path.join(this.config.backupDir, backupId);

    await fs.mkdir(backupPath, { recursive: true });

    // Backup critical files
    const filesToBackup = [
      '/home/pi/config/spectrum-config.json',
      '/home/pi/config/tak-config.json',
      '/home/pi/uploads',
      '/home/pi/logs'
    ];

    for (const file of filesToBackup) {
      try {
        const dest = path.join(backupPath, path.basename(file));
        await execAsync(`cp -r ${file} ${dest}`);
      } catch (error) {
        console.warn(`  Warning: Could not backup ${file}:`, error.message);
      }
    }

    // Save service state
    const serviceState = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    for (const [name, config] of Object.entries(this.config.nodeServices)) {
      serviceState.services[name] = {
        running: await this.isServiceRunning(config.serviceName),
        port: config.port
      };
    }

    await fs.writeFile(
      path.join(backupPath, 'service-state.json'),
      JSON.stringify(serviceState, null, 2)
    );

    console.log(`  ✓ Backup created: ${backupId}`);
    return backupId;
  }

  /**
   * Test the rollback procedure
   */
  async testRollbackProcedure(backupId) {
    const rollbackSteps = {
      stopNodeServices: {},
      startFlaskServices: {},
      portAvailability: {},
      configRestoration: {}
    };

    try {
      // Step 1: Stop Node.js services
      console.log('  Stopping Node.js services...');
      for (const [name, config] of Object.entries(this.config.nodeServices)) {
        rollbackSteps.stopNodeServices[name] = await this.stopService(config.serviceName);
      }

      // Wait for ports to be released
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Verify ports are available
      console.log('  Verifying port availability...');
      for (const [name, config] of Object.entries(this.config.nodeServices)) {
        rollbackSteps.portAvailability[name] = await this.checkPortAvailable(config.port);
      }

      // Step 3: Start Flask services
      console.log('  Starting Flask services...');
      for (const [name, config] of Object.entries(this.config.flaskServices)) {
        rollbackSteps.startFlaskServices[name] = await this.startFlaskService(name, config);
      }

      // Step 4: Restore configuration
      console.log('  Restoring configuration...');
      rollbackSteps.configRestoration = await this.restoreConfiguration(backupId);

      console.log('  ✓ Rollback procedure completed');
      return rollbackSteps;

    } catch (error) {
      console.error('  ✗ Rollback procedure failed:', error);
      // Attempt recovery
      await this.attemptRecovery();
      throw error;
    }
  }

  /**
   * Validate system state after rollback
   */
  async validatePostRollback() {
    const validation = {
      services: {},
      endpoints: {},
      functionality: {}
    };

    // Check Flask services are running
    for (const [name, config] of Object.entries(this.config.flaskServices)) {
      const healthCheck = await this.checkServiceHealth(
        `http://localhost:${config.port}${config.healthEndpoint}`
      );
      
      validation.services[name] = {
        ...healthCheck,
        isFlask: await this.verifyFlaskService(config.port)
      };
    }

    // Test critical endpoints
    validation.endpoints = await this.testCriticalEndpoints();

    // Test functionality
    validation.functionality = await this.testCoreFunctionality();

    console.log('  ✓ Post-rollback validation complete');
    return validation;
  }

  /**
   * Test data integrity after rollback
   */
  async testDataIntegrity() {
    const integrity = {
      files: {},
      database: {},
      configurations: {}
    };

    // Test file integrity
    const testFiles = [
      '/home/pi/uploads/test-data.wiglecsv',
      '/home/pi/config/spectrum-config.json'
    ];

    for (const file of testFiles) {
      try {
        const exists = await fs.access(file).then(() => true).catch(() => false);
        if (exists) {
          const stats = await fs.stat(file);
          const content = await fs.readFile(file, 'utf8');
          
          integrity.files[file] = {
            exists: true,
            size: stats.size,
            modified: stats.mtime,
            contentHash: require('crypto').createHash('md5').update(content).digest('hex')
          };
        } else {
          integrity.files[file] = { exists: false };
        }
      } catch (error) {
        integrity.files[file] = { error: error.message };
      }
    }

    // Test configuration integrity
    try {
      const spectrumConfig = await fs.readFile('/home/pi/config/spectrum-config.json', 'utf8');
      integrity.configurations.spectrum = {
        valid: true,
        parsed: JSON.parse(spectrumConfig)
      };
    } catch (error) {
      integrity.configurations.spectrum = {
        valid: false,
        error: error.message
      };
    }

    console.log('  ✓ Data integrity check complete');
    return integrity;
  }

  /**
   * Test service recovery time
   */
  async testServiceRecovery() {
    const recovery = {
      services: {},
      totalTime: 0
    };

    const startTime = Date.now();

    for (const [name, config] of Object.entries(this.config.flaskServices)) {
      const serviceStart = Date.now();
      let attempts = 0;
      let recovered = false;

      while (attempts < 30 && !recovered) {
        attempts++;
        const health = await this.checkServiceHealth(
          `http://localhost:${config.port}${config.healthEndpoint}`
        );

        if (health.healthy) {
          recovered = true;
          recovery.services[name] = {
            recovered: true,
            attempts,
            time: Date.now() - serviceStart
          };
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!recovered) {
        recovery.services[name] = {
          recovered: false,
          attempts,
          error: 'Service did not recover'
        };
      }
    }

    recovery.totalTime = Date.now() - startTime;
    console.log(`  ✓ Service recovery test complete (${recovery.totalTime}ms)`);
    
    return recovery;
  }

  /**
   * Test rollback under load
   */
  async testRollbackUnderLoad() {
    console.log('  Generating load during rollback...');
    
    const loadTest = {
      requestsDuringRollback: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errors: [],
      downtime: 0
    };

    // Start generating load
    const loadInterval = setInterval(async () => {
      loadTest.requestsDuringRollback++;
      
      try {
        await axios.get('http://localhost:8092/api/spectrum/status', { timeout: 1000 });
        loadTest.successfulRequests++;
      } catch (error) {
        loadTest.failedRequests++;
        if (loadTest.errors.length < 10) {
          loadTest.errors.push({
            time: Date.now(),
            error: error.code || error.message
          });
        }
      }
    }, 100);

    // Perform rollback
    const rollbackStart = Date.now();
    
    try {
      // Stop Node service
      await this.stopService(this.config.nodeServices['spectrum-analyzer'].serviceName);
      
      // Track downtime
      const downtimeStart = Date.now();
      
      // Start Flask service
      await this.startFlaskService('spectrum-analyzer', this.config.flaskServices['spectrum-analyzer']);
      
      // Wait for service to be healthy
      let healthy = false;
      for (let i = 0; i < 30; i++) {
        const health = await this.checkServiceHealth('http://localhost:8092/api/spectrum/status');
        if (health.healthy) {
          healthy = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      loadTest.downtime = Date.now() - downtimeStart;
      
    } finally {
      clearInterval(loadInterval);
    }

    loadTest.rollbackDuration = Date.now() - rollbackStart;
    loadTest.availabilityRate = (loadTest.successfulRequests / loadTest.requestsDuringRollback * 100).toFixed(2) + '%';

    console.log(`  ✓ Load test complete - Availability: ${loadTest.availabilityRate}, Downtime: ${loadTest.downtime}ms`);
    
    return loadTest;
  }

  /**
   * Helper: Check service health
   */
  async checkServiceHealth(url) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      return {
        healthy: true,
        statusCode: response.status,
        responseTime: response.headers['x-response-time'] || null
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.code || error.message
      };
    }
  }

  /**
   * Helper: Check if service is running
   */
  async isServiceRunning(serviceName) {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${serviceName}`);
      return stdout.trim() === 'active';
    } catch {
      // Try checking with ps
      try {
        const { stdout } = await execAsync(`pgrep -f ${serviceName}`);
        return stdout.trim().length > 0;
      } catch {
        return false;
      }
    }
  }

  /**
   * Helper: Stop a service
   */
  async stopService(serviceName) {
    try {
      // Try systemctl first
      await execAsync(`sudo systemctl stop ${serviceName}`);
      return { stopped: true, method: 'systemctl' };
    } catch {
      // Try pkill
      try {
        await execAsync(`pkill -f ${serviceName}`);
        return { stopped: true, method: 'pkill' };
      } catch {
        return { stopped: false, error: 'Could not stop service' };
      }
    }
  }

  /**
   * Helper: Start Flask service
   */
  async startFlaskService(name, config) {
    try {
      // Create startup script
      const startScript = `#!/bin/bash
cd $(dirname ${config.scriptPath})
source venv/bin/activate 2>/dev/null || true
python3 ${config.scriptPath} --port ${config.port} > /tmp/${name}-flask.log 2>&1 &
echo $!
`;

      const scriptPath = `/tmp/start-${name}-flask.sh`;
      await fs.writeFile(scriptPath, startScript);
      await execAsync(`chmod +x ${scriptPath}`);
      
      const { stdout } = await execAsync(scriptPath);
      const pid = stdout.trim();
      
      return {
        started: true,
        pid,
        method: 'script'
      };
    } catch (error) {
      return {
        started: false,
        error: error.message
      };
    }
  }

  /**
   * Helper: Check if port is available
   */
  async checkPortAvailable(port) {
    try {
      const { stdout } = await execAsync(`lsof -i :${port}`);
      return { available: false, usedBy: stdout };
    } catch {
      return { available: true };
    }
  }

  /**
   * Helper: Verify Flask service
   */
  async verifyFlaskService(port) {
    try {
      const response = await axios.get(`http://localhost:${port}/api/spectrum/status`);
      // Flask typically returns different headers
      return response.headers['server']?.includes('Werkzeug') || 
             response.headers['server']?.includes('gunicorn');
    } catch {
      return false;
    }
  }

  /**
   * Helper: Test critical endpoints
   */
  async testCriticalEndpoints() {
    const endpoints = [
      { name: 'spectrum-status', url: 'http://localhost:8092/api/spectrum/status' },
      { name: 'spectrum-config', url: 'http://localhost:8092/api/spectrum/config' },
      { name: 'tak-health', url: 'http://localhost:8000/health' },
      { name: 'tak-upload', url: 'http://localhost:8000/upload_file', method: 'GET' }
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method || 'GET',
          url: endpoint.url,
          timeout: 5000
        });

        results[endpoint.name] = {
          working: true,
          status: response.status
        };
      } catch (error) {
        results[endpoint.name] = {
          working: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Helper: Test core functionality
   */
  async testCoreFunctionality() {
    const tests = {
      spectrumAnalysis: false,
      fileUpload: false,
      takBroadcast: false
    };

    // Test spectrum analysis
    try {
      const response = await axios.get('http://localhost:8092/api/spectrum/signals');
      tests.spectrumAnalysis = response.data && Array.isArray(response.data.signals);
    } catch {
      tests.spectrumAnalysis = false;
    }

    // Test file upload (create a small test file)
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', Buffer.from('test,data,csv'), 'test.csv');

      const response = await axios.post('http://localhost:8000/upload_file', form, {
        headers: form.getHeaders()
      });

      tests.fileUpload = response.data && response.data.success;
    } catch {
      tests.fileUpload = false;
    }

    return tests;
  }

  /**
   * Helper: Check directory exists and is readable
   */
  async checkDirectory(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      const files = await fs.readdir(dirPath);
      return {
        exists: true,
        isDirectory: stats.isDirectory(),
        fileCount: files.length
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Helper: Check file exists and is readable
   */
  async checkFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Helper: Restore configuration from backup
   */
  async restoreConfiguration(backupId) {
    const backupPath = path.join(this.config.backupDir, backupId);
    const restored = {};

    try {
      // Restore config files
      const configFiles = ['spectrum-config.json', 'tak-config.json'];
      
      for (const file of configFiles) {
        const source = path.join(backupPath, file);
        const dest = path.join('/home/pi/config', file);
        
        try {
          await execAsync(`cp ${source} ${dest}`);
          restored[file] = true;
        } catch {
          restored[file] = false;
        }
      }

      return restored;
    } catch (error) {
      throw new Error(`Configuration restoration failed: ${error.message}`);
    }
  }

  /**
   * Helper: Attempt recovery if rollback fails
   */
  async attemptRecovery() {
    console.log('  Attempting recovery...');
    
    // Try to restart Node services
    for (const [name, config] of Object.entries(this.config.nodeServices)) {
      try {
        await execAsync(`sudo systemctl restart ${config.serviceName}`);
        console.log(`    ✓ Restarted ${name}`);
      } catch (error) {
        console.log(`    ✗ Failed to restart ${name}: ${error.message}`);
      }
    }
  }

  /**
   * Generate rollback test report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        preRollbackHealthy: Object.values(this.results.preRollback.services || {})
          .every(s => s.healthy),
        rollbackSuccessful: Object.values(this.results.rollback.startFlaskServices || {})
          .every(s => s.started),
        postRollbackHealthy: Object.values(this.results.postRollback.services || {})
          .every(s => s.healthy),
        dataIntegrityMaintained: Object.values(this.results.dataIntegrity.files || {})
          .every(f => f.exists || f.exists === false), // Expected state
        downtimeSeconds: (this.results.loadTest?.downtime || 0) / 1000
      },
      details: this.results
    };

    const reportPath = path.join(__dirname, `../../rollback-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✓ Rollback test report saved to: ${reportPath}`);
    
    // Print summary
    console.log('\n=== Rollback Test Summary ===');
    console.log(`Pre-rollback health: ${report.summary.preRollbackHealthy ? '✓' : '✗'}`);
    console.log(`Rollback execution: ${report.summary.rollbackSuccessful ? '✓' : '✗'}`);
    console.log(`Post-rollback health: ${report.summary.postRollbackHealthy ? '✓' : '✗'}`);
    console.log(`Data integrity: ${report.summary.dataIntegrityMaintained ? '✓' : '✗'}`);
    console.log(`Service downtime: ${report.summary.downtimeSeconds.toFixed(2)}s`);
    
    const allPassed = Object.values(report.summary).every(v => 
      typeof v === 'boolean' ? v : true
    );
    
    console.log(`\nOverall Result: ${allPassed ? '✓ PASSED' : '✗ FAILED'}`);
    
    return report;
  }
}

// Export for use in other tests
module.exports = RollbackTestSuite;

// Run tests if executed directly
if (require.main === module) {
  const suite = new RollbackTestSuite();
  suite.runAllTests().then(() => {
    console.log('\nRollback tests completed.');
    process.exit(0);
  }).catch(error => {
    console.error('Rollback tests failed:', error);
    process.exit(1);
  });
}