#!/usr/bin/env node

const axios = require('axios');
const Table = require('cli-table3');
const chalk = require('chalk');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const PYTHON_PORT = 8000;
const NODEJS_PORT = 3002;
const NGINX_PORT = 8080;
const REFRESH_INTERVAL = 2000; // 2 seconds
const LOG_FILE = '/home/pi/tmp/tak-migration-monitor.log';

// State tracking
const state = {
    pythonStatus: 'Unknown',
    nodeStatus: 'Unknown',
    nginxStatus: 'Unknown',
    pythonResponseTimes: [],
    nodeResponseTimes: [],
    pythonErrors: 0,
    nodeErrors: 0,
    totalRequests: 0,
    startTime: Date.now(),
    lastUpdate: null,
    trafficDistribution: { python: 0, node: 0 },
    activeConnections: { python: 0, node: 0 },
    takMessages: { sent: 0, errors: 0 },
    alerts: []
};

// Create blessed screen
const screen = blessed.screen({
    smartCSR: true,
    title: 'TAK Migration Monitor'
});

// Create layout
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// Service status box
const statusBox = grid.set(0, 0, 2, 4, blessed.box, {
    label: ' Service Status ',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } }
});

// Response time chart
const responseChart = grid.set(0, 4, 4, 8, contrib.line, {
    style: { line: 'yellow', text: 'green', baseline: 'black' },
    label: ' Response Times (ms) ',
    showLegend: true,
    wholeNumbersOnly: false,
    maxY: 100
});

// Traffic distribution gauge
const trafficGauge = grid.set(2, 0, 2, 4, contrib.gauge, {
    label: ' Python Traffic % ',
    stroke: 'green',
    fill: 'white',
    percent: 0
});

// Error rate display
const errorBox = grid.set(4, 0, 2, 4, blessed.box, {
    label: ' Error Rates ',
    border: { type: 'line' },
    style: { border: { fg: 'yellow' } }
});

// TAK message stats
const takStatsBox = grid.set(4, 4, 2, 4, blessed.box, {
    label: ' TAK Messages ',
    border: { type: 'line' },
    style: { border: { fg: 'green' } }
});

// Alert log
const alertLog = grid.set(6, 0, 4, 8, blessed.log, {
    label: ' Alerts ',
    border: { type: 'line' },
    style: { border: { fg: 'red' } },
    scrollable: true,
    alwaysScroll: true,
    mouse: true
});

// Metrics table
const metricsTable = grid.set(4, 8, 6, 4, blessed.table, {
    label: ' Metrics ',
    border: { type: 'line' },
    style: { 
        border: { fg: 'cyan' },
        header: { fg: 'bright-cyan' }
    },
    align: 'left',
    pad: 1,
    data: [
        ['Metric', 'Value'],
        ['Uptime', '0s'],
        ['Total Requests', '0'],
        ['Avg Python RT', '0ms'],
        ['Avg Node RT', '0ms'],
        ['Python Errors', '0'],
        ['Node Errors', '0']
    ]
});

// Control box
const controlBox = grid.set(10, 0, 2, 12, blessed.box, {
    label: ' Controls ',
    border: { type: 'line' },
    style: { border: { fg: 'white' } },
    content: ' [q] Quit | [r] Reset Stats | [s] Save Report | [p] Pause | [t] Test Endpoints '
});

// Utility functions
async function checkService(name, url) {
    try {
        const start = Date.now();
        const response = await axios.get(url, { timeout: 1000 });
        const responseTime = Date.now() - start;
        return { 
            status: 'UP', 
            responseTime, 
            statusCode: response.status 
        };
    } catch (error) {
        return { 
            status: 'DOWN', 
            error: error.message,
            statusCode: error.response?.status || 0
        };
    }
}

async function testEndpoints() {
    const endpoints = [
        '/get_antenna_settings',
        '/list_wigle_files?directory=/home/pi/kismet_ops'
    ];
    
    for (const endpoint of endpoints) {
        try {
            // Test Python
            const pythonResult = await checkService('Python', `http://localhost:${PYTHON_PORT}${endpoint}`);
            if (pythonResult.status === 'UP') {
                state.pythonResponseTimes.push(pythonResult.responseTime);
                if (state.pythonResponseTimes.length > 60) state.pythonResponseTimes.shift();
            } else {
                state.pythonErrors++;
            }
            
            // Test Node.js
            const nodeResult = await checkService('Node.js', `http://localhost:${NODEJS_PORT}${endpoint}`);
            if (nodeResult.status === 'UP') {
                state.nodeResponseTimes.push(nodeResult.responseTime);
                if (state.nodeResponseTimes.length > 60) state.nodeResponseTimes.shift();
            } else {
                state.nodeErrors++;
            }
            
            state.totalRequests += 2;
            
        } catch (error) {
            addAlert(`Error testing ${endpoint}: ${error.message}`, 'error');
        }
    }
}

function addAlert(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const alert = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    state.alerts.push(alert);
    alertLog.log(alert);
    
    // Also write to file
    fs.appendFileSync(LOG_FILE, alert + '\n');
}

function updateDisplay() {
    // Update service status
    const statusContent = [
        `Python:  ${state.pythonStatus === 'UP' ? chalk.green('●') : chalk.red('●')} ${state.pythonStatus}`,
        `Node.js: ${state.nodeStatus === 'UP' ? chalk.green('●') : chalk.red('●')} ${state.nodeStatus}`,
        `Nginx:   ${state.nginxStatus === 'UP' ? chalk.green('●') : chalk.red('●')} ${state.nginxStatus}`
    ].join('\n');
    statusBox.setContent(statusContent);
    
    // Update response time chart
    const pythonData = state.pythonResponseTimes.map((v, i) => [i, v]);
    const nodeData = state.nodeResponseTimes.map((v, i) => [i, v]);
    
    responseChart.setData([
        { 
            title: 'Python', 
            x: pythonData.map(d => d[0]), 
            y: pythonData.map(d => d[1]),
            style: { line: 'green' }
        },
        { 
            title: 'Node.js', 
            x: nodeData.map(d => d[0]), 
            y: nodeData.map(d => d[1]),
            style: { line: 'blue' }
        }
    ]);
    
    // Update traffic gauge
    const pythonTrafficPercent = state.trafficDistribution.python;
    trafficGauge.setPercent(pythonTrafficPercent);
    
    // Update error rates
    const errorRate = state.totalRequests > 0 ? 
        ((state.pythonErrors + state.nodeErrors) / state.totalRequests * 100).toFixed(2) : 0;
    errorBox.setContent([
        `Total Error Rate: ${errorRate}%`,
        `Python Errors: ${state.pythonErrors}`,
        `Node.js Errors: ${state.nodeErrors}`
    ].join('\n'));
    
    // Update TAK stats
    takStatsBox.setContent([
        `Messages Sent: ${state.takMessages.sent}`,
        `Send Errors: ${state.takMessages.errors}`,
        `Success Rate: ${state.takMessages.sent > 0 ? 
            ((state.takMessages.sent - state.takMessages.errors) / state.takMessages.sent * 100).toFixed(2) : 100}%`
    ].join('\n'));
    
    // Update metrics table
    const uptime = Math.floor((Date.now() - state.startTime) / 1000);
    const avgPythonRT = state.pythonResponseTimes.length > 0 ?
        (state.pythonResponseTimes.reduce((a, b) => a + b, 0) / state.pythonResponseTimes.length).toFixed(2) : 0;
    const avgNodeRT = state.nodeResponseTimes.length > 0 ?
        (state.nodeResponseTimes.reduce((a, b) => a + b, 0) / state.nodeResponseTimes.length).toFixed(2) : 0;
    
    metricsTable.setData([
        ['Metric', 'Value'],
        ['Uptime', `${uptime}s`],
        ['Total Requests', state.totalRequests.toString()],
        ['Avg Python RT', `${avgPythonRT}ms`],
        ['Avg Node RT', `${avgNodeRT}ms`],
        ['Python Errors', state.pythonErrors.toString()],
        ['Node Errors', state.nodeErrors.toString()]
    ]);
    
    screen.render();
}

async function monitorServices() {
    // Check Python service
    const pythonResult = await checkService('Python', `http://localhost:${PYTHON_PORT}/`);
    state.pythonStatus = pythonResult.status;
    
    // Check Node.js service  
    const nodeResult = await checkService('Node.js', `http://localhost:${NODEJS_PORT}/health`);
    state.nodeStatus = nodeResult.status;
    
    // Check Nginx (if configured)
    const nginxResult = await checkService('Nginx', `http://localhost:${NGINX_PORT}/health/python`);
    state.nginxStatus = nginxResult.status;
    
    // Test endpoints for response times
    await testEndpoints();
    
    // Estimate traffic distribution (simplified)
    if (state.pythonStatus === 'UP' && state.nodeStatus === 'UP') {
        // In real scenario, would parse nginx logs or use actual metrics
        state.trafficDistribution.python = 50;
        state.trafficDistribution.node = 50;
    } else if (state.pythonStatus === 'UP') {
        state.trafficDistribution.python = 100;
        state.trafficDistribution.node = 0;
    } else if (state.nodeStatus === 'UP') {
        state.trafficDistribution.python = 0;
        state.trafficDistribution.node = 100;
    }
    
    // Check for anomalies
    if (state.pythonStatus === 'DOWN' && state.nodeStatus === 'DOWN') {
        addAlert('Both services are DOWN!', 'critical');
    }
    
    if (avgPythonRT > 100) {
        addAlert(`Python response time high: ${avgPythonRT}ms`, 'warning');
    }
    
    if (avgNodeRT > 100) {
        addAlert(`Node.js response time high: ${avgNodeRT}ms`, 'warning');
    }
    
    updateDisplay();
}

function saveReport() {
    const reportPath = `/home/pi/tmp/tak-migration-report-${Date.now()}.json`;
    const report = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - state.startTime,
        services: {
            python: { status: state.pythonStatus, errors: state.pythonErrors },
            nodejs: { status: state.nodeStatus, errors: state.nodeErrors }
        },
        performance: {
            avgPythonResponseTime: state.pythonResponseTimes.length > 0 ?
                state.pythonResponseTimes.reduce((a, b) => a + b, 0) / state.pythonResponseTimes.length : 0,
            avgNodeResponseTime: state.nodeResponseTimes.length > 0 ?
                state.nodeResponseTimes.reduce((a, b) => a + b, 0) / state.nodeResponseTimes.length : 0
        },
        totalRequests: state.totalRequests,
        alerts: state.alerts
    };
    
    fs.writeJsonSync(reportPath, report, { spaces: 2 });
    addAlert(`Report saved to ${reportPath}`, 'info');
}

// Keyboard controls
let paused = false;
screen.key(['q', 'C-c'], () => {
    saveReport();
    process.exit(0);
});

screen.key(['r'], () => {
    // Reset statistics
    state.pythonResponseTimes = [];
    state.nodeResponseTimes = [];
    state.pythonErrors = 0;
    state.nodeErrors = 0;
    state.totalRequests = 0;
    state.alerts = [];
    addAlert('Statistics reset', 'info');
});

screen.key(['s'], () => {
    saveReport();
});

screen.key(['p'], () => {
    paused = !paused;
    addAlert(paused ? 'Monitoring paused' : 'Monitoring resumed', 'info');
});

screen.key(['t'], async () => {
    addAlert('Running endpoint tests...', 'info');
    await testEndpoints();
});

// Main monitoring loop
async function main() {
    addAlert('TAK Migration Monitor started', 'info');
    
    // Initial check
    await monitorServices();
    
    // Set up periodic monitoring
    setInterval(async () => {
        if (!paused) {
            await monitorServices();
        }
    }, REFRESH_INTERVAL);
}

// Start monitoring
main().catch(error => {
    console.error('Monitor failed:', error);
    process.exit(1);
});