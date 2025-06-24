/**
 * System Status and Health API
 * Handles system monitoring, service status, and health checks
 */

import { apiClient } from './client';
import type {
  SystemStatus,
  HealthCheck,
  ServiceControlRequest,
  ServiceControlResponse,
  ConnectionStatus
} from './types';

export class SystemApi {
  private client = apiClient;
  private statusCache: SystemStatus | null = null;
  private lastStatusUpdate = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  /**
   * Get comprehensive system status
   */
  public async getStatus(useCache = true): Promise<SystemStatus> {
    const now = Date.now();
    
    // Return cached status if still valid
    if (useCache && this.statusCache && (now - this.lastStatusUpdate) < this.CACHE_TTL) {
      return this.statusCache;
    }

    try {
      const status = await this.client.getStandard<SystemStatus>('/api/system/status');
      
      // Update cache
      this.statusCache = status;
      this.lastStatusUpdate = now;
      
      return status;
    } catch (error) {
      console.error('Failed to get system status:', error);
      
      // Return cached data if available, otherwise rethrow
      if (this.statusCache) {
        console.warn('Using cached system status due to error');
        return this.statusCache;
      }
      
      throw error;
    }
  }

  /**
   * Get quick health check
   */
  public async getHealth(): Promise<HealthCheck> {
    return this.client.getStandard<HealthCheck>('/api/system/health');
  }

  /**
   * Get real-time system metrics
   */
  public async getMetrics(): Promise<SystemStatus['system']> {
    return this.client.getStandard<SystemStatus['system']>('/api/system/metrics');
  }

  /**
   * Get detailed service status
   */
  public async getServices(): Promise<Record<string, any>> {
    return this.client.getStandard<Record<string, any>>('/api/system/services');
  }

  /**
   * Control a system service
   */
  public async controlService(
    service: string, 
    action: 'start' | 'stop' | 'restart'
  ): Promise<ServiceControlResponse> {
    const request: ServiceControlRequest = { service, action };
    
    return this.client.postStandard<ServiceControlResponse>(
      `/api/system/service/${service}/${action}`,
      request
    );
  }

  /**
   * Restart a service
   */
  public async restartService(service: string): Promise<ServiceControlResponse> {
    return this.controlService(service, 'restart');
  }

  /**
   * Start a service
   */
  public async startService(service: string): Promise<ServiceControlResponse> {
    return this.controlService(service, 'start');
  }

  /**
   * Stop a service
   */
  public async stopService(service: string): Promise<ServiceControlResponse> {
    return this.controlService(service, 'stop');
  }

  /**
   * Test connectivity to all services
   */
  public async testConnectivity(): Promise<Record<string, boolean>> {
    try {
      const status = await this.getStatus(false);
      return status.connectivity.services;
    } catch (error) {
      console.error('Failed to test connectivity:', error);
      return {};
    }
  }

  /**
   * Get system alerts and warnings
   */
  public async getAlerts(): Promise<Array<{
    level: 'info' | 'warning' | 'error';
    service?: string;
    type?: string;
    message: string;
    timestamp?: number;
  }>> {
    try {
      const status = await this.getStatus();
      return status.system ? this.generateSystemAlerts(status) : [];
    } catch (error) {
      console.error('Failed to get system alerts:', error);
      return [{
        level: 'error',
        type: 'system',
        message: 'Failed to retrieve system status'
      }];
    }
  }

  /**
   * Generate system alerts based on status
   */
  private generateSystemAlerts(status: SystemStatus): Array<{
    level: 'info' | 'warning' | 'error';
    service?: string;
    type?: string;
    message: string;
    timestamp?: number;
  }> {
    const alerts: Array<{
      level: 'info' | 'warning' | 'error';
      service?: string;
      type?: string;
      message: string;
      timestamp?: number;
    }> = [];

    // Check CPU usage
    if (status.system.cpu > 90) {
      alerts.push({
        level: 'error',
        type: 'system',
        message: `Critical CPU usage: ${status.system.cpu.toFixed(1)}%`
      });
    } else if (status.system.cpu > 75) {
      alerts.push({
        level: 'warning',
        type: 'system',
        message: `High CPU usage: ${status.system.cpu.toFixed(1)}%`
      });
    }

    // Check memory usage
    if (status.system.memory.percentage > 90) {
      alerts.push({
        level: 'error',
        type: 'system',
        message: `Critical memory usage: ${status.system.memory.percentage}%`
      });
    } else if (status.system.memory.percentage > 80) {
      alerts.push({
        level: 'warning',
        type: 'system',
        message: `High memory usage: ${status.system.memory.percentage}%`
      });
    }

    // Check disk usage
    if (status.system.disk.percentage > 95) {
      alerts.push({
        level: 'error',
        type: 'system',
        message: `Critical disk usage: ${status.system.disk.percentage}%`
      });
    } else if (status.system.disk.percentage > 85) {
      alerts.push({
        level: 'warning',
        type: 'system',
        message: `High disk usage: ${status.system.disk.percentage}%`
      });
    }

    // Check temperature
    if (status.system.temperature > 85) {
      alerts.push({
        level: 'error',
        type: 'system',
        message: `Critical CPU temperature: ${status.system.temperature.toFixed(1)}°C`
      });
    } else if (status.system.temperature > 75) {
      alerts.push({
        level: 'warning',
        type: 'system',
        message: `High CPU temperature: ${status.system.temperature.toFixed(1)}°C`
      });
    }

    // Check service status
    const services = ['kismet', 'gpsd', 'wigletotak', 'mavgps'];
    services.forEach(serviceName => {
      const serviceStatus = status.services[serviceName as keyof typeof status.services];
      if (!serviceStatus || serviceStatus.status !== 'running') {
        alerts.push({
          level: 'warning',
          service: serviceName,
          message: `${serviceName} service is not running`
        });
      }
    });

    // Check connectivity
    if (!status.connectivity.internet) {
      alerts.push({
        level: 'error',
        type: 'connectivity',
        message: 'No internet connectivity'
      });
    }

    if (!status.connectivity.dns) {
      alerts.push({
        level: 'warning',
        type: 'connectivity',
        message: 'DNS resolution issues detected'
      });
    }

    return alerts.map(alert => ({
      ...alert,
      timestamp: status.timestamp
    }));
  }

  /**
   * Get performance metrics over time
   */
  public async getPerformanceHistory(
    duration: '1h' | '6h' | '24h' | '7d' = '1h'
  ): Promise<Array<{
    timestamp: number;
    cpu: number;
    memory: number;
    temperature: number;
    loadAverage: number[];
  }>> {
    try {
      return this.client.getStandard(`/api/system/metrics/history?duration=${duration}`);
    } catch (error) {
      console.error('Failed to get performance history:', error);
      return [];
    }
  }

  /**
   * Monitor system status with periodic updates
   */
  public startMonitoring(
    onUpdate: (status: SystemStatus) => void,
    onError: (error: Error) => void,
    interval = 10000 // 10 seconds
  ): () => void {
    let monitoring = true;
    
    const poll = async () => {
      if (!monitoring) return;
      
      try {
        const status = await this.getStatus(false);
        onUpdate(status);
      } catch (error) {
        onError(error as Error);
      }
      
      if (monitoring) {
        setTimeout(poll, interval);
      }
    };

    // Start polling
    poll();

    // Return stop function
    return () => {
      monitoring = false;
    };
  }

  /**
   * Clear status cache
   */
  public clearCache(): void {
    this.statusCache = null;
    this.lastStatusUpdate = 0;
  }

  /**
   * Get cached status (without making API call)
   */
  public getCachedStatus(): SystemStatus | null {
    return this.statusCache;
  }

  /**
   * Check if cache is valid
   */
  public isCacheValid(): boolean {
    const now = Date.now();
    return this.statusCache !== null && (now - this.lastStatusUpdate) < this.CACHE_TTL;
  }

  /**
   * Refresh status cache
   */
  public async refreshStatus(): Promise<SystemStatus> {
    return this.getStatus(false);
  }

  /**
   * Get connection status to the API
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.client.getConnectionStatus();
  }

  /**
   * Test API connection
   */
  public async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Get system uptime in a human-readable format
   */
  public formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
  }

  /**
   * Format bytes to human-readable format
   */
  public formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Create and export default instance
export const systemApi = new SystemApi();

// Export class for custom instances
export { SystemApi };