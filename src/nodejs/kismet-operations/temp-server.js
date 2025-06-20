/**
 * Basic Test Server for Spectrum Analyzer - Agent 5 Testing
 * Simplified version for testing purposes
 */

const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(express.json());

// Static file serving for CSS, JS, and other assets
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// Serve HTML files with the right content type
app.engine('html', function (filePath, options, callback) {
    const fs = require('fs');
    fs.readFile(filePath, (err, content) => {
        if (err) return callback(err);
        const rendered = content.toString();
        return callback(null, rendered);
    });
});

// Root route - serves the spectrum analyzer frontend
app.get('/', (req, res) => {
    res.render('spectrum.html');
});

// API status endpoint with mock data
app.get('/api/status', (req, res) => {
    res.json({
        connected: false,
        buffer_size: 0,
        config: {
            center_freq: 145000000,
            samp_rate: 2400000
        },
        service: 'spectrum-analyzer',
        status: 'running',
        port: 8092,
        timestamp: new Date().toISOString(),
        test_mode: true
    });
});

// Mock signals endpoint for testing
app.get('/api/signals', (req, res) => {
    const profile = req.query.profile || 'vhf';
    
    // Mock signal data based on profile
    let mockSignals = [];
    
    switch (profile) {
        case 'vhf':
            mockSignals = [
                { frequency: '145.200', power: '-45', strength: '-45', bin: 128, confidence: 0.85, type: 'demo' },
                { frequency: '145.500', power: '-52', strength: '-52', bin: 256, confidence: 0.72, type: 'demo' },
                { frequency: '146.940', power: '-38', strength: '-38', bin: 384, confidence: 0.93, type: 'demo' }
            ];
            break;
        case 'uhf':
            mockSignals = [
                { frequency: '435.100', power: '-41', strength: '-41', bin: 192, confidence: 0.88, type: 'demo' },
                { frequency: '446.000', power: '-55', strength: '-55', bin: 320, confidence: 0.64, type: 'demo' }
            ];
            break;
        case 'ism':
            mockSignals = [
                { frequency: '2412.0', power: '-35', strength: '-35', bin: 64, confidence: 0.91, type: 'demo' },
                { frequency: '2437.0', power: '-42', strength: '-42', bin: 128, confidence: 0.83, type: 'demo' },
                { frequency: '2462.0', power: '-48', strength: '-48', bin: 192, confidence: 0.76, type: 'demo' }
            ];
            break;
        default:
            mockSignals = [];
    }
    
    res.json({
        signals: mockSignals,
        real_data: false,
        profile: profile,
        timestamp: new Date().toISOString()
    });
});

// Mock connect endpoint
app.post('/api/connect', (req, res) => {
    res.json({
        success: false,
        message: 'Test mode - OpenWebRX connection simulated',
        timestamp: new Date().toISOString()
    });
});

// Simple config endpoint
app.get('/api/config', (req, res) => {
    res.json({
        service: 'spectrum-analyzer',
        status: 'running',
        port: 8092,
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

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method,
        available_routes: [
            'GET /',
            'GET /api/status',
            'GET /api/signals',
            'POST /api/connect',
            'GET /api/config',
            'GET /health'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Start server on port 8092
server.listen(8092, (error) => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    } else {
        console.log('✅ Spectrum Analyzer Test Server Started');
        console.log('📍 URL: http://10.42.0.1:8092');
        console.log('📍 Local: http://localhost:8092');
        console.log('🛡️ Frontend: Spectrum Analyzer Interface');
        console.log('📊 Mode: Test/Demo (Mock Data)');
        console.log('🔧 API Endpoints:');
        console.log('   - GET / (Frontend)');
        console.log('   - GET /api/status');
        console.log('   - GET /api/signals');
        console.log('   - POST /api/connect');
        console.log('   - GET /health');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped gracefully');
        process.exit(0);
    });
});