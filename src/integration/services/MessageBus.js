/**
 * Cross-Application Message Bus
 * Enables communication between Stinkster applications
 */

class MessageBus {
    constructor() {
        this.subscribers = new Map();
        this.messageQueue = [];
        this.channels = new Map();
        this.appId = this.generateAppId();
        this.isProcessing = false;
        
        // Setup communication channels
        this.setupChannels();
        
        // Start message processor
        this.startProcessor();
    }

    // Generate unique app ID
    generateAppId() {
        const app = window.location.pathname.split('/')[1] || 'unknown';
        const id = Math.random().toString(36).substr(2, 9);
        return `${app}-${id}`;
    }

    // Setup communication channels
    setupChannels() {
        // 1. Window message channel (for iframes)
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'stinkster-bus-message') {
                this.handleIncomingMessage(event.data.message, 'iframe');
            }
        });

        // 2. Broadcast channel (for tabs/windows)
        if ('BroadcastChannel' in window) {
            this.broadcastChannel = new BroadcastChannel('stinkster-message-bus');
            this.broadcastChannel.onmessage = (event) => {
                this.handleIncomingMessage(event.data, 'broadcast');
            };
            this.channels.set('broadcast', this.broadcastChannel);
        }

        // 3. Local storage channel (fallback for older browsers)
        window.addEventListener('storage', (event) => {
            if (event.key === 'stinkster-bus-message' && event.newValue) {
                try {
                    const message = JSON.parse(event.newValue);
                    this.handleIncomingMessage(message, 'storage');
                    
                    // Clean up
                    localStorage.removeItem('stinkster-bus-message');
                } catch (error) {
                    console.error('Failed to parse storage message:', error);
                }
            }
        });

        // 4. WebSocket channel (for real-time server communication)
        this.setupWebSocket();
    }

    // Setup WebSocket connection
    setupWebSocket() {
        const wsUrl = `ws://${window.location.host}/message-bus`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Message bus WebSocket connected');
                this.channels.set('websocket', this.ws);
                
                // Register this app
                this.send('system:register', {
                    appId: this.appId,
                    app: window.location.pathname.split('/')[1] || 'unknown'
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleIncomingMessage(message, 'websocket');
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('Message bus WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('Message bus WebSocket disconnected');
                this.channels.delete('websocket');
                
                // Attempt reconnection after 5 seconds
                setTimeout(() => this.setupWebSocket(), 5000);
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
        }
    }

    // Subscribe to messages
    subscribe(topic, callback, options = {}) {
        const subscription = {
            id: Math.random().toString(36).substr(2, 9),
            topic,
            callback,
            filter: options.filter,
            priority: options.priority || 0
        };

        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, []);
        }

        const topicSubs = this.subscribers.get(topic);
        topicSubs.push(subscription);
        
        // Sort by priority
        topicSubs.sort((a, b) => b.priority - a.priority);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(topic);
            if (subs) {
                const index = subs.findIndex(s => s.id === subscription.id);
                if (index !== -1) {
                    subs.splice(index, 1);
                }
            }
        };
    }

    // Publish message
    publish(topic, data, options = {}) {
        const message = {
            id: Math.random().toString(36).substr(2, 9),
            topic,
            data,
            source: this.appId,
            timestamp: Date.now(),
            ttl: options.ttl || 5000, // Time to live
            priority: options.priority || 0,
            broadcast: options.broadcast !== false // Default to true
        };

        // Add to queue
        this.messageQueue.push(message);

        // Broadcast if needed
        if (message.broadcast) {
            this.broadcastMessage(message);
        }

        // Process immediately if not already processing
        if (!this.isProcessing) {
            this.processMessages();
        }

        return message.id;
    }

    // Send direct message (alias for publish with broadcast: false)
    send(topic, data, options = {}) {
        return this.publish(topic, data, { ...options, broadcast: false });
    }

    // Broadcast message through all channels
    broadcastMessage(message) {
        // 1. Post to iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                iframe.contentWindow.postMessage({
                    type: 'stinkster-bus-message',
                    message
                }, window.location.origin);
            } catch (error) {
                console.error('Failed to post to iframe:', error);
            }
        });

        // 2. Broadcast channel
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(message);
        }

        // 3. Local storage (fallback)
        try {
            localStorage.setItem('stinkster-bus-message', JSON.stringify(message));
        } catch (error) {
            console.error('Failed to use localStorage:', error);
        }

        // 4. WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    // Handle incoming message
    handleIncomingMessage(message, channel) {
        // Ignore own messages from some channels
        if (channel === 'storage' && message.source === this.appId) {
            return;
        }

        // Check TTL
        if (message.ttl && Date.now() - message.timestamp > message.ttl) {
            return; // Message expired
        }

        // Add to queue for processing
        this.messageQueue.push({ ...message, channel });
        
        if (!this.isProcessing) {
            this.processMessages();
        }
    }

    // Process message queue
    async processMessages() {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            
            try {
                await this.deliverMessage(message);
            } catch (error) {
                console.error('Failed to deliver message:', error, message);
            }
        }

        this.isProcessing = false;
    }

    // Deliver message to subscribers
    async deliverMessage(message) {
        const subscribers = this.subscribers.get(message.topic) || [];
        
        // Also check for wildcard subscribers
        const wildcardSubs = this.subscribers.get('*') || [];
        const allSubs = [...subscribers, ...wildcardSubs];

        for (const sub of allSubs) {
            // Apply filter if provided
            if (sub.filter && !sub.filter(message)) {
                continue;
            }

            try {
                await sub.callback(message.data, {
                    topic: message.topic,
                    source: message.source,
                    timestamp: message.timestamp,
                    channel: message.channel
                });
            } catch (error) {
                console.error('Subscriber error:', error);
            }
        }
    }

    // Start message processor
    startProcessor() {
        // Process messages every 10ms
        setInterval(() => {
            if (this.messageQueue.length > 0) {
                this.processMessages();
            }
        }, 10);
    }

    // Request-response pattern
    async request(topic, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const requestId = this.publish(`${topic}:request`, {
                ...data,
                requestId: Math.random().toString(36).substr(2, 9)
            });

            const responseHandler = (responseData, meta) => {
                if (responseData.requestId === requestId) {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(responseData);
                }
            };

            const unsubscribe = this.subscribe(`${topic}:response`, responseHandler);

            const timer = setTimeout(() => {
                unsubscribe();
                reject(new Error(`Request timeout for topic: ${topic}`));
            }, timeout);
        });
    }

    // Respond to request
    respond(topic, handler) {
        this.subscribe(`${topic}:request`, async (data, meta) => {
            try {
                const response = await handler(data, meta);
                this.publish(`${topic}:response`, {
                    ...response,
                    requestId: data.requestId
                });
            } catch (error) {
                this.publish(`${topic}:response`, {
                    error: error.message,
                    requestId: data.requestId
                });
            }
        });
    }

    // Get bus statistics
    getStats() {
        return {
            appId: this.appId,
            subscribers: Array.from(this.subscribers.entries()).map(([topic, subs]) => ({
                topic,
                count: subs.length
            })),
            queueSize: this.messageQueue.length,
            channels: Array.from(this.channels.keys()),
            wsConnected: this.ws?.readyState === WebSocket.OPEN
        };
    }

    // Clear all subscriptions
    clear() {
        this.subscribers.clear();
        this.messageQueue = [];
    }

    // Destroy message bus
    destroy() {
        this.clear();
        
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
        
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Create singleton instance
const messageBus = new MessageBus();

// Common message topics
messageBus.TOPICS = {
    // System
    SYSTEM_REGISTER: 'system:register',
    SYSTEM_HEARTBEAT: 'system:heartbeat',
    
    // Authentication
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_UPDATE: 'auth:update',
    
    // Navigation
    NAV_CHANGE: 'nav:change',
    NAV_REQUEST: 'nav:request',
    
    // Data sharing
    DATA_UPDATE: 'data:update',
    DATA_REQUEST: 'data:request',
    DATA_SYNC: 'data:sync',
    
    // App-specific
    KISMET_DEVICE_UPDATE: 'kismet:device:update',
    HACKRF_SPECTRUM_UPDATE: 'hackrf:spectrum:update',
    WIGLE_SCAN_UPDATE: 'wigle:scan:update',
    
    // Notifications
    NOTIFY_INFO: 'notify:info',
    NOTIFY_SUCCESS: 'notify:success',
    NOTIFY_WARNING: 'notify:warning',
    NOTIFY_ERROR: 'notify:error'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = messageBus;
} else {
    window.messageBus = messageBus;
}