#!/usr/bin/env node

/**
 * Stinkster Node.js Application - Main Entry Point
 * 
 * This is the main entry point for the Stinkster Node.js migration.
 * It coordinates all three services: Spectrum Analyzer, WigleToTAK, and GPS Bridge.
 * 
 * Usage:
 *   node app.js                    # Start all services
 *   node app.js --service=spectrum # Start only spectrum analyzer
 *   node app.js --service=wigle    # Start only WigleToTAK
 *   node app.js --service=gps      # Start only GPS bridge
 */

const cluster = require('cluster');
const os = require('os');
const path = require('path');
const { program } = require('commander');

// Import services
const SpectrumAnalyzerService = require('./spectrum-analyzer');
const WigleToTAKService = require('./wigle-to-tak');
const GPSBridgeService = require('./gps-bridge');

// Import shared utilities
const logger = require('./shared/logger');
const config = require('./config');

class StinksterApplication {
    constructor() {
        this.services = new Map();
        this.isShuttingDown = false;
        
        this.setupCommandLine();
        this.setupSignalHandlers();
    }

    setupCommandLine() {
        program
            .version('2.0.0')
            .description('Stinkster Node.js - Raspberry Pi SDR & WiFi Intelligence Platform')
            .option('-s, --service <service>', 'Start specific service only (spectrum|wigle|gps|all)', 'all')
            .option('-p, --port <port>', 'Override default ports (format: spectrum:8092,wigle:8000,gps:2947)')
            .option('-c, --config <path>', 'Configuration file path', './config/default.json')
            .option('-e, --env <environment>', 'Environment (development|production)', 'production')
            .option('--cluster', 'Enable cluster mode (one process per CPU core)')
            .option('--debug', 'Enable debug logging')
            .parse();

        this.options = program.opts();
        
        if (this.options.debug) {
            logger.level = 'debug';
        }
    }

    setupSignalHandlers() {
        // Graceful shutdown handlers
        process.on('SIGINT', () => this.shutdown('SIGINT'));
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('SIGHUP', () => this.restart());
        
        // Error handlers
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            this.shutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.shutdown('unhandledRejection');
        });
    }

    parsePortOverrides() {
        if (!this.options.port) return {};
        
        const overrides = {};
        const portPairs = this.options.port.split(',');
        
        for (const pair of portPairs) {
            const [service, port] = pair.split(':');
            if (service && port) {
                overrides[service] = parseInt(port, 10);
            }
        }
        
        return overrides;
    }

    async startServices() {
        const portOverrides = this.parsePortOverrides();
        const servicesToStart = this.options.service === 'all' 
            ? ['spectrum', 'wigle', 'gps'] 
            : [this.options.service];

        logger.info(`Starting Stinkster Node.js Application v2.0.0`);
        logger.info(`Environment: ${this.options.env}`);
        logger.info(`Services to start: ${servicesToStart.join(', ')}`);
        logger.info(`Cluster mode: ${this.options.cluster ? 'enabled' : 'disabled'}`);

        for (const serviceName of servicesToStart) {
            try {
                await this.startService(serviceName, portOverrides);
            } catch (error) {
                logger.error(`Failed to start ${serviceName} service:`, error);
                throw error;
            }
        }

        logger.info('All services started successfully');
        this.logSystemStatus();
    }

    async startService(serviceName, portOverrides = {}) {
        let ServiceClass, defaultPort;
        
        switch (serviceName) {
            case 'spectrum':
                ServiceClass = SpectrumAnalyzerService;
                defaultPort = config.spectrum?.port || 8092;
                break;
            case 'wigle':
                ServiceClass = WigleToTAKService;
                defaultPort = config.wigleToTak?.port || 8000;
                break;
            case 'gps':
                ServiceClass = GPSBridgeService;
                defaultPort = config.gpsBridge?.port || 2947;
                break;
            default:
                throw new Error(`Unknown service: ${serviceName}`);
        }

        const port = portOverrides[serviceName] || defaultPort;
        
        logger.info(`Starting ${serviceName} service on port ${port}...`);
        
        const service = new ServiceClass({
            port,
            environment: this.options.env,
            config: config[serviceName] || {}
        });

        await service.start();
        this.services.set(serviceName, service);
        
        logger.info(`✅ ${serviceName} service started successfully on port ${port}`);
    }

    logSystemStatus() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        logger.info('System Status:');
        logger.info(`  Node.js Version: ${process.version}`);
        logger.info(`  Platform: ${process.platform} ${process.arch}`);
        logger.info(`  PID: ${process.pid}`);
        logger.info(`  Memory Usage:`);
        logger.info(`    RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
        logger.info(`    Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
        logger.info(`    Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
        logger.info(`  Services Running: ${this.services.size}`);
        
        // Log individual service status
        for (const [name, service] of this.services) {
            if (service.getStatus) {
                const status = service.getStatus();
                logger.info(`  ${name}: ${status.status} (${status.uptime}ms uptime)`);
            }
        }
    }

    async shutdown(signal) {
        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress...');
            return;
        }
        
        this.isShuttingDown = true;
        logger.info(`Received ${signal}, initiating graceful shutdown...`);

        try {
            // Stop services in reverse order
            const serviceNames = Array.from(this.services.keys()).reverse();
            
            for (const serviceName of serviceNames) {
                const service = this.services.get(serviceName);
                if (service && service.stop) {
                    logger.info(`Stopping ${serviceName} service...`);
                    await service.stop();
                    logger.info(`✅ ${serviceName} service stopped`);
                }
            }

            logger.info('All services stopped successfully');
            process.exit(0);
            
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    async restart() {
        logger.info('Received SIGHUP, restarting services...');
        
        try {
            // Stop all services
            for (const [name, service] of this.services) {
                if (service.stop) {
                    await service.stop();
                }
            }
            
            this.services.clear();
            
            // Restart services
            await this.startServices();
            
            logger.info('Services restarted successfully');
            
        } catch (error) {
            logger.error('Error during restart:', error);
            this.shutdown('restart-error');
        }
    }

    async run() {
        try {
            if (this.options.cluster && cluster.isMaster) {
                await this.runClusterMode();
            } else {
                await this.startServices();
            }
        } catch (error) {
            logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    async runClusterMode() {
        const numCPUs = os.cpus().length;
        logger.info(`Starting cluster mode with ${numCPUs} workers`);

        cluster.setupMaster({
            exec: __filename,
            args: process.argv.slice(2).filter(arg => arg !== '--cluster')
        });

        // Fork workers
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            logger.warn(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
            cluster.fork();
        });

        cluster.on('online', (worker) => {
            logger.info(`Worker ${worker.process.pid} is online`);
        });
    }
}

// Health check endpoint for Docker/systemd
function healthCheck() {
    const express = require('express');
    const app = express();
    
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            pid: process.pid
        });
    });
    
    const port = process.env.HEALTH_CHECK_PORT || 9000;
    app.listen(port, () => {
        logger.debug(`Health check endpoint running on port ${port}`);
    });
}

// Main execution
if (require.main === module) {
    const app = new StinksterApplication();
    
    // Start health check endpoint
    healthCheck();
    
    // Run the application
    app.run().catch(error => {
        logger.error('Application startup failed:', error);
        process.exit(1);
    });
}

module.exports = StinksterApplication;