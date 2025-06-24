/**
 * WebSocket Abstraction Layer (JavaScript version)
 * 
 * Provides a unified interface for both Socket.IO and native WebSocket connections
 * with automatic reconnection and event handling.
 * 
 * This is the compiled JavaScript version for backward compatibility.
 */

class WebSocketClient extends EventTarget {
  constructor(options) {
    super();
    
    this.options = {
      type: 'socket.io',
      reconnect: true,
      reconnectAttempts: Infinity,
      reconnectDelay: 1000,
      reconnectDelayMax: 5000,
      timeout: 20000,
      ...options
    };

    this._state = {
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
      connectionType: this.options.type || 'socket.io',
      url: this.options.url
    };

    this.connection = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      connectionTime: 0,
      reconnectCount: 0
    };
    this.connectionStartTime = null;
    this.pendingRequests = new Map();
    this.eventHandlers = new Map();
  }

  get state() {
    return { ...this._state };
  }

  get connected() {
    return this._state.connected;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(options) {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    if (this._state.connected || this._state.connecting) {
      return;
    }

    this._state.connecting = true;
    this._state.lastError = undefined;

    try {
      if (this.options.type === 'socket.io') {
        await this.connectSocketIO();
      } else {
        await this.connectWebSocket();
      }
    } catch (error) {
      this._state.connecting = false;
      this._state.lastError = error;
      this._emit('error', error);
      
      if (this.options.reconnect) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  /**
   * Connect using Socket.IO
   */
  async connectSocketIO() {
    return new Promise((resolve, reject) => {
      if (typeof io === 'undefined') {
        reject(new Error('Socket.IO client library not loaded'));
        return;
      }

      const socket = io(this.options.url, {
        reconnection: false,
        timeout: this.options.timeout,
        auth: this.options.auth,
        query: this.options.query,
        transports: ['websocket', 'polling'],
        ...this.options.headers && { extraHeaders: this.options.headers }
      });

      const connectTimeout = setTimeout(() => {
        socket.close();
        reject(new Error('Connection timeout'));
      }, this.options.timeout || 20000);

      socket.once('connect', () => {
        clearTimeout(connectTimeout);
        this.connection = socket;
        this.setupSocketIOHandlers(socket);
        this._state.connected = true;
        this._state.connecting = false;
        this._state.reconnecting = false;
        this._state.reconnectAttempts = 0;
        this.connectionStartTime = Date.now();
        this._emit('connect');
        this.startHeartbeat();
        resolve();
      });

      socket.once('connect_error', (error) => {
        clearTimeout(connectTimeout);
        socket.close();
        reject(error);
      });

      this.connection = socket;
    });
  }

  /**
   * Connect using native WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.options.url, this.options.protocols);
        
        const connectTimeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, this.options.timeout || 20000);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.connection = ws;
          this.setupWebSocketHandlers(ws);
          this._state.connected = true;
          this._state.connecting = false;
          this._state.reconnecting = false;
          this._state.reconnectAttempts = 0;
          this.connectionStartTime = Date.now();
          this._emit('connect');
          this.startHeartbeat();
          resolve();
        };

        ws.onerror = (event) => {
          clearTimeout(connectTimeout);
          const error = new Error('WebSocket connection error');
          this._state.lastError = error;
          if (!this._state.connected) {
            reject(error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          if (!this._state.connected && !event.wasClean) {
            reject(new Error(`WebSocket closed: ${event.reason || 'Unknown reason'}`));
          }
        };

        this.connection = ws;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketIOHandlers(socket) {
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(reason);
    });

    socket.on('error', (error) => {
      this._state.lastError = error;
      this._emit('error', error);
    });

    // Message handling - proxy all events
    const messageTypes = [
      'fftData', 'signalsDetected', 'status', 'kismetData', 'kismetDataUpdate',
      'signal', 'batch', 'subscribed', 'heartbeat', 'configUpdated',
      'openwebrxConnected', 'openwebrxDisconnected', 'openwebrxError',
      'bufferCleared', 'latestFFT', 'signals', 'queryResult'
    ];

    messageTypes.forEach(type => {
      socket.on(type, (data) => {
        this.metrics.messagesReceived++;
        this.metrics.bytesReceived += JSON.stringify(data).length;
        
        // Emit as specific event
        this._emit(type, data);
        
        // Also emit as generic message
        const message = {
          type: type,
          timestamp: Date.now(),
          ...data
        };
        this._emit('message', message);

        // Handle pending requests
        const requestKey = `response:${type}`;
        const pending = this.pendingRequests.get(requestKey);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(data);
          this.pendingRequests.delete(requestKey);
        }
      });
    });
  }

  /**
   * Setup native WebSocket event handlers
   */
  setupWebSocketHandlers(ws) {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.metrics.messagesReceived++;
        this.metrics.bytesReceived += event.data.length;
        
        if (data.type) {
          // Emit as specific event
          this._emit(data.type, data);
          
          // Also emit as generic message
          this._emit('message', data);

          // Handle pending requests
          const requestKey = `response:${data.type}`;
          const pending = this.pendingRequests.get(requestKey);
          if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(data);
            this.pendingRequests.delete(requestKey);
          }
        }
      } catch (error) {
        this._emit('error', new Error(`Failed to parse message: ${error}`));
      }
    };

    ws.onerror = (event) => {
      const error = new Error('WebSocket error');
      this._state.lastError = error;
      this._emit('error', error);
    };

    ws.onclose = (event) => {
      this.handleDisconnect(event.reason || 'Connection closed');
    };
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(reason) {
    this._state.connected = false;
    this.stopHeartbeat();
    
    if (this.connectionStartTime) {
      this.metrics.connectionTime += Date.now() - this.connectionStartTime;
      this.connectionStartTime = null;
    }

    this._emit('disconnect', reason);

    // Clear pending requests
    this.pendingRequests.forEach((pending, key) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    });
    this.pendingRequests.clear();

    if (this.options.reconnect && !this._state.reconnecting) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this._state.reconnecting || this._state.connected) {
      return;
    }

    if (this.options.reconnectAttempts !== undefined && 
        this._state.reconnectAttempts >= this.options.reconnectAttempts) {
      this._emit('reconnect_failed');
      return;
    }

    this._state.reconnecting = true;
    this._state.reconnectAttempts++;
    this.metrics.reconnectCount++;

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(1.5, this._state.reconnectAttempts - 1),
      this.options.reconnectDelayMax
    );

    this._emit('reconnect_attempt', this._state.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this._emit('reconnect', this._state.reconnectAttempts);
      } catch (error) {
        this._emit('reconnect_error', error);
        if (this.options.reconnect) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    this._state.reconnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.connection) {
      if (this.isSocketIO()) {
        this.connection.close();
      } else if (this.isWebSocket()) {
        this.connection.close(1000, 'Client disconnect');
      }
      this.connection = null;
    }

    this._state.connected = false;
    this._state.connecting = false;
  }

  /**
   * Emit an event (Socket.IO style)
   */
  emit(event, data) {
    if (!this._state.connected || !this.connection) {
      throw new Error('Not connected');
    }

    const message = {
      type: event,
      data,
      timestamp: Date.now()
    };

    this.metrics.messagesSent++;

    if (this.isSocketIO()) {
      this.connection.emit(event, data);
      this.metrics.bytesSent += JSON.stringify(data).length;
    } else if (this.isWebSocket()) {
      const payload = JSON.stringify(message);
      this.connection.send(payload);
      this.metrics.bytesSent += payload.length;
    }
  }

  /**
   * Send raw data (native WebSocket style)
   */
  send(data) {
    if (!this._state.connected || !this.connection) {
      throw new Error('Not connected');
    }

    this.metrics.messagesSent++;

    if (this.isSocketIO()) {
      this.connection.emit('message', data);
      this.metrics.bytesSent += typeof data === 'string' ? data.length : 0;
    } else if (this.isWebSocket()) {
      this.connection.send(data);
      this.metrics.bytesSent += typeof data === 'string' ? data.length : 0;
    }
  }

  /**
   * Request with timeout (Socket.IO style request/response)
   */
  async request(event, data, timeout) {
    if (!this._state.connected) {
      throw new Error('Not connected');
    }

    const timeoutMs = timeout || this.options.timeout || 10000;
    const requestKey = `response:${event}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestKey);
        reject(new Error(`Request timeout: ${event}`));
      }, timeoutMs);

      this.pendingRequests.set(requestKey, { resolve, reject, timeout: timer });
      
      try {
        this.emit(event, data);
      } catch (error) {
        this.pendingRequests.delete(requestKey);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
    
    // Also add to EventTarget for native events
    this.addEventListener(event, handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
    
    this.removeEventListener(event, handler);
  }

  /**
   * Add one-time event listener
   */
  once(event, handler) {
    const onceHandler = (...args) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Internal emit method
   */
  _emit(event, data) {
    // Emit using EventTarget
    const customEvent = new CustomEvent(event, { detail: data });
    this.dispatchEvent(customEvent);
    
    // Also emit to registered handlers for compatibility
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Update reconnection options
   */
  setReconnectOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      connectionTime: this.connectionStartTime 
        ? this.metrics.connectionTime + (Date.now() - this.connectionStartTime)
        : this.metrics.connectionTime
    };
  }

  /**
   * Check if connection is Socket.IO
   */
  isSocketIO() {
    return this.connection && 'emit' in this.connection && 'io' in this.connection;
  }

  /**
   * Check if connection is WebSocket
   */
  isWebSocket() {
    return this.connection && 'readyState' in this.connection && 'send' in this.connection;
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    // Only for native WebSocket connections
    if (this.options.type === 'websocket') {
      this.heartbeatTimer = setInterval(() => {
        if (this.connection && this.isWebSocket()) {
          if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }
      }, 30000); // 30 seconds
    }
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Factory function to create WebSocket clients
 */
function createWebSocketClient(options) {
  return new WebSocketClient(options);
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebSocketClient, createWebSocketClient };
} else if (typeof window !== 'undefined') {
  window.WebSocketClient = WebSocketClient;
  window.createWebSocketClient = createWebSocketClient;
}