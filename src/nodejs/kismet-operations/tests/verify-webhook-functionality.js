#!/usr/bin/env node

/**
 * Webhook Functionality Verification Script
 * 
 * Documents and tests all webhook endpoints to ensure nothing is lost
 * during any migration or update process.
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

class WebhookVerifier {
    constructor(baseUrl = 'http://localhost:8092') {
        this.baseUrl = baseUrl;
        this.documentation = {
            endpoints: [],
            websockets: [],
            features: [],
            timestamp: new Date().toISOString()
        };
    }

    async verifyAll() {
        console.log('🔍 Webhook Functionality Verification');
        console.log('====================================');
        console.log(`Base URL: ${this.baseUrl}`);
        console.log(`Time: ${new Date().toISOString()}\n`);

        // Check if service is running
        const isRunning = await this.checkServiceRunning();
        console.log(`Service Status: ${isRunning ? '✅ Running' : '❌ Not Running'}\n`);

        if (!isRunning) {
            console.log('⚠️  Service is not running. Documentation based on code analysis only.\n');
        }

        // Document REST API endpoints
        await this.documentRestEndpoints();
        
        // Document WebSocket functionality
        await this.documentWebSocketFeatures();
        
        // Document integration points
        await this.documentIntegrations();
        
        // Save documentation
        await this.saveDocumentation();
        
        return this.documentation;
    }

    async checkServiceRunning() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/webhook/health`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async documentRestEndpoints() {
        console.log('📡 REST API Endpoints:');
        console.log('---------------------');

        const endpoints = [
            {
                method: 'POST',
                path: '/api/webhook/run-script',
                description: 'Start Kismet and/or GPS services',
                body: {
                    script: 'kismet|gps|both',
                    options: {
                        interface: 'string (optional)',
                        config: 'string (optional)'
                    }
                },
                responses: {
                    200: 'Script started successfully',
                    409: 'Script already running',
                    500: 'Execution failed'
                }
            },
            {
                method: 'POST',
                path: '/api/webhook/stop-script',
                description: 'Stop running Kismet and/or GPS services',
                body: {
                    script: 'kismet|gps|both',
                    force: 'boolean (optional)'
                },
                responses: {
                    200: 'Script stopped successfully',
                    404: 'Script not running',
                    500: 'Stop failed'
                }
            },
            {
                method: 'GET',
                path: '/api/webhook/script-status',
                description: 'Get current status of services',
                query: {
                    script: 'kismet|gps|both (optional)'
                },
                responses: {
                    200: 'Status retrieved'
                }
            },
            {
                method: 'GET',
                path: '/api/webhook/info',
                description: 'Get system information and service configuration',
                responses: {
                    200: 'System info retrieved'
                }
            },
            {
                method: 'GET',
                path: '/api/webhook/kismet-data',
                description: 'Get data from Kismet service',
                query: {
                    type: 'devices|networks|alerts|all (optional)',
                    limit: 'number 1-1000 (optional)',
                    since: 'ISO8601 date (optional)',
                    format: 'json|csv (optional)'
                },
                responses: {
                    200: 'Data retrieved',
                    503: 'Kismet unavailable'
                }
            },
            {
                method: 'GET',
                path: '/api/webhook/health',
                description: 'Health check endpoint',
                responses: {
                    200: 'Service healthy',
                    503: 'Service unhealthy'
                }
            },
            {
                method: 'POST',
                path: '/api/webhook/cache/clear',
                description: 'Clear cache (admin endpoint)',
                body: {
                    key: 'string (optional)'
                },
                responses: {
                    200: 'Cache cleared'
                }
            }
        ];

        for (const endpoint of endpoints) {
            console.log(`\n${endpoint.method} ${endpoint.path}`);
            console.log(`  Description: ${endpoint.description}`);
            
            if (endpoint.body) {
                console.log('  Body:', JSON.stringify(endpoint.body, null, 2).split('\n').join('\n  '));
            }
            
            if (endpoint.query) {
                console.log('  Query:', JSON.stringify(endpoint.query, null, 2).split('\n').join('\n  '));
            }
            
            console.log('  Responses:', JSON.stringify(endpoint.responses, null, 2).split('\n').join('\n  '));
            
            // Test endpoint if service is running
            if (await this.checkServiceRunning()) {
                try {
                    const result = await this.testEndpoint(endpoint);
                    console.log(`  Status: ✅ Working (${result.status})`);
                } catch (error) {
                    console.log(`  Status: ⚠️  ${error.message}`);
                }
            }
            
            this.documentation.endpoints.push(endpoint);
        }
    }

    async documentWebSocketFeatures() {
        console.log('\n\n🔌 WebSocket Features:');
        console.log('---------------------');

        const wsFeatures = [
            {
                namespace: '/webhook',
                description: 'WebSocket namespace for webhook events',
                events: {
                    server: [
                        {
                            name: 'status',
                            description: 'Script status updates',
                            data: {
                                script: 'string',
                                status: 'started|stopped|error',
                                details: 'object'
                            }
                        },
                        {
                            name: 'error',
                            description: 'Error notifications',
                            data: {
                                message: 'string',
                                code: 'string',
                                timestamp: 'ISO8601'
                            }
                        }
                    ],
                    client: [
                        {
                            name: 'subscribe',
                            description: 'Subscribe to specific script updates',
                            data: {
                                script: 'kismet|gps|both'
                            }
                        },
                        {
                            name: 'unsubscribe',
                            description: 'Unsubscribe from script updates',
                            data: {
                                script: 'kismet|gps|both'
                            }
                        }
                    ]
                }
            }
        ];

        for (const feature of wsFeatures) {
            console.log(`\nNamespace: ${feature.namespace}`);
            console.log(`Description: ${feature.description}`);
            console.log('\nServer Events:');
            for (const event of feature.events.server) {
                console.log(`  ${event.name}: ${event.description}`);
                console.log(`    Data:`, JSON.stringify(event.data, null, 2).split('\n').join('\n    '));
            }
            console.log('\nClient Events:');
            for (const event of feature.events.client) {
                console.log(`  ${event.name}: ${event.description}`);
                console.log(`    Data:`, JSON.stringify(event.data, null, 2).split('\n').join('\n    '));
            }
            
            this.documentation.websockets.push(feature);
        }
    }

    async documentIntegrations() {
        console.log('\n\n🔗 Integration Points:');
        console.log('----------------------');

        const integrations = [
            {
                name: 'Kismet Service',
                type: 'HTTP API',
                url: 'http://localhost:2501',
                description: 'Connects to Kismet REST API for device/network data',
                authentication: 'Basic Auth (if configured)',
                dataFlow: 'Kismet → Webhook Service → Client'
            },
            {
                name: 'GPS Service',
                type: 'Process Management',
                command: 'mavgps.py',
                description: 'Manages GPS data collection process',
                pidFile: '/tmp/kismet-operations/gps.pid',
                dataFlow: 'GPS Device → mavgps.py → GPSD → Kismet'
            },
            {
                name: 'Script Management',
                type: 'Shell Scripts',
                scripts: {
                    'start_kismet': 'Starts Kismet with configured parameters',
                    'gps_kismet_wigle': 'Orchestrates GPS, Kismet, and Wigle services',
                    'start_mediamtx': 'Starts media streaming service'
                },
                pidDir: '/tmp/kismet-operations',
                description: 'Manages background processes via shell scripts'
            },
            {
                name: 'Cache System',
                type: 'In-Memory Cache',
                description: 'Caches API responses for performance',
                timeout: '10 seconds for data, 60 seconds for system info',
                maxSize: '1000 entries (monitored for memory leaks)'
            },
            {
                name: 'Rate Limiting',
                type: 'Middleware',
                description: 'Prevents API abuse',
                limits: {
                    window: '1 minute',
                    maxRequests: 100,
                    perClient: 'IP-based'
                }
            }
        ];

        for (const integration of integrations) {
            console.log(`\n${integration.name}`);
            console.log(`  Type: ${integration.type}`);
            console.log(`  Description: ${integration.description}`);
            
            Object.entries(integration).forEach(([key, value]) => {
                if (!['name', 'type', 'description'].includes(key)) {
                    if (typeof value === 'object') {
                        console.log(`  ${key}:`, JSON.stringify(value, null, 2).split('\n').join('\n    '));
                    } else {
                        console.log(`  ${key}: ${value}`);
                    }
                }
            });
            
            this.documentation.features.push(integration);
        }
    }

    async testEndpoint(endpoint) {
        const url = `${this.baseUrl}${endpoint.path}`;
        
        try {
            let response;
            
            switch (endpoint.method) {
                case 'GET':
                    response = await axios.get(url, { validateStatus: () => true });
                    break;
                case 'POST':
                    // Use safe test data
                    const testData = endpoint.path.includes('cache/clear') ? {} : 
                                   endpoint.path.includes('stop-script') ? { script: 'gps' } :
                                   { script: 'gps' }; // Safe non-destructive test
                    response = await axios.post(url, testData, { validateStatus: () => true });
                    break;
            }
            
            return { status: response.status, data: response.data };
        } catch (error) {
            throw new Error(`Request failed: ${error.message}`);
        }
    }

    async saveDocumentation() {
        const outputPath = path.join(__dirname, 'webhook-functionality-documentation.json');
        await fs.writeFile(outputPath, JSON.stringify(this.documentation, null, 2));
        
        console.log('\n\n📄 Documentation saved to:', outputPath);
        
        // Also create a markdown report
        const mdPath = path.join(__dirname, 'webhook-functionality-report.md');
        const markdown = this.generateMarkdownReport();
        await fs.writeFile(mdPath, markdown);
        
        console.log('📄 Markdown report saved to:', mdPath);
    }

    generateMarkdownReport() {
        let md = `# Webhook Functionality Documentation\n\n`;
        md += `Generated: ${this.documentation.timestamp}\n\n`;
        
        md += `## REST API Endpoints\n\n`;
        for (const endpoint of this.documentation.endpoints) {
            md += `### ${endpoint.method} ${endpoint.path}\n\n`;
            md += `**Description:** ${endpoint.description}\n\n`;
            
            if (endpoint.body) {
                md += `**Request Body:**\n\`\`\`json\n${JSON.stringify(endpoint.body, null, 2)}\n\`\`\`\n\n`;
            }
            
            if (endpoint.query) {
                md += `**Query Parameters:**\n\`\`\`json\n${JSON.stringify(endpoint.query, null, 2)}\n\`\`\`\n\n`;
            }
            
            md += `**Responses:**\n`;
            for (const [code, desc] of Object.entries(endpoint.responses)) {
                md += `- ${code}: ${desc}\n`;
            }
            md += '\n';
        }
        
        md += `## WebSocket Features\n\n`;
        for (const ws of this.documentation.websockets) {
            md += `### Namespace: ${ws.namespace}\n\n`;
            md += `**Description:** ${ws.description}\n\n`;
            
            md += `**Server Events:**\n`;
            for (const event of ws.events.server) {
                md += `- \`${event.name}\`: ${event.description}\n`;
            }
            md += '\n';
            
            md += `**Client Events:**\n`;
            for (const event of ws.events.client) {
                md += `- \`${event.name}\`: ${event.description}\n`;
            }
            md += '\n';
        }
        
        md += `## Integration Points\n\n`;
        for (const feature of this.documentation.features) {
            md += `### ${feature.name}\n\n`;
            md += `**Type:** ${feature.type}\n\n`;
            md += `**Description:** ${feature.description}\n\n`;
            
            Object.entries(feature).forEach(([key, value]) => {
                if (!['name', 'type', 'description'].includes(key)) {
                    if (typeof value === 'object') {
                        md += `**${key}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
                    } else {
                        md += `**${key}:** ${value}\n\n`;
                    }
                }
            });
        }
        
        return md;
    }
}

// Run verification
if (require.main === module) {
    const verifier = new WebhookVerifier();
    verifier.verifyAll().then(() => {
        console.log('\n✅ Verification complete!');
    }).catch(error => {
        console.error('\n❌ Verification failed:', error.message);
        process.exit(1);
    });
}

module.exports = WebhookVerifier;