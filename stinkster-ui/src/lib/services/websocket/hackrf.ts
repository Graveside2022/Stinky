// HackRF WebSocket Service
import { writable, derived } from 'svelte/store';
import { getWsUrl, config } from '../../config';
import type { SpectrumData, SignalInfo } from '../../types.js';

export interface HackRFWebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastUpdate: number;
  spectrumData: SpectrumData | null;
  signals: SignalInfo[];
}

class HackRFWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  // Svelte store for state
  private state = writable<HackRFWebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastUpdate: 0,
    spectrumData: null,
    signals: []
  });

  // Derived stores for convenience
  public connected = derived(this.state, $state => $state.connected);
  public spectrumData = derived(this.state, $state => $state.spectrumData);
  public signals = derived(this.state, $state => $state.signals);

  constructor() {
    // Auto-connect when created
    this.connect();
  }

  private updateState(updates: Partial<HackRFWebSocketState>) {
    this.state.update(state => ({ ...state, ...updates }));
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('HackRF WebSocket already connected');
      return;
    }

    this.updateState({ connecting: true, error: null });

    try {
      const wsUrl = getWsUrl('hackrf');
      console.log('Connecting to HackRF WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('HackRF WebSocket connected');
        this.reconnectAttempts = 0;
        this.updateState({ connected: true, connecting: false });
        this.setupPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing HackRF WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('HackRF WebSocket error:', error);
        this.updateState({ error: 'WebSocket error occurred' });
      };

      this.ws.onclose = () => {
        console.log('HackRF WebSocket disconnected');
        this.updateState({ connected: false, connecting: false });
        this.cleanup();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Error creating HackRF WebSocket:', error);
      this.updateState({ 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Failed to create WebSocket' 
      });
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: any) {
    const now = Date.now();
    
    switch (data.type) {
      case 'spectrum':
        this.updateState({ 
          spectrumData: data.data,
          lastUpdate: now 
        });
        break;
        
      case 'signals':
        this.updateState({ 
          signals: data.signals || [],
          lastUpdate: now 
        });
        break;
        
      case 'status':
        // Handle status updates
        break;
        
      case 'pong':
        // Pong received, connection is alive
        break;
        
      default:
        console.warn('Unknown HackRF WebSocket message type:', data.type);
    }
  }

  private setupPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 25000); // Ping every 25 seconds
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > config.global.maxReconnectAttempts) {
      this.updateState({ 
        error: 'Max reconnection attempts reached. Please refresh the page.' 
      });
      return;
    }
    
    const delay = Math.min(
      config.global.reconnectDelay * this.reconnectAttempts,
      30000 // Max 30 seconds
    );
    
    console.log(`Scheduling HackRF reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message, HackRF WebSocket not connected');
    }
  }

  // Subscribe to spectrum updates
  subscribeToSpectrum() {
    this.send({ type: 'subscribe', channel: 'spectrum' });
  }

  // Unsubscribe from spectrum updates
  unsubscribeFromSpectrum() {
    this.send({ type: 'unsubscribe', channel: 'spectrum' });
  }

  // Subscribe to signal detection updates
  subscribeToSignals() {
    this.send({ type: 'subscribe', channel: 'signals' });
  }

  // Unsubscribe from signal detection updates
  unsubscribeFromSignals() {
    this.send({ type: 'unsubscribe', channel: 'signals' });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.cleanup();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.updateState({ 
      connected: false, 
      connecting: false,
      spectrumData: null,
      signals: []
    });
  }

  // Get the store
  subscribe(run: (value: HackRFWebSocketState) => void) {
    return this.state.subscribe(run);
  }
}

// Export singleton instance
export const hackrfWebSocket = new HackRFWebSocket();