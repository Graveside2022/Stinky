/**
 * HackRF WebSocket Handler
 * Manages WebSocket connections for FFT streaming
 */

const HackRFFftStreamer = require('./hackrf-fft-streamer');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'HackRF-WebSocket' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

class HackRFWebSocketHandler {
    constructor(io, spectrumAnalyzer, options = {}) {
        this.io = io;
        this.spectrum = spectrumAnalyzer;
        this.logger = logger;
        
        // Configuration
        this.config = {
            namespace: options.namespace || '/hackrf',
            maxClientsPerRoom: options.maxClientsPerRoom || 50,
            rooms: options.rooms || ['spectrum', 'signals', 'waterfall'],
            ...options
        };
        
        // Create FFT streamer
        this.fftStreamer = new HackRFFftStreamer(this.spectrum, {
            streamingRate: 30,
            performanceMode: 'balanced',
            demoMode: !this.spectrum || !this.spectrum.isConnected
        });
        
        // Client tracking
        this.clients = new Map();
        this.rooms = new Map();
        
        // Initialize namespace
        this.namespace = this.io.of(this.config.namespace);
        
        // Setup handlers
        this.setupHandlers();
        
        this.logger.info('HackRF WebSocket handler initialized', {
            namespace: this.config.namespace,
            rooms: this.config.rooms
        });
    }
    
    /**
     * Setup WebSocket handlers
     */
    setupHandlers() {
        // Namespace connection handler
        this.namespace.on('connection', (socket) => {
            this.handleConnection(socket);
        });
        
        // FFT streamer events
        this.fftStreamer.on('signalsDetected', (data) => {
            this.broadcastToRoom('signals', 'signalsDetected', data);
        });
        
        // Spectrum analyzer events
        if (this.spectrum) {
            this.spectrum.on('connected', () => {
                // Switch from demo to real mode
                this.fftStreamer.updateConfig({ demoMode: false });
                this.broadcastToAll('modeChange', { mode: 'real' });
            });
            
            this.spectrum.on('disconnected', () => {
                // Switch to demo mode
                this.fftStreamer.updateConfig({ demoMode: true });
                this.broadcastToAll('modeChange', { mode: 'demo' });
            });
        }
    }
    
    /**
     * Handle new client connection
     */
    handleConnection(socket) {
        const clientId = socket.id;
        const clientInfo = {
            id: clientId,
            socket: socket,
            connectedAt: Date.now(),
            rooms: new Set(),
            ip: socket.handshake.address
        };
        
        this.clients.set(clientId, clientInfo);
        
        this.logger.info('Client connected', {
            clientId,
            ip: clientInfo.ip,
            totalClients: this.clients.size
        });
        
        // Send welcome message
        socket.emit('welcome', {
            clientId,
            timestamp: new Date().toISOString(),
            config: this.fftStreamer.config,
            availableRooms: this.config.rooms,
            status: this.getStatus()
        });
        
        // Setup socket handlers
        this.setupSocketHandlers(socket, clientInfo);
        
        // Handle disconnect
        socket.on('disconnect', () => {
            this.handleDisconnect(clientId);
        });
    }
    
    /**
     * Setup individual socket handlers
     */
    setupSocketHandlers(socket, clientInfo) {
        // Join room
        socket.on('join', (data) => {
            this.handleJoinRoom(clientInfo, data);
        });
        
        // Leave room
        socket.on('leave', (data) => {
            this.handleLeaveRoom(clientInfo, data);
        });
        
        // Subscribe to FFT streaming
        socket.on('subscribe', (data) => {
            this.handleSubscribe(clientInfo, data);
        });
        
        // Unsubscribe from FFT streaming
        socket.on('unsubscribe', (data) => {
            this.handleUnsubscribe(clientInfo, data);
        });
        
        // Configuration updates
        socket.on('updateConfig', (data) => {
            this.handleConfigUpdate(clientInfo, data);
        });
        
        // Request status
        socket.on('requestStatus', () => {
            this.handleStatusRequest(clientInfo);
        });
        
        // Performance mode changes
        socket.on('setPerformanceMode', (data) => {
            this.handlePerformanceModeChange(clientInfo, data);
        });
        
        // Handle errors
        socket.on('error', (error) => {
            this.logger.error('Socket error', {
                clientId: clientInfo.id,
                error: error.message
            });
        });
    }
    
    /**
     * Handle room join
     */
    handleJoinRoom(clientInfo, data) {
        const { room } = data || {};
        
        if (!room || !this.config.rooms.includes(room)) {
            clientInfo.socket.emit('error', {
                message: 'Invalid room',
                availableRooms: this.config.rooms
            });
            return;
        }
        
        // Check room capacity
        const roomClients = this.rooms.get(room) || new Set();
        if (roomClients.size >= this.config.maxClientsPerRoom) {
            clientInfo.socket.emit('error', {
                message: 'Room is full',
                room,
                capacity: this.config.maxClientsPerRoom
            });
            return;
        }
        
        // Join room
        clientInfo.socket.join(room);
        clientInfo.rooms.add(room);
        roomClients.add(clientInfo.id);
        this.rooms.set(room, roomClients);
        
        this.logger.debug('Client joined room', {
            clientId: clientInfo.id,
            room,
            roomSize: roomClients.size
        });
        
        // Send confirmation
        clientInfo.socket.emit('joinedRoom', {
            room,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle room leave
     */
    handleLeaveRoom(clientInfo, data) {
        const { room } = data || {};
        
        if (!room || !clientInfo.rooms.has(room)) {
            return;
        }
        
        // Leave room
        clientInfo.socket.leave(room);
        clientInfo.rooms.delete(room);
        
        const roomClients = this.rooms.get(room);
        if (roomClients) {
            roomClients.delete(clientInfo.id);
            if (roomClients.size === 0) {
                this.rooms.delete(room);
            }
        }
        
        this.logger.debug('Client left room', {
            clientId: clientInfo.id,
            room
        });
        
        // Send confirmation
        clientInfo.socket.emit('leftRoom', {
            room,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle FFT subscription
     */
    handleSubscribe(clientInfo, data) {
        const { channels = ['fft'] } = data || {};
        
        // Add client to FFT streamer
        if (channels.includes('fft')) {
            this.fftStreamer.addClient(clientInfo.id, clientInfo.socket);
            
            clientInfo.socket.emit('subscribed', {
                channels,
                config: this.fftStreamer.config,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Handle FFT unsubscription
     */
    handleUnsubscribe(clientInfo, data) {
        // Remove client from FFT streamer
        this.fftStreamer.removeClient(clientInfo.id);
        
        clientInfo.socket.emit('unsubscribed', {
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle configuration update
     */
    handleConfigUpdate(clientInfo, data) {
        // Validate config update
        const allowedUpdates = ['streamingRate', 'decimation', 'compression', 'demoMode'];
        const updates = {};
        
        Object.keys(data).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = data[key];
            }
        });
        
        if (Object.keys(updates).length > 0) {
            this.fftStreamer.updateConfig(updates);
            
            this.logger.info('Configuration updated by client', {
                clientId: clientInfo.id,
                updates
            });
            
            // Broadcast config change to all clients
            this.broadcastToAll('configUpdated', {
                updates,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Handle performance mode change
     */
    handlePerformanceModeChange(clientInfo, data) {
        const { mode } = data || {};
        const validModes = ['performance', 'balanced', 'quality'];
        
        if (!validModes.includes(mode)) {
            clientInfo.socket.emit('error', {
                message: 'Invalid performance mode',
                validModes
            });
            return;
        }
        
        this.fftStreamer.updateConfig({ performanceMode: mode });
        
        this.logger.info('Performance mode changed', {
            clientId: clientInfo.id,
            mode
        });
        
        // Notify all clients
        this.broadcastToAll('performanceModeChanged', {
            mode,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle status request
     */
    handleStatusRequest(clientInfo) {
        const status = this.getStatus();
        
        clientInfo.socket.emit('status', {
            ...status,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Handle client disconnect
     */
    handleDisconnect(clientId) {
        const clientInfo = this.clients.get(clientId);
        if (!clientInfo) return;
        
        // Remove from all rooms
        clientInfo.rooms.forEach(room => {
            const roomClients = this.rooms.get(room);
            if (roomClients) {
                roomClients.delete(clientId);
                if (roomClients.size === 0) {
                    this.rooms.delete(room);
                }
            }
        });
        
        // Remove from FFT streamer
        this.fftStreamer.removeClient(clientId);
        
        // Remove client
        this.clients.delete(clientId);
        
        this.logger.info('Client disconnected', {
            clientId,
            totalClients: this.clients.size
        });
    }
    
    /**
     * Broadcast to specific room
     */
    broadcastToRoom(room, event, data) {
        this.namespace.to(room).emit(event, {
            ...data,
            timestamp: data.timestamp || new Date().toISOString()
        });
    }
    
    /**
     * Broadcast to all connected clients
     */
    broadcastToAll(event, data) {
        this.namespace.emit(event, {
            ...data,
            timestamp: data.timestamp || new Date().toISOString()
        });
    }
    
    /**
     * Get current status
     */
    getStatus() {
        const roomStats = {};
        this.rooms.forEach((clients, room) => {
            roomStats[room] = clients.size;
        });
        
        return {
            connected: this.spectrum ? this.spectrum.isConnected : false,
            mode: this.fftStreamer.config.demoMode ? 'demo' : 'real',
            totalClients: this.clients.size,
            rooms: roomStats,
            streamerStats: this.fftStreamer.getStats(),
            spectrumStatus: this.spectrum ? this.spectrum.getStatus() : null
        };
    }
    
    /**
     * Shutdown handler
     */
    shutdown() {
        this.logger.info('Shutting down HackRF WebSocket handler...');
        
        // Notify all clients
        this.broadcastToAll('shutdown', {
            message: 'Server is shutting down'
        });
        
        // Disconnect all clients
        this.clients.forEach(clientInfo => {
            clientInfo.socket.disconnect(true);
        });
        
        // Cleanup
        this.fftStreamer.destroy();
        this.clients.clear();
        this.rooms.clear();
        
        this.logger.info('HackRF WebSocket handler shutdown complete');
    }
}

module.exports = HackRFWebSocketHandler;