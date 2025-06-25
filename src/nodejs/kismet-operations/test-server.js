/**
 * Basic Test Server for Spectrum Analyzer - Agent 5 Testing
 * Simplified version for testing purposes
 */

const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(express.json());

// Simple status endpoint
app.get('/api/config', (req, res) => {
    res.json({
        service: 'spectrum-analyzer',
        status: 'running',
        port: 3001,
        timestamp: new Date().toISOString(),
        test_mode: true
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'spectrum-analyzer-test',
        uptime: process.uptime()
    });
});

// Start server on port 3001
server.listen(3001, (error) => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    } else {
        console.log('Test spectrum-analyzer server started on port 3001');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});