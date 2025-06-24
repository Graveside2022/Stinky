# API Service Layer

This directory contains the REST API service layer for the Stinkster UI, providing type-safe API clients for HackRF, WigleToTAK, and Kismet services.

## Features

- **Base API Client**: Reusable client with interceptors, retry logic, and error handling
- **Type Safety**: Full TypeScript support with strict typing
- **Retry Logic**: Automatic retry with exponential backoff
- **Interceptors**: Request/response interceptors for logging, auth, etc.
- **Error Handling**: Comprehensive error handling with typed errors
- **Authentication**: Support for API keys, bearer tokens, and basic auth
- **File Uploads**: Support for file uploads with progress tracking
- **Response Caching**: Built-in response caching with TTL

## Usage Examples

### Basic Usage

```typescript
import { hackrfApi, wigleApi, kismetApi } from '$lib/services/api';

// Get HackRF status
const status = await hackrfApi.getStatus();
console.log('HackRF connected:', status.data.connected);

// Start WiFi scan
await wigleApi.startScan({
  scanInterval: 5000,
  channels: [1, 6, 11]
});

// Get Kismet devices
const devices = await kismetApi.getDevices({
  limit: 50,
  regex: 'AP.*'
});
```

### Custom Configuration

```typescript
import { HackRFApiClient, WigleApiClient, KismetApiClient } from '$lib/services/api';

// Create clients with custom URLs
const hackrf = new HackRFApiClient('http://192.168.1.100:8092');
const wigle = new WigleApiClient('http://192.168.1.100:8000');
const kismet = new KismetApiClient('http://192.168.1.100:2501', 'your-api-key');
```

### Error Handling

```typescript
import { isApiError, getErrorMessage, getErrorStatus } from '$lib/services/api';

try {
  const response = await hackrfApi.setFrequency(433920000);
} catch (error) {
  if (isApiError(error)) {
    console.error('API Error:', getErrorMessage(error));
    console.error('Status:', getErrorStatus(error));
    
    if (error.status === 400) {
      // Handle validation error
    }
  }
}
```

### Request Interceptors

```typescript
import { BaseApiClient } from '$lib/services/api';

const client = new BaseApiClient('http://localhost:3000');

// Add logging interceptor
client.addRequestInterceptor({
  onRequest: (config) => {
    console.log(`[API] ${config.method} ${config.url}`);
    return config;
  },
  onError: (error) => {
    console.error('[API] Request error:', error);
    throw error;
  }
});

// Add auth interceptor
client.addRequestInterceptor({
  onRequest: async (config) => {
    const token = await getAuthToken();
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
    return config;
  }
});
```

### Response Interceptors

```typescript
// Add response timing
client.addResponseInterceptor({
  onResponse: (response) => {
    console.log(`Response time: ${Date.now() - response.config.timestamp}ms`);
    return response;
  }
});

// Add error handling
client.addResponseInterceptor({
  onError: async (error) => {
    if (error.status === 401) {
      // Refresh token and retry
      await refreshAuthToken();
      throw error; // Retry will happen automatically
    }
    throw error;
  }
});
```

### File Uploads

```typescript
// Upload replay file to HackRF
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const response = await hackrfApi.uploadReplayFile(file, (progress) => {
  console.log(`Upload progress: ${progress.percentage}%`);
  console.log(`Speed: ${formatBytes(progress.speed)}/s`);
  console.log(`Remaining: ${progress.remainingTime}s`);
});

// Import Wigle CSV
const result = await wigleApi.importWigleCSV(csvFile);
console.log(`Imported ${result.data.imported} devices`);
```

### Batch Requests

```typescript
import { batchRequests } from '$lib/services/api';

// Get details for multiple devices
const deviceMacs = ['AA:BB:CC:DD:EE:FF', 'FF:EE:DD:CC:BB:AA'];

const requests = deviceMacs.map(mac => () => wigleApi.getDevice(mac));

const results = await batchRequests(requests, {
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});
```

### Cancellable Requests

```typescript
import { createCancellableRequest } from '$lib/services/api';

// Create cancellable scan
const { promise, cancel } = createCancellableRequest(
  (signal) => hackrfApi.startFrequencyScan({
    start: 400000000,
    stop: 500000000,
    step: 100000
  }, { signal })
);

// Cancel after 5 seconds
setTimeout(cancel, 5000);

try {
  await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Scan cancelled');
  }
}
```

### Response Caching

```typescript
import { ResponseCache } from '$lib/services/api';

// Create cache with 5 minute TTL
const cache = new ResponseCache<WifiDevice[]>(5 * 60 * 1000);

async function getDevicesWithCache() {
  const cacheKey = 'devices';
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from API
  const response = await wigleApi.getDevices();
  cache.set(cacheKey, response.data.data);
  
  return response.data.data;
}
```

### Retry Configuration

```typescript
// Configure retry behavior
const response = await hackrfApi.getStatus({
  retries: 5,              // Max retry attempts
  retryDelay: 2000,        // Initial delay (2 seconds)
  timeout: 10000           // Request timeout (10 seconds)
});

// Or use retry helper directly
import { retryWithBackoff } from '$lib/services/api';

const data = await retryWithBackoff(
  () => kismetApi.getDevices(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error, attempt) => {
      // Don't retry on 4xx errors
      const status = getErrorStatus(error);
      return !status || status >= 500;
    }
  }
);
```

### WebSocket Integration

The API clients work seamlessly with WebSocket connections:

```typescript
import { hackrfApi } from '$lib/services/api';
import { hackrfSocket } from '$lib/stores/websocket';

// Start streaming via API
await hackrfApi.startStreaming();

// Receive data via WebSocket
hackrfSocket.subscribe(({ spectrum }) => {
  if (spectrum) {
    updateSpectrumDisplay(spectrum);
  }
});
```

## API Client Reference

### HackRFApiClient

- Device control: `getStatus()`, `getConfig()`, `updateConfig()`
- Frequency control: `setFrequency()`, `setSampleRate()`, `setGain()`, `setBandwidth()`
- Spectrum data: `getSpectrum()`, `getSpectrumHistory()`, `startStreaming()`, `stopStreaming()`
- Scanning: `startFrequencyScan()`, `stopFrequencyScan()`, `getScanResults()`
- Recording: `startRecording()`, `stopRecording()`, `listRecordings()`, `downloadRecording()`
- Analysis: `analyzeSignal()`, `detectSignals()`
- Presets: `getPresets()`, `savePreset()`, `loadPreset()`

### WigleApiClient

- Device management: `getDevices()`, `getDevice()`, `getDeviceHistory()`, `updateDevice()`
- Scanning: `startScan()`, `stopScan()`, `getScanStatus()`, `updateScanSettings()`
- TAK integration: `getTAKConfig()`, `updateTAKConfig()`, `connectTAK()`, `sendTAKMessage()`
- Statistics: `getStats()`, `getManufacturerStats()`, `getSignalDistribution()`
- Import/Export: `importWigleCSV()`, `exportDevices()`, `exportTAKMessages()`
- Alerts: `getAlerts()`, `markAlertRead()`, `clearAlerts()`
- Geofencing: `getGeofences()`, `createGeofence()`, `updateGeofence()`

### KismetApiClient

- System: `getSystemStatus()`, `getTimestamp()`, `getChannels()`
- Data sources: `getDataSources()`, `addDataSource()`, `pauseDataSource()`, `hopChannels()`
- Devices: `getDevices()`, `getDevice()`, `getDevicesByTime()`, `getSSIDs()`
- Alerts: `getAlerts()`, `getAlertDefinitions()`, `acknowledgeAlert()`
- Capture: `startPacketCapture()`, `stopPacketCapture()`, `downloadCapture()`
- GPS: `getGPSLocation()`
- Statistics: `getPacketStats()`, `getMemoryStats()`

## Testing

Run the test suite:

```bash
npm test src/lib/services/api
```

Run tests with coverage:

```bash
npm run test:coverage src/lib/services/api
```