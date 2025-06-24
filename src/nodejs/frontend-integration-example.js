/**
 * Frontend Integration Example for Stinkster Service Control API
 * 
 * This file provides example code for integrating the Service Control API
 * with frontend applications (Svelte, React, Vue, etc.)
 */

class StinksterServiceAPI {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
        this.listeners = new Map();
        this.pollingInterval = null;
        this.pollingFrequency = 5000; // 5 seconds
    }

    /**
     * Make an HTTP request to the API
     */
    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    }

    // Service Control Methods

    /**
     * Start all Stinkster services
     */
    async startServices() {
        const result = await this.request('POST', '/api/services/start');
        this.emit('servicesStarted', result);
        return result;
    }

    /**
     * Stop all Stinkster services
     */
    async stopServices(force = false) {
        const result = await this.request('POST', '/api/services/stop', { force });
        this.emit('servicesStopped', result);
        return result;
    }

    /**
     * Restart all Stinkster services
     */
    async restartServices(force = false) {
        const result = await this.request('POST', '/api/services/restart', { force });
        this.emit('servicesRestarted', result);
        return result;
    }

    /**
     * Get current service status
     */
    async getServiceStatus() {
        const result = await this.request('GET', '/api/services/status');
        this.emit('statusUpdated', result);
        return result;
    }

    /**
     * Get system health information
     */
    async getSystemHealth() {
        const result = await this.request('GET', '/api/system/health');
        this.emit('healthUpdated', result);
        return result;
    }

    /**
     * Get service logs
     */
    async getServiceLogs(lines = 100) {
        return await this.request('GET', `/api/services/logs?lines=${lines}`);
    }

    /**
     * Get network interfaces
     */
    async getNetworkInterfaces() {
        return await this.request('GET', '/api/system/interfaces');
    }

    /**
     * Check API health
     */
    async checkAPIHealth() {
        return await this.request('GET', '/health');
    }

    // Event System

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Polling System

    /**
     * Start automatic status polling
     */
    startPolling(frequency = 5000) {
        this.stopPolling(); // Stop any existing polling
        this.pollingFrequency = frequency;

        this.pollingInterval = setInterval(async () => {
            try {
                const [status, health] = await Promise.all([
                    this.getServiceStatus(),
                    this.getSystemHealth()
                ]);

                this.emit('pollingUpdate', { status, health });
            } catch (error) {
                this.emit('pollingError', error);
            }
        }, this.pollingFrequency);

        console.log(`Started polling every ${frequency}ms`);
    }

    /**
     * Stop automatic status polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('Stopped polling');
        }
    }

    // Utility Methods

    /**
     * Format uptime string
     */
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
    }

    /**
     * Get service status color
     */
    getStatusColor(running, healthy = true) {
        if (!running) return 'red';
        if (!healthy) return 'orange';
        return 'green';
    }
}

// Example Usage for Different Frameworks

// === Vanilla JavaScript Example ===
function vanillaJSExample() {
    const api = new StinksterServiceAPI();

    // Set up event listeners
    api.on('statusUpdated', (status) => {
        console.log('Service status updated:', status);
        updateServiceStatusUI(status);
    });

    api.on('healthUpdated', (health) => {
        console.log('System health updated:', health);
        updateHealthUI(health);
    });

    // Start polling
    api.startPolling();

    // Example control functions
    window.startServices = () => api.startServices();
    window.stopServices = () => api.stopServices();
    window.restartServices = () => api.restartServices();

    function updateServiceStatusUI(status) {
        const statusElement = document.getElementById('service-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="status ${status.running ? 'running' : 'stopped'}">
                    Services: ${status.running ? 'Running' : 'Stopped'}
                    ${status.running ? `(${status.runningPids} processes)` : ''}
                </div>
            `;
        }
    }

    function updateHealthUI(health) {
        const healthElement = document.getElementById('system-health');
        if (healthElement) {
            healthElement.innerHTML = `
                <div class="health">
                    <div>CPU Load: ${health.system.loadAverage[0].toFixed(2)}</div>
                    <div>Memory: ${health.system.memory.percentage}%</div>
                    <div>Temperature: ${health.system.temperature.celsius}°C</div>
                </div>
            `;
        }
    }
}

// === Svelte Store Example ===
const svelteStoreExample = `
// stores/stinkster.js
import { writable, derived } from 'svelte/store';

const api = new StinksterServiceAPI();

export const serviceStatus = writable(null);
export const systemHealth = writable(null);
export const apiError = writable(null);

// Derived store for overall system status
export const overallStatus = derived(
    [serviceStatus, systemHealth],
    ([$serviceStatus, $systemHealth]) => {
        if (!$serviceStatus || !$systemHealth) return 'unknown';
        
        if ($serviceStatus.running && $systemHealth.overall.healthy) {
            return 'healthy';
        } else if ($serviceStatus.running) {
            return 'warning';
        } else {
            return 'error';
        }
    }
);

// Set up API event listeners
api.on('statusUpdated', (status) => serviceStatus.set(status));
api.on('healthUpdated', (health) => systemHealth.set(health));
api.on('pollingError', (error) => apiError.set(error));

// Start polling
api.startPolling();

// Export API methods
export const stinksterAPI = {
    startServices: () => api.startServices(),
    stopServices: () => api.stopServices(),
    restartServices: () => api.restartServices(),
    getServiceLogs: (lines) => api.getServiceLogs(lines)
};
`;

// === React Hook Example ===
const reactHookExample = `
// hooks/useStinksterAPI.js
import { useState, useEffect, useCallback } from 'react';

const useStinksterAPI = () => {
    const [api] = useState(() => new StinksterServiceAPI());
    const [serviceStatus, setServiceStatus] = useState(null);
    const [systemHealth, setSystemHealth] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Set up event listeners
        api.on('statusUpdated', setServiceStatus);
        api.on('healthUpdated', setSystemHealth);
        api.on('pollingError', setError);

        // Start polling
        api.startPolling();

        // Cleanup
        return () => {
            api.stopPolling();
        };
    }, [api]);

    const startServices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await api.startServices();
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    const stopServices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await api.stopServices();
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    const restartServices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await api.restartServices();
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    return {
        serviceStatus,
        systemHealth,
        error,
        loading,
        startServices,
        stopServices,
        restartServices
    };
};

export default useStinksterAPI;
`;

// === Vue Composition API Example ===
const vueCompositionExample = `
// composables/useStinksterAPI.js
import { ref, onMounted, onUnmounted } from 'vue';

export function useStinksterAPI() {
    const api = new StinksterServiceAPI();
    
    const serviceStatus = ref(null);
    const systemHealth = ref(null);
    const error = ref(null);
    const loading = ref(false);

    const startServices = async () => {
        loading.value = true;
        error.value = null;
        try {
            await api.startServices();
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    };

    const stopServices = async () => {
        loading.value = true;
        error.value = null;
        try {
            await api.stopServices();
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    };

    const restartServices = async () => {
        loading.value = true;
        error.value = null;
        try {
            await api.restartServices();
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    };

    onMounted(() => {
        // Set up event listeners
        api.on('statusUpdated', (status) => serviceStatus.value = status);
        api.on('healthUpdated', (health) => systemHealth.value = health);
        api.on('pollingError', (err) => error.value = err);

        // Start polling
        api.startPolling();
    });

    onUnmounted(() => {
        api.stopPolling();
    });

    return {
        serviceStatus,
        systemHealth,
        error,
        loading,
        startServices,
        stopServices,
        restartServices
    };
}
`;

// Export for browser usage
if (typeof window !== 'undefined') {
    window.StinksterServiceAPI = StinksterServiceAPI;
    window.vanillaJSExample = vanillaJSExample;
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StinksterServiceAPI,
        vanillaJSExample,
        svelteStoreExample,
        reactHookExample,
        vueCompositionExample
    };
}