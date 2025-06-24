/**
 * WebSocket Handler - Real-time event handling for webhook service
 * 
 * Manages WebSocket connections, subscriptions, and real-time updates
 * for script status, device detection, and alerts
 */

const { EventEmitter } = require('events');

class WebSocketHandler extends EventEmitter {
    constructor(io, scriptManager, kismetClient, logger) {
        super();
        
        this.io = io;
        this.scriptManager = scriptManager;
        this.kismetClient = kismetClient;
        this.logger = logger;
        
        this.connections = new Map();
        this.subscriptions = new Map();
        this.streamStoppers = new Map();
        
        // Status update interval
        this.statusInterval = null;
        this.statusUpdateFrequency = 5000; // 5 seconds
        
        // Throttling for updates
        this.updateThrottle = new Map();
        this.throttleWindow = 100; // 100ms minimum between updates
        
        this.logger.info('WebSocketHandler initialized');
    }

    initialize(namespace) {
        this.namespace = namespace;
        
        // Handle connections
        this.namespace.on('connection', (socket) => {
            this.handleConnection(socket);
        });
        
        // Start status monitoring
        this.startStatusMonitoring();
        
        this.logger.info('WebSocket namespace initialized');
    }

    handleConnection(socket) {
        const clientId = socket.id;
        const clientInfo = {
            id: clientId,
            socket,
            connectedAt: Date.now(),
            subscriptions: new Set(),
            ip: socket.handshake.address
        };
        
        this.connections.set(clientId, clientInfo);
        
        this.logger.info('WebSocket client connected', {
            clientId,
            ip: clientInfo.ip,
            totalConnections: this.connections.size
        });
        
        // Send welcome message
        socket.emit('connected', {
            clientId,
            timestamp: new Date().toISOString(),
            availableChannels: ['status', 'devices', 'alerts']
        });
        
        // Setup event handlers
        this.setupSocketHandlers(socket, clientInfo);
        
        // Handle disconnect
        socket.on('disconnect', () => {
            this.handleDisconnect(clientId);
        });
    }

    setupSocketHandlers(socket, clientInfo) {
        // Subscribe to channels
        socket.on('subscribe', (data) => {
            this.handleSubscribe(clientInfo, data);
        });
        
        // Unsubscribe from channels
        socket.on('unsubscribe', (data) => {
            this.handleUnsubscribe(clientInfo, data);
        });
        
        // Request immediate status
        socket.on('requestStatus', (data) => {
            this.handleStatusRequest(clientInfo, data);
        });
        
        // Handle errors
        socket.on('error', (error) => {
            this.logger.error('WebSocket error', {
                clientId: clientInfo.id,
                error: error.message
            });
        });
    }

    async handleSubscribe(clientInfo, data) {
        const { channels = [] } = data || {};
        const validChannels = ['status', 'devices', 'alerts'];
        
        channels.forEach(channel => {
            if (validChannels.includes(channel)) {
                clientInfo.subscriptions.add(channel);
                
                // Add to global subscriptions
                if (!this.subscriptions.has(channel)) {
                    this.subscriptions.set(channel, new Set());
                }
                this.subscriptions.get(channel).add(clientInfo.id);
                
                this.logger.debug('Client subscribed to channel', {
                    clientId: clientInfo.id,
                    channel
                });
            }
        });
        
        // Start data streaming if needed
        if (clientInfo.subscriptions.has('devices') || clientInfo.subscriptions.has('alerts')) {
            this.startKismetStreaming();
        }
        
        // Send confirmation
        clientInfo.socket.emit('subscribed', {
            channels: Array.from(clientInfo.subscriptions),
            timestamp: new Date().toISOString()
        });
        
        // Send initial data for subscribed channels
        if (clientInfo.subscriptions.has('status')) {
            const status = await this.scriptManager.getStatus();
            this.sendToClient(clientInfo, 'statusUpdate', { status });
        }
    }

    handleUnsubscribe(clientInfo, data) {
        const { channels = [] } = data || {};
        
        channels.forEach(channel => {
            clientInfo.subscriptions.delete(channel);
            
            // Remove from global subscriptions
            const channelSubs = this.subscriptions.get(channel);
            if (channelSubs) {
                channelSubs.delete(clientInfo.id);
                if (channelSubs.size === 0) {
                    this.subscriptions.delete(channel);
                }
            }
        });
        
        // Stop streaming if no more subscribers
        if (!this.hasSubscribers('devices') && !this.hasSubscribers('alerts')) {
            this.stopKismetStreaming();
        }
        
        // Send confirmation
        clientInfo.socket.emit('unsubscribed', {
            channels,
            timestamp: new Date().toISOString()
        });
    }

    async handleStatusRequest(clientInfo, data) {
        const { script } = data || {};
        
        try {
            const status = await this.scriptManager.getStatus(script);
            
            clientInfo.socket.emit('statusUpdate', {
                script: script || 'all',
                status,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            clientInfo.socket.emit('error', {
                message: 'Failed to get status',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleDisconnect(clientId) {
        const clientInfo = this.connections.get(clientId);
        if (!clientInfo) return;
        
        // Remove from all subscriptions
        clientInfo.subscriptions.forEach(channel => {
            const channelSubs = this.subscriptions.get(channel);
            if (channelSubs) {
                channelSubs.delete(clientId);
                if (channelSubs.size === 0) {
                    this.subscriptions.delete(channel);
                }
            }
        });
        
        // Remove connection
        this.connections.delete(clientId);
        
        this.logger.info('WebSocket client disconnected', {
            clientId,
            totalConnections: this.connections.size
        });
        
        // Stop streaming if no more subscribers
        if (!this.hasSubscribers('devices') && !this.hasSubscribers('alerts')) {
            this.stopKismetStreaming();
        }
    }

    startStatusMonitoring() {
        if (this.statusInterval) return;
        
        this.statusInterval = setInterval(async () => {
            if (!this.hasSubscribers('status')) return;
            
            try {
                const status = await this.scriptManager.getStatus();
                this.broadcastToChannel('status', 'statusUpdate', { status });
            } catch (error) {
                this.logger.error('Status monitoring error', { error: error.message });
            }
            
        }, this.statusUpdateFrequency);
        
        this.logger.debug('Status monitoring started');
    }

    stopStatusMonitoring() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
            this.logger.debug('Status monitoring stopped');
        }
    }

    startKismetStreaming() {
        if (this.streamStoppers.has('kismet')) return;
        
        const stopFn = this.kismetClient.streamData((error, data) => {
            if (error) {
                this.logger.error('Kismet streaming error', { error: error.message });
                return;
            }
            
            // Handle new devices
            if (data.devices && data.devices.length > 0 && this.hasSubscribers('devices')) {
                data.devices.forEach(device => {
                    this.throttledBroadcast('devices', 'newDevice', device);
                });
            }
            
            // Handle alerts
            if (data.alerts && data.alerts.length > 0 && this.hasSubscribers('alerts')) {
                data.alerts.forEach(alert => {
                    this.throttledBroadcast('alerts', 'alert', alert);
                });
            }
        });
        
        this.streamStoppers.set('kismet', stopFn);
        this.logger.debug('Kismet streaming started');
    }

    stopKismetStreaming() {
        const stopFn = this.streamStoppers.get('kismet');
        if (stopFn) {
            stopFn();
            this.streamStoppers.delete('kismet');
            this.logger.debug('Kismet streaming stopped');
        }
    }

    broadcastStatus(script, action, details) {
        if (!this.hasSubscribers('status')) return;
        
        const event = {
            script,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.broadcastToChannel('status', 'scriptEvent', event);
    }

    broadcastToChannel(channel, eventName, data) {
        const subscribers = this.subscriptions.get(channel);
        if (!subscribers || subscribers.size === 0) return;
        
        let sent = 0;
        subscribers.forEach(clientId => {
            const clientInfo = this.connections.get(clientId);
            if (clientInfo) {
                this.sendToClient(clientInfo, eventName, data);
                sent++;
            }
        });
        
        this.logger.debug('Broadcast to channel', {
            channel,
            eventName,
            subscribers: sent
        });
    }

    throttledBroadcast(channel, eventName, data) {
        const key = `${channel}:${eventName}`;
        const lastUpdate = this.updateThrottle.get(key);
        const now = Date.now();
        
        if (lastUpdate && now - lastUpdate < this.throttleWindow) {
            // Skip this update due to throttling
            return;
        }
        
        this.updateThrottle.set(key, now);
        this.broadcastToChannel(channel, eventName, data);
    }

    sendToClient(clientInfo, eventName, data) {
        try {
            clientInfo.socket.emit(eventName, {
                ...data,
                timestamp: data.timestamp || new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('Failed to send to client', {
                clientId: clientInfo.id,
                eventName,
                error: error.message
            });
        }
    }

    hasSubscribers(channel) {
        const subs = this.subscriptions.get(channel);
        return subs && subs.size > 0;
    }

    getConnectionStats() {
        const stats = {
            totalConnections: this.connections.size,
            subscriptions: {}
        };
        
        this.subscriptions.forEach((subscribers, channel) => {
            stats.subscriptions[channel] = subscribers.size;
        });
        
        return stats;
    }

    shutdown() {
        this.logger.info('Shutting down WebSocket handler...');
        
        // Stop monitoring
        this.stopStatusMonitoring();
        
        // Stop all streams
        this.streamStoppers.forEach((stopFn, name) => {
            stopFn();
            this.logger.debug(`Stopped ${name} streaming`);
        });
        this.streamStoppers.clear();
        
        // Disconnect all clients
        this.connections.forEach(clientInfo => {
            clientInfo.socket.emit('shutdown', {
                message: 'Server is shutting down',
                timestamp: new Date().toISOString()
            });
            clientInfo.socket.disconnect(true);
        });
        
        this.connections.clear();
        this.subscriptions.clear();
        
        this.logger.info('WebSocket handler shutdown complete');
    }
}

module.exports = WebSocketHandler;