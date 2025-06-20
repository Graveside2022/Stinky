#!/usr/bin/env node

/**
 * Setup Validation Script for Production Testing Framework
 * Validates that all components are ready for production testing
 * 
 * This script checks:
 * - Node.js services are functional
 * - Flask services are running
 * - Dependencies are installed
 * - Test scripts are executable
 * - Ports are available
 * - External integrations
 * 
 * Usage: node tests/validate-setup.js
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

class SetupValidator {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.results = {
            summary: { total: 0, passed: 0, failed: 0 },
            checks: [],
            errors: []
        };
    }
    
    async validate() {
        console.log('🔍 SETUP VALIDATION FOR PRODUCTION TESTING FRAMEWORK');
        console.log('===================================================');
        console.log('');
        
        // Run all validation checks
        await this.checkProjectStructure();
        await this.checkNodeJSServices();
        await this.checkFlaskServices();
        await this.checkDependencies();
        await this.checkScriptPermissions();
        await this.checkPortAvailability();
        await this.checkExternalServices();
        
        this.displayResults();
        return this.results.summary.failed === 0;
    }
    
    async runCheck(name, description, checkFunction) {
        this.results.summary.total++;
        console.log(`Checking ${description}...`);
        
        try {
            const result = await checkFunction();
            if (result.passed) {
                this.results.summary.passed++;
                console.log(`  ✅ ${result.message || 'Passed'}`);
            } else {
                this.results.summary.failed++;
                console.log(`  ❌ ${result.message || 'Failed'}`);
                if (result.error) {
                    this.results.errors.push({ check: name, error: result.error });
                }
            }
            
            this.results.checks.push({
                name,
                description,
                passed: result.passed,
                message: result.message,
                details: result.details
            });
            
        } catch (error) {
            this.results.summary.failed++;
            console.log(`  ❌ Error: ${error.message}`);
            this.results.errors.push({ check: name, error: error.message });
            
            this.results.checks.push({
                name,
                description,
                passed: false,
                message: `Error: ${error.message}`
            });
        }
    }
    
    async checkProjectStructure() {
        await this.runCheck('project_structure', 'project structure', async () => {
            const requiredPaths = [
                'src/nodejs/spectrum-analyzer/server.js',
                'src/nodejs/wigle-to-tak/server.js',
                'scripts/migration-cutover.sh',
                'scripts/migration-rollback.sh',
                'tests/production-monitoring.js',
                'tests/stress-test.js',
                'tests/api-compatibility-test.js',
                'tests/run-production-tests.sh'
            ];
            
            const missing = [];
            for (const filePath of requiredPaths) {
                if (!await fs.pathExists(path.join(this.projectRoot, filePath))) {
                    missing.push(filePath);
                }
            }
            
            if (missing.length > 0) {
                return {
                    passed: false,
                    message: `Missing files: ${missing.join(', ')}`,
                    error: 'Project structure incomplete'
                };
            }
            
            return {
                passed: true,
                message: 'All required files present',
                details: { checkedFiles: requiredPaths.length }
            };
        });
    }
    
    async checkNodeJSServices() {
        await this.runCheck('nodejs_services', 'Node.js services functionality', async () => {
            const services = [
                { name: 'Spectrum Analyzer', path: 'src/nodejs/spectrum-analyzer' },
                { name: 'WigleToTAK', path: 'src/nodejs/wigle-to-tak' }
            ];
            
            for (const service of services) {
                const servicePath = path.join(this.projectRoot, service.path);
                
                // Check if package.json exists
                if (!await fs.pathExists(path.join(servicePath, 'package.json'))) {
                    return {
                        passed: false,
                        message: `${service.name}: package.json missing`,
                        error: 'Node.js service not properly initialized'
                    };
                }
                
                // Check if node_modules exists
                if (!await fs.pathExists(path.join(servicePath, 'node_modules'))) {
                    return {
                        passed: false,
                        message: `${service.name}: dependencies not installed (run npm install)`,
                        error: 'Node.js dependencies missing'
                    };
                }
                
                // Check if server.js exists
                if (!await fs.pathExists(path.join(servicePath, 'server.js'))) {
                    return {
                        passed: false,
                        message: `${service.name}: server.js missing`,
                        error: 'Main server file not found'
                    };
                }
            }
            
            return {
                passed: true,
                message: 'All Node.js services properly configured',
                details: { services: services.length }
            };
        });
    }
    
    async checkFlaskServices() {
        await this.runCheck('flask_services', 'Flask services status', async () => {
            const services = [
                { name: 'Spectrum Analyzer', port: 8092, path: '/api/status' },
                { name: 'WigleToTAK', port: 8000, path: '/api/status' }
            ];
            
            const runningServices = [];
            const notRunningServices = [];
            
            for (const service of services) {
                try {
                    const response = await axios.get(`http://localhost:${service.port}${service.path}`, {
                        timeout: 3000
                    });
                    
                    if (response.status === 200) {
                        runningServices.push(service.name);
                    } else {
                        notRunningServices.push(`${service.name} (status: ${response.status})`);
                    }
                } catch (error) {
                    notRunningServices.push(`${service.name} (${error.message})`);
                }
            }
            
            if (runningServices.length === 0) {
                return {
                    passed: false,
                    message: 'No Flask services detected - this is expected if migration already completed',
                    details: { running: runningServices, notRunning: notRunningServices }
                };
            }
            
            return {
                passed: true,
                message: `${runningServices.length} Flask services running: ${runningServices.join(', ')}`,
                details: { running: runningServices, notRunning: notRunningServices }
            };
        });
    }
    
    async checkDependencies() {
        await this.runCheck('dependencies', 'testing dependencies', async () => {
            const testPackageJson = path.join(this.projectRoot, 'tests', 'package.json');
            const testNodeModules = path.join(this.projectRoot, 'tests', 'node_modules');
            
            if (!await fs.pathExists(testPackageJson)) {
                return {
                    passed: false,
                    message: 'Test package.json missing',
                    error: 'Test dependencies not initialized'
                };
            }
            
            if (!await fs.pathExists(testNodeModules)) {
                return {
                    passed: false,
                    message: 'Test dependencies not installed (run npm install in tests/)',
                    error: 'Test node_modules missing'
                };
            }
            
            // Check for required packages
            const requiredPackages = ['axios', 'ws', 'commander'];
            const packageJson = await fs.readJSON(testPackageJson);
            const dependencies = packageJson.dependencies || {};
            
            const missing = requiredPackages.filter(pkg => !dependencies[pkg]);
            
            if (missing.length > 0) {
                return {
                    passed: false,
                    message: `Missing packages: ${missing.join(', ')}`,
                    error: 'Required test dependencies missing'
                };
            }
            
            return {
                passed: true,
                message: 'All test dependencies installed',
                details: { packages: Object.keys(dependencies) }
            };
        });
    }
    
    async checkScriptPermissions() {
        await this.runCheck('script_permissions', 'script execution permissions', async () => {
            const scripts = [
                'scripts/migration-cutover.sh',
                'scripts/migration-rollback.sh', 
                'tests/run-production-tests.sh',
                'tests/production-monitoring.js',
                'tests/stress-test.js',
                'tests/api-compatibility-test.js'
            ];
            
            const nonExecutable = [];
            
            for (const script of scripts) {
                const scriptPath = path.join(this.projectRoot, script);
                try {
                    const stats = await fs.stat(scriptPath);
                    // Check if file is executable (owner execute permission)
                    if (!(stats.mode & parseInt('100', 8))) {
                        nonExecutable.push(script);
                    }
                } catch (error) {
                    nonExecutable.push(`${script} (not found)`);
                }
            }
            
            if (nonExecutable.length > 0) {
                return {
                    passed: false,
                    message: `Non-executable scripts: ${nonExecutable.join(', ')}`,
                    error: 'Scripts need execute permissions (chmod +x)'
                };
            }
            
            return {
                passed: true,
                message: 'All scripts have execute permissions',
                details: { scripts: scripts.length }
            };
        });
    }
    
    async checkPortAvailability() {
        await this.runCheck('port_availability', 'port availability for testing', async () => {
            const testPorts = [3001, 3002]; // Node.js test ports
            const productionPorts = [8092, 8000]; // Production ports
            
            const portStatus = {
                testPorts: { available: [], occupied: [] },
                productionPorts: { available: [], occupied: [] }
            };
            
            // Check test ports (should be available)
            for (const port of testPorts) {
                if (await this.isPortOccupied(port)) {
                    portStatus.testPorts.occupied.push(port);
                } else {
                    portStatus.testPorts.available.push(port);
                }
            }
            
            // Check production ports (may be occupied by Flask or Node.js)
            for (const port of productionPorts) {
                if (await this.isPortOccupied(port)) {
                    portStatus.productionPorts.occupied.push(port);
                } else {
                    portStatus.productionPorts.available.push(port);
                }
            }
            
            // Test ports should be available for testing
            if (portStatus.testPorts.occupied.length > 0) {
                return {
                    passed: false,
                    message: `Test ports occupied: ${portStatus.testPorts.occupied.join(', ')} - may interfere with testing`,
                    details: portStatus
                };
            }
            
            return {
                passed: true,
                message: `Test ports available. Production ports: ${portStatus.productionPorts.occupied.length} occupied, ${portStatus.productionPorts.available.length} available`,
                details: portStatus
            };
        });
    }
    
    async checkExternalServices() {
        await this.runCheck('external_services', 'external service integration', async () => {
            const services = [
                { name: 'OpenWebRX', url: 'http://localhost:8073', required: false },
                { name: 'GPSD', port: 2947, required: false }
            ];
            
            const status = { available: [], unavailable: [] };
            
            for (const service of services) {
                if (service.url) {
                    try {
                        await axios.get(service.url, { timeout: 3000 });
                        status.available.push(service.name);
                    } catch (error) {
                        status.unavailable.push(`${service.name} (${error.message})`);
                    }
                } else if (service.port) {
                    if (await this.isPortOccupied(service.port)) {
                        status.available.push(service.name);
                    } else {
                        status.unavailable.push(service.name);
                    }
                }
            }
            
            return {
                passed: true, // External services are optional
                message: `Available: ${status.available.join(', ') || 'none'}. Unavailable: ${status.unavailable.join(', ') || 'none'}`,
                details: status
            };
        });
    }
    
    async isPortOccupied(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();
            
            socket.setTimeout(1000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            
            socket.on('error', () => {
                resolve(false);
            });
            
            socket.connect(port, 'localhost');
        });
    }
    
    displayResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 SETUP VALIDATION RESULTS');
        console.log('='.repeat(60));
        
        console.log(`\nSUMMARY: ${this.results.summary.passed}/${this.results.summary.total} checks passed`);
        
        if (this.results.summary.failed === 0) {
            console.log('🎉 ALL CHECKS PASSED - Ready for production testing!');
        } else {
            console.log(`⚠️  ${this.results.summary.failed} checks failed - issues need attention`);
        }
        
        console.log('\nDETAILED RESULTS:');
        this.results.checks.forEach(check => {
            const status = check.passed ? '✅' : '❌';
            console.log(`  ${status} ${check.description}: ${check.message}`);
        });
        
        if (this.results.errors.length > 0) {
            console.log('\nERRORS:');
            this.results.errors.forEach(error => {
                console.log(`  ❌ ${error.check}: ${error.error}`);
            });
        }
        
        console.log('\nNEXT STEPS:');
        if (this.results.summary.failed === 0) {
            console.log('  ✅ Setup is ready - you can run production tests');
            console.log('  🚀 Quick test: ./tests/run-production-tests.sh --quick');
            console.log('  📊 Full test: ./tests/run-production-tests.sh');
            console.log('  🔍 Monitor only: ./tests/run-production-tests.sh --monitoring-only');
        } else {
            console.log('  🔧 Fix the issues identified above');
            console.log('  📝 Check the error messages for specific resolution steps');
            console.log('  ♻️  Re-run validation after fixes: node tests/validate-setup.js');
        }
        
        console.log('='.repeat(60));
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new SetupValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = SetupValidator;