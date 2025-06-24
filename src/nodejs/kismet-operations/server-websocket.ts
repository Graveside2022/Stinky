// WebSocket handlers and signal streaming functionality
import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import winston from 'winston';
import type {
  SignalDetection,
  FFTData,
  SignalStreamEvent,
  SignalFilters
} from './types';

// Signal detection data storage
const activeSignals = new Map<string, SignalDetection>();
const signalHistory: SignalDetection[] = [];
const MAX_SIGNAL_HISTORY = 10000;

export function setupWebSocketHandlers(io: SocketIOServer, spectrum: any, logger: winston.Logger) {
  // Handle client connections
  io.on('connection', (socket: Socket) => {
    logger.info('Client connected to spectrum analyzer', { 
      clientId: socket.id,
      clientsCount: io.engine.clientsCount 
    });
    
    // Send current status to new client
    socket.emit('status', spectrum.getStatus());
    
    // Set up event forwarding to this client
    const fftDataHandler = (data: FFTData) => {
      socket.emit('fftData', data);
    };
    
    const signalsDetectedHandler = (data: any) => {
      socket.emit('signalsDetected', data);
    };
    
    const connectedHandler = (data: any) => {
      socket.emit('openwebrxConnected', data);
    };
    
    const disconnectedHandler = (data: any) => {
      socket.emit('openwebrxDisconnected', data);
    };
    
    const errorHandler = (error: Error) => {
      socket.emit('openwebrxError', { error: error.message });
    };
    
    const configUpdatedHandler = (data: any) => {
      socket.emit('configUpdated', data);
    };
    
    const bufferClearedHandler = (data: any) => {
      socket.emit('bufferCleared', data);
    };
    
    // Register event listeners
    spectrum.on('fftData', fftDataHandler);
    spectrum.on('signalsDetected', signalsDetectedHandler);
    spectrum.on('connected', connectedHandler);
    spectrum.on('disconnected', disconnectedHandler);
    spectrum.on('error', errorHandler);
    spectrum.on('configUpdated', configUpdatedHandler);
    spectrum.on('bufferCleared', bufferClearedHandler);
    
    // Handle client-initiated events
    socket.on('requestStatus', () => {
      socket.emit('status', spectrum.getStatus());
    });
    
    socket.on('requestLatestFFT', () => {
      const latestFFT = spectrum.getLatestFFT();
      socket.emit('latestFFT', latestFFT);
    });
    
    socket.on('requestSignals', (data: any) => {
      const threshold = data && data.threshold ? parseFloat(data.threshold) : null;
      const signals = spectrum.detectSignals(threshold);
      socket.emit('signals', {
        signals,
        threshold: threshold || spectrum.config.signal_threshold,
        timestamp: Date.now()
      });
    });
    
    // Handle Kismet data requests via WebSocket
    socket.on('requestKismetData', async () => {
      try {
        const { checkKismetConnection, fetchKismetData, transformKismetData, generateDemoKismetData } = await import('./server-continuation');
        
        const kismetConfig = {
          baseUrl: process.env.KISMET_URL || 'http://localhost:2501',
          apiKey: process.env.KISMET_API_KEY || '',
          timeout: parseInt(process.env.KISMET_TIMEOUT || '5000')
        };

        const hasKismetConnection = await checkKismetConnection(kismetConfig);
        
        if (hasKismetConnection) {
          const kismetData = await fetchKismetData(kismetConfig);
          const transformedData = transformKismetData(kismetData);
          
          socket.emit('kismetData', {
            success: true,
            source: 'kismet',
            timestamp: Date.now(),
            data: transformedData,
            stats: {
              total_devices: transformedData.devices?.length || 0,
              total_networks: transformedData.networks?.length || 0,
              kismet_connected: true
            }
          });
        } else {
          const demoData = generateDemoKismetData();
          
          socket.emit('kismetData', {
            success: true,
            source: 'demo',
            timestamp: Date.now(),
            data: demoData,
            stats: {
              total_devices: demoData.devices?.length || 0,
              total_networks: demoData.networks?.length || 0,
              kismet_connected: false
            },
            warning: 'Kismet service not available, returning demo data'
          });
        }
      } catch (error) {
        logger.error('Error handling Kismet data request via WebSocket', { error: (error as Error).message });
        const { generateDemoKismetData } = await import('./server-continuation');
        const demoData = generateDemoKismetData();
        
        socket.emit('kismetData', {
          success: false,
          source: 'demo',
          timestamp: Date.now(),
          data: demoData,
          error: (error as Error).message,
          warning: 'Error connecting to Kismet, returning demo data'
        });
      }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      logger.info('Client disconnected from spectrum analyzer', { 
        clientId: socket.id,
        clientsCount: io.engine.clientsCount - 1 
      });
      
      // Remove event listeners for this client
      spectrum.removeListener('fftData', fftDataHandler);
      spectrum.removeListener('signalsDetected', signalsDetectedHandler);
      spectrum.removeListener('connected', connectedHandler);
      spectrum.removeListener('disconnected', disconnectedHandler);
      spectrum.removeListener('error', errorHandler);
      spectrum.removeListener('configUpdated', configUpdatedHandler);
      spectrum.removeListener('bufferCleared', bufferClearedHandler);
    });
  });
}

export function setupSignalStreamNamespace(io: SocketIOServer, logger: winston.Logger): Namespace {
  // Create a namespace for signal streaming
  const signalNamespace = io.of('/signal-stream');

  // Handle signal stream connections
  signalNamespace.on('connection', (socket: Socket) => {
    logger.info('Client connected to signal stream', { 
      clientId: socket.id,
      activeClients: signalNamespace.sockets.size 
    });
    
    // Send current active signals to new client
    socket.emit('batch', {
      type: 'batch',
      data: Array.from(activeSignals.values())
    });
    
    // Handle subscription requests
    socket.on('subscribe', (data: any) => {
      const sources = data && data.sources ? data.sources : ['kismet', 'hackrf'];
      socket.join('signal-subscribers');
      logger.info('Client subscribed to signal sources', { 
        clientId: socket.id, 
        sources 
      });
      
      // Send confirmation
      socket.emit('subscribed', {
        type: 'subscribed',
        sources,
        timestamp: Date.now()
      });
    });
    
    // Handle unsubscribe requests
    socket.on('unsubscribe', () => {
      socket.leave('signal-subscribers');
      logger.info('Client unsubscribed from signals', { clientId: socket.id });
    });
    
    // Handle signal queries
    socket.on('query', (filters: SignalFilters) => {
      let signals = Array.from(activeSignals.values());
      
      // Apply filters
      if (filters) {
        if (filters.source) {
          signals = signals.filter(s => s.source === filters.source);
        }
        if (filters.minStrength) {
          signals = signals.filter(s => s.signal_strength >= filters.minStrength);
        }
        if (filters.maxAge) {
          const minTime = Date.now() - filters.maxAge;
          signals = signals.filter(s => s.timestamp >= minTime);
        }
        if (filters.bounds) {
          const { north, south, east, west } = filters.bounds;
          signals = signals.filter(s => 
            s.lat >= south && s.lat <= north &&
            s.lon >= west && s.lon <= east
          );
        }
      }
      
      socket.emit('queryResult', {
        type: 'queryResult',
        filters,
        count: signals.length,
        data: signals
      } as SignalStreamEvent);
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
      logger.info('Client disconnected from signal stream', { 
        clientId: socket.id,
        remainingClients: signalNamespace.sockets.size - 1
      });
    });
    
    // Send periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat', {
        type: 'heartbeat',
        timestamp: Date.now(),
        activeSignals: activeSignals.size
      } as SignalStreamEvent);
    }, 30000); // Every 30 seconds
    
    socket.on('disconnect', () => {
      clearInterval(heartbeatInterval);
    });
  });

  return signalNamespace;
}

// Function to broadcast new signal detections
export function broadcastSignalDetection(signalData: any, signalNamespace: Namespace, logger: winston.Logger): void {
  // Validate signal data
  if (!signalData || !signalData.source || !signalData.lat || !signalData.lon) {
    logger.error('Invalid signal data for broadcast', { signalData });
    return;
  }
  
  // Create signal object with unique ID
  const signal: SignalDetection = {
    id: signalData.id || `${signalData.source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    lat: parseFloat(signalData.lat),
    lon: parseFloat(signalData.lon),
    signal_strength: parseFloat(signalData.signal_strength) || -100,
    timestamp: signalData.timestamp || Date.now(),
    source: signalData.source,
    frequency: signalData.frequency ? parseFloat(signalData.frequency) : null,
    metadata: signalData.metadata || {}
  };
  
  // Store in active signals
  activeSignals.set(signal.id, signal);
  
  // Add to history
  signalHistory.push(signal);
  if (signalHistory.length > MAX_SIGNAL_HISTORY) {
    signalHistory.shift();
  }
  
  // Clean up old signals (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, sig] of activeSignals.entries()) {
    if (sig.timestamp < oneHourAgo) {
      activeSignals.delete(id);
    }
  }
  
  // Broadcast to all subscribed clients
  signalNamespace.to('signal-subscribers').emit('signal', {
    type: 'signal',
    data: signal
  } as SignalStreamEvent);
  
  logger.debug('Broadcasted signal detection', { 
    source: signal.source,
    id: signal.id 
  });
}

// API endpoint handler for getting signal history
export function getSignalHistory(filters?: SignalFilters): SignalDetection[] {
  let signals = Array.from(activeSignals.values());
  
  // Apply filters
  if (filters) {
    if (filters.source) {
      signals = signals.filter(s => s.source === filters.source);
    }
    if (filters.minStrength) {
      signals = signals.filter(s => s.signal_strength >= filters.minStrength);
    }
    if (filters.maxAge) {
      const minTime = Date.now() - filters.maxAge;
      signals = signals.filter(s => s.timestamp >= minTime);
    }
    if (filters.bounds) {
      const { north, south, east, west } = filters.bounds;
      signals = signals.filter(s => 
        s.lat >= south && s.lat <= north &&
        s.lon >= west && s.lon <= east
      );
    }
  }
  
  return signals;
}