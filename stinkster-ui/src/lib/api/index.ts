/**
 * API Integration Layer - Main Export
 * Centralized access point for all API functionality
 */

// Core client and types
export { apiClient, WigleToTAKApiClient, createApiClient } from './client';
export type * from './types';

// API modules
export { systemApi, SystemApi } from './system';
export { kismetApi, KismetApi } from './kismet';
export { servicesApi, ServicesApi } from './services';
export { wsClient, WebSocketClient } from './websocket';

// Re-export base API types for convenience
export type {
  ApiResponse,
  ApiError,
  ApiRequestConfig,
  AuthConfig
} from '../services/api/types';

/**
 * Unified API client that combines all service APIs
 * Provides a single entry point for all API operations
 */
export class WigleToTAKApi {
  public readonly system = systemApi;
  public readonly kismet = kismetApi;
  public readonly services = servicesApi;
  public readonly websocket = wsClient;

  constructor() {
    // Initialize WebSocket connection if needed
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      // Connect to WebSocket
      await this.websocket.connect();
      
      // Subscribe to all relevant topics
      this.websocket.subscribeToAll();
      
      // Enable auto-reconnect
      this.websocket.enableAutoReconnect();
      
      console.log('WebSocket initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Test all API connections
   */
  public async testConnections(): Promise<{
    http: boolean;
    websocket: boolean;
    services: Record<string, boolean>;
  }> {
    const results = {
      http: false,
      websocket: false,
      services: {} as Record<string, boolean>
    };

    try {
      // Test HTTP connection
      results.http = await apiClient.testConnection();
    } catch (error) {
      console.error('HTTP connection test failed:', error);
    }

    try {
      // Test WebSocket connection
      results.websocket = this.websocket.isConnected();
      if (!results.websocket) {
        await this.websocket.connect();
        results.websocket = this.websocket.isConnected();
      }
    } catch (error) {
      console.error('WebSocket connection test failed:', error);
    }

    try {
      // Test service connectivity
      results.services = await this.system.testConnectivity();
    } catch (error) {
      console.error('Service connectivity test failed:', error);
    }

    return results;
  }

  /**
   * Get comprehensive system overview
   */
  public async getSystemOverview(): Promise<{
    status: any;
    alerts: any[];
    services: Record<string, any>;
    deviceStats: any;
    scanStats: any;
  }> {
    try {
      const [status, alerts, services, deviceStats, scanStats] = await Promise.allSettled([
        this.system.getStatus(),
        this.system.getAlerts(),
        this.services.getServices(),
        this.kismet.getDeviceStats(),
        this.kismet.getScanStats()
      ]);

      return {
        status: status.status === 'fulfilled' ? status.value : null,
        alerts: alerts.status === 'fulfilled' ? alerts.value : [],
        services: services.status === 'fulfilled' ? services.value : {},
        deviceStats: deviceStats.status === 'fulfilled' ? deviceStats.value : null,
        scanStats: scanStats.status === 'fulfilled' ? scanStats.value : null
      };
    } catch (error) {
      console.error('Failed to get system overview:', error);
      throw error;
    }
  }

  /**
   * Start comprehensive monitoring
   */
  public startMonitoring(callbacks: {
    onSystemUpdate?: (status: any) => void;
    onDeviceUpdate?: (device: any, action: string) => void;
    onScanUpdate?: (status: any) => void;
    onTAKUpdate?: (status: any) => void;
    onAlert?: (alert: any) => void;
    onError?: (error: Error) => void;
  }): () => void {
    const stopFunctions: Array<() => void> = [];

    // System monitoring
    if (callbacks.onSystemUpdate) {
      const stopSystemMonitoring = this.system.startMonitoring(
        callbacks.onSystemUpdate,
        callbacks.onError || console.error
      );
      stopFunctions.push(stopSystemMonitoring);
    }

    // WebSocket event handlers
    if (callbacks.onDeviceUpdate) {
      const unsubscribeDevice = this.websocket.onDeviceUpdate(callbacks.onDeviceUpdate);
      stopFunctions.push(unsubscribeDevice);
    }

    if (callbacks.onScanUpdate) {
      const unsubscribeScan = this.websocket.onScanStatus(callbacks.onScanUpdate);
      stopFunctions.push(unsubscribeScan);
    }

    if (callbacks.onTAKUpdate) {
      const unsubscribeTAK = this.websocket.onTAKStatus(callbacks.onTAKUpdate);
      stopFunctions.push(unsubscribeTAK);
    }

    if (callbacks.onAlert) {
      const unsubscribeAlert = this.websocket.onAlert(callbacks.onAlert);
      stopFunctions.push(unsubscribeAlert);
    }

    // Return function to stop all monitoring
    return () => {
      stopFunctions.forEach(stop => stop());
    };
  }

  /**
   * Emergency shutdown of all services
   */
  public async emergencyShutdown(): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Stop WebSocket connections
      this.websocket.disconnect();
    } catch (error) {
      errors.push(`WebSocket shutdown failed: ${error}`);
    }

    try {
      // Stop all services
      const result = await this.services.restartAllServices();
      if (!result.success) {
        errors.push(...Object.values(result.errors));
      }
    } catch (error) {
      errors.push(`Service shutdown failed: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Health check for all components
   */
  public async healthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      api: 'healthy' | 'unhealthy';
      websocket: 'healthy' | 'unhealthy';
      system: 'healthy' | 'degraded' | 'unhealthy';
      services: Record<string, 'healthy' | 'unhealthy'>;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const components = {
      api: 'unhealthy' as const,
      websocket: 'unhealthy' as const,
      system: 'unhealthy' as const,
      services: {} as Record<string, 'healthy' | 'unhealthy'>
    };

    // Check API
    try {
      const health = await this.system.getHealth();
      components.api = 'healthy';
      components.system = health.status === 'healthy' ? 'healthy' : 
                         health.status === 'degraded' ? 'degraded' : 'unhealthy';
    } catch (error) {
      issues.push('API health check failed');
    }

    // Check WebSocket
    components.websocket = this.websocket.isConnected() ? 'healthy' : 'unhealthy';
    if (components.websocket === 'unhealthy') {
      issues.push('WebSocket not connected');
    }

    // Check services
    try {
      const services = await this.services.getServices();
      Object.entries(services).forEach(([name, status]) => {
        components.services[name] = status.running ? 'healthy' : 'unhealthy';
        if (!status.running) {
          issues.push(`Service ${name} is not running`);
        }
      });
    } catch (error) {
      issues.push('Service status check failed');
    }

    // Determine overall health
    const healthyCount = Object.values(components).reduce((count, status) => {
      if (typeof status === 'string') {
        return count + (status === 'healthy' ? 1 : 0);
      } else {
        return count + Object.values(status).filter(s => s === 'healthy').length;
      }
    }, 0);

    const totalCount = Object.values(components).reduce((count, status) => {
      if (typeof status === 'string') {
        return count + 1;
      } else {
        return count + Object.keys(status).length;
      }
    }, 0);

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount * 0.7) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      issues
    };
  }
}

// Create and export default unified API instance
export const api = new WigleToTAKApi();

// Export the class for custom instances
export { WigleToTAKApi };

// Convenience exports for direct access
export const {
  system: systemAPI,
  kismet: kismetAPI,
  services: servicesAPI,
  websocket: websocketAPI
} = api;