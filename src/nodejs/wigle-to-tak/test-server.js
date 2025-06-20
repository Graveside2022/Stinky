/**
 * Basic Test Server for WigleToTAK - Agent 5 Testing
 * Simplified version for testing purposes
 */

const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(express.json());

// Simple status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        service: 'wigle-to-tak',
        status: 'running',
        port: 3002,
        timestamp: new Date().toISOString(),
        broadcasting: false,
        tak_server_ip: '0.0.0.0',
        tak_server_port: 6969,
        test_mode: true
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'wigle-to-tak-test',
        uptime: process.uptime()
    });
});

// Start server on port 3002  
server.listen(3002, (error) => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    } else {
        console.log('Test wigle-to-tak server started on port 3002');
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