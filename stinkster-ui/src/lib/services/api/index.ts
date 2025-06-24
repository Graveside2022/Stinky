/**
 * Main export file for API service layer
 */

// Export base client and types
export { BaseApiClient } from './BaseApiClient';
export * from './types';

// Export service-specific clients
export { HackRFApiClient } from './HackRFApiClient';
export { WigleApiClient } from './WigleApiClient';
export { KismetApiClient } from './KismetApiClient';

// Export utilities
export * from './utils';

// Create singleton instances with default configurations
import { HackRFApiClient } from './HackRFApiClient';
import { WigleApiClient } from './WigleApiClient';
import { KismetApiClient } from './KismetApiClient';

// Default API clients (can be overridden by creating new instances)
export const hackrfApi = new HackRFApiClient();
export const wigleApi = new WigleApiClient();
export const kismetApi = new KismetApiClient();

// Helper to create configured API clients
export function createApiClients(config?: {
  hackrfUrl?: string;
  wigleUrl?: string;
  kismetUrl?: string;
  kismetApiKey?: string;
}) {
  return {
    hackrf: new HackRFApiClient(config?.hackrfUrl),
    wigle: new WigleApiClient(config?.wigleUrl),
    kismet: new KismetApiClient(config?.kismetUrl, config?.kismetApiKey)
  };
}