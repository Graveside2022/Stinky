/**
 * Service Control API
 * Handles service management, configuration, and control operations
 */

import { apiClient } from './client';
import type {
  ServiceControlRequest,
  ServiceControlResponse,
  TAKConfig,
  WifiDevice,
  TAKMessage
} from './types';

export class ServicesApi {
  private client = apiClient;

  /**
   * Get all available services and their status
   */
  public async getServices(): Promise<Record<string, {
    running: boolean;
    pid?: number;
    uptime?: number;
    memory?: number;
    cpu?: number;
    autoStart?: boolean;
    description?: string;
  }>> {
    return this.client.getStandard('/api/services');
  }

  /**
   * Get specific service status
   */
  public async getServiceStatus(serviceName: string): Promise<{
    running: boolean;
    pid?: number;
    uptime?: number;
    memory?: number;
    cpu?: number;
    lastRestart?: number;
    errors?: string[];
  }> {
    return this.client.getStandard(`/api/services/${serviceName}/status`);
  }

  /**
   * Start a service
   */
  public async startService(serviceName: string): Promise<ServiceControlResponse> {
    return this.client.postStandard(`/api/services/${serviceName}/start`);
  }

  /**
   * Stop a service
   */
  public async stopService(serviceName: string): Promise<ServiceControlResponse> {
    return this.client.postStandard(`/api/services/${serviceName}/stop`);
  }

  /**
   * Restart a service
   */
  public async restartService(serviceName: string): Promise<ServiceControlResponse> {
    return this.client.postStandard(`/api/services/${serviceName}/restart`);
  }

  /**
   * Enable service auto-start
   */
  public async enableService(serviceName: string): Promise<{ success: boolean }> {
    return this.client.postStandard(`/api/services/${serviceName}/enable`);
  }

  /**
   * Disable service auto-start
   */
  public async disableService(serviceName: string): Promise<{ success: boolean }> {
    return this.client.postStandard(`/api/services/${serviceName}/disable`);
  }

  /**
   * Get service logs
   */
  public async getServiceLogs(
    serviceName: string,
    options: {
      lines?: number;
      since?: string;
      follow?: boolean;
    } = {}
  ): Promise<{
    logs: string[];
    hasMore: boolean;
    timestamp: number;
  }> {
    return this.client.getStandard(`/api/services/${serviceName}/logs`, {
      params: options
    });
  }

  /**
   * Stream service logs in real-time
   */
  public async streamServiceLogs(
    serviceName: string,
    onLog: (log: string) => void,
    onError?: (error: Error) => void
  ): Promise<AbortController> {
    return this.client.stream(
      `/api/services/${serviceName}/logs/stream`,
      onLog,
      onError
    );
  }

  /**
   * Get service configuration
   */
  public async getServiceConfig(serviceName: string): Promise<Record<string, any>> {
    return this.client.getStandard(`/api/services/${serviceName}/config`);
  }

  /**
   * Update service configuration
   */
  public async updateServiceConfig(
    serviceName: string,
    config: Record<string, any>
  ): Promise<{ success: boolean; requiresRestart: boolean }> {
    return this.client.postStandard(`/api/services/${serviceName}/config`, config);
  }

  // TAK Service Specific Methods

  /**
   * Get TAK service status
   */
  public async getTAKStatus(): Promise<{
    connected: boolean;
    server: string;
    port: number;
    messagesSent: number;
    lastMessage: number;
    errors: number;
    uptime: number;
  }> {
    return this.client.getStandard('/api/services/tak/status');
  }

  /**
   * Get TAK configuration
   */
  public async getTAKConfig(): Promise<TAKConfig> {
    return this.client.getStandard('/api/services/tak/config');
  }

  /**
   * Update TAK configuration
   */
  public async updateTAKConfig(config: Partial<TAKConfig>): Promise<{
    success: boolean;
    requiresRestart: boolean;
    validationErrors?: string[];
  }> {
    return this.client.postStandard('/api/services/tak/config', config);
  }

  /**
   * Test TAK server connection
   */
  public async testTAKConnection(
    server?: string,
    port?: number
  ): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    const params = server || port ? { server, port } : {};
    return this.client.postStandard('/api/services/tak/test', params);
  }

  /**
   * Send test TAK message
   */
  public async sendTestTAKMessage(): Promise<{
    success: boolean;
    messageId: string;
    timestamp: number;
  }> {
    return this.client.postStandard('/api/services/tak/test-message');
  }

  /**
   * Get TAK message history
   */
  public async getTAKMessageHistory(limit = 100): Promise<{
    messages: Array<{
      id: string;
      timestamp: number;
      type: string;
      success: boolean;
      error?: string;
    }>;
    total: number;
  }> {
    return this.client.getStandard('/api/services/tak/messages', {
      params: { limit }
    });
  }

  /**
   * Clear TAK message history
   */
  public async clearTAKMessageHistory(): Promise<{ success: boolean }> {
    return this.client.deleteStandard('/api/services/tak/messages');
  }

  // WigleToTAK Service Specific Methods

  /**
   * Get WigleToTAK status
   */
  public async getWigleToTAKStatus(): Promise<{
    running: boolean;
    devicesTracked: number;
    lastUpdate: number;
    conversionRate: number;
    errors: number;
  }> {
    return this.client.getStandard('/api/services/wigletotak/status');
  }

  /**
   * Get conversion statistics
   */
  public async getConversionStats(): Promise<{
    totalDevices: number;
    convertedToTAK: number;
    conversionRate: number;
    averageLatency: number;
    recentConversions: Array<{
      deviceMac: string;
      timestamp: number;
      success: boolean;
    }>;
  }> {
    return this.client.getStandard('/api/services/wigletotak/stats');
  }

  /**
   * Convert specific device to TAK message
   */
  public async convertDeviceToTAK(deviceMac: string): Promise<{
    success: boolean;
    message?: TAKMessage;
    error?: string;
  }> {
    return this.client.postStandard('/api/services/wigletotak/convert', {
      deviceMac
    });
  }

  /**
   * Bulk convert devices to TAK messages
   */
  public async bulkConvertToTAK(
    deviceMacs: string[],
    options?: {
      onProgress?: (completed: number, total: number) => void;
      batchSize?: number;
    }
  ): Promise<{
    success: boolean;
    converted: number;
    failed: number;
    errors: Array<{ deviceMac: string; error: string }>;
  }> {
    const batchSize = options?.batchSize || 10;
    const results = {
      success: true,
      converted: 0,
      failed: 0,
      errors: [] as Array<{ deviceMac: string; error: string }>
    };

    // Process in batches
    for (let i = 0; i < deviceMacs.length; i += batchSize) {
      const batch = deviceMacs.slice(i, i + batchSize);
      
      try {
        const batchResult = await this.client.postStandard('/api/services/wigletotak/convert/batch', {
          deviceMacs: batch
        });

        results.converted += batchResult.converted;
        results.failed += batchResult.failed;
        results.errors.push(...batchResult.errors);

        if (options?.onProgress) {
          options.onProgress(Math.min(i + batchSize, deviceMacs.length), deviceMacs.length);
        }
      } catch (error) {
        results.failed += batch.length;
        batch.forEach(mac => {
          results.errors.push({
            deviceMac: mac,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  // Kismet Service Specific Methods

  /**
   * Get Kismet service status
   */
  public async getKismetStatus(): Promise<{
    running: boolean;
    version: string;
    interfaces: Array<{
      name: string;
      type: string;
      channel: string;
      packets: number;
    }>;
    memory: number;
    uptime: number;
  }> {
    return this.client.getStandard('/api/services/kismet/status');
  }

  /**
   * Start Kismet scan
   */
  public async startKismetScan(options?: {
    interfaces?: string[];
    channels?: number[];
    duration?: number;
  }): Promise<{
    success: boolean;
    scanId: string;
    interfaces: string[];
  }> {
    return this.client.postStandard('/api/services/kismet/scan/start', options);
  }

  /**
   * Stop Kismet scan
   */
  public async stopKismetScan(): Promise<{
    success: boolean;
    devicesFound: number;
    packetsProcessed: number;
  }> {
    return this.client.postStandard('/api/services/kismet/scan/stop');
  }

  /**
   * Get Kismet interface information
   */
  public async getKismetInterfaces(): Promise<Array<{
    name: string;
    type: string;
    available: boolean;
    inUse: boolean;
    channels: number[];
    currentChannel?: number;
  }>> {
    return this.client.getStandard('/api/services/kismet/interfaces');
  }

  /**
   * Configure Kismet interface
   */
  public async configureKismetInterface(
    interfaceName: string,
    config: {
      enabled: boolean;
      channel?: number;
      hopRate?: number;
    }
  ): Promise<{ success: boolean }> {
    return this.client.postStandard(`/api/services/kismet/interfaces/${interfaceName}`, config);
  }

  // GPS Service Methods

  /**
   * Get GPS service status
   */
  public async getGPSStatus(): Promise<{
    running: boolean;
    connected: boolean;
    satellites: number;
    fix: 'none' | '2d' | '3d';
    latitude?: number;
    longitude?: number;
    altitude?: number;
    accuracy?: number;
    lastUpdate?: number;
  }> {
    return this.client.getStandard('/api/services/gps/status');
  }

  /**
   * Get current GPS position
   */
  public async getGPSPosition(): Promise<{
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    timestamp: number;
    satellites: number;
    fix: '2d' | '3d';
  }> {
    return this.client.getStandard('/api/services/gps/position');
  }

  /**
   * Test GPS connection
   */
  public async testGPSConnection(): Promise<{
    success: boolean;
    device?: string;
    baudRate?: number;
    error?: string;
  }> {
    return this.client.postStandard('/api/services/gps/test');
  }

  // Service Health Monitoring

  /**
   * Monitor all services with periodic updates
   */
  public startServiceMonitoring(
    onUpdate: (services: Record<string, any>) => void,
    onError: (error: Error) => void,
    interval = 5000
  ): () => void {
    let monitoring = true;
    
    const poll = async () => {
      if (!monitoring) return;
      
      try {
        const services = await this.getServices();
        onUpdate(services);
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
   * Restart all critical services
   */
  public async restartAllServices(): Promise<{
    success: boolean;
    results: Record<string, ServiceControlResponse>;
    errors: Record<string, string>;
  }> {
    const criticalServices = ['kismet', 'wigletotak', 'gpsd'];
    const results: Record<string, ServiceControlResponse> = {};
    const errors: Record<string, string> = {};
    let overallSuccess = true;

    for (const service of criticalServices) {
      try {
        results[service] = await this.restartService(service);
      } catch (error) {
        overallSuccess = false;
        errors[service] = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return {
      success: overallSuccess,
      results,
      errors
    };
  }

  /**
   * Get service dependencies
   */
  public async getServiceDependencies(): Promise<Record<string, {
    dependsOn: string[];
    requiredBy: string[];
    optional: string[];
  }>> {
    return this.client.getStandard('/api/services/dependencies');
  }

  /**
   * Validate service configuration
   */
  public async validateServiceConfig(
    serviceName: string,
    config: Record<string, any>
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.client.postStandard(`/api/services/${serviceName}/validate`, config);
  }
}

// Create and export default instance
export const servicesApi = new ServicesApi();

// Export class for custom instances
export { ServicesApi };