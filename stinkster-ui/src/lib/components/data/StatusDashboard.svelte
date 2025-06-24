<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import StatusDot from '../ui/StatusDot.svelte'
  
  export let refreshInterval = 5000 // 5 seconds
  
  interface SystemStatus {
    timestamp: string
    services: {
      kismet?: { running: boolean; pid?: number; cpu?: number; memory?: number }
      wigletotak?: { running: boolean; pid?: number; cpu?: number; memory?: number }
      wigletotak_enhanced?: { running: boolean; pid?: number }
      gpsd?: { running: boolean; pid?: number; cpu?: number; memory?: number }
      mavgps?: { running: boolean; pid?: number }
      spectrum_analyzer?: { running: boolean; pid?: number; cpu?: number; memory?: number }
    }
    system: {
      cpu_percent: number
      memory_percent: number
      disk_percent: number
      cpu_temp: number
      load_avg: number[]
    }
    alerts: Array<{
      level: 'info' | 'warning' | 'error'
      service?: string
      type?: string
      message: string
    }>
  }
  
  let status: SystemStatus | null = null
  let lastUpdated: Date | null = null
  let updateInterval: number
  let loading = false
  let error: string | null = null
  
  onMount(async () => {
    await fetchStatus()
    updateInterval = setInterval(fetchStatus, refreshInterval)
  })
  
  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval)
    }
  })
  
  async function fetchStatus() {
    if (loading) return
    
    loading = true
    error = null
    
    try {
      const response = await fetch('/api/status')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      status = await response.json()
      lastUpdated = new Date()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to fetch status:', err)
    } finally {
      loading = false
    }
  }
  
  function getServiceStatus(serviceName: keyof SystemStatus['services']): 'active' | 'inactive' | 'error' {
    if (!status?.services[serviceName]) return 'inactive'
    const service = status.services[serviceName]
    if ('running' in service) {
      return service.running ? 'active' : 'inactive'
    }
    return 'inactive'
  }
  
  function getSystemHealth(): 'success' | 'warning' | 'error' {
    if (!status) return 'error'
    
    const { cpu_percent, memory_percent, cpu_temp } = status.system
    
    if (cpu_temp > 85 || cpu_percent > 95 || memory_percent > 95) return 'error'
    if (cpu_temp > 80 || cpu_percent > 85 || memory_percent > 85) return 'warning'
    return 'success'
  }
  
  function formatTemperature(temp: number): string {
    return `${temp.toFixed(1)}°C`
  }
  
  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  }
  
  function formatUptime(timestamp: string): string {
    const now = new Date()
    const statusTime = new Date(timestamp)
    const diff = now.getTime() - statusTime.getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }
  
  function getAlertsByLevel(level: 'info' | 'warning' | 'error') {
    return status?.alerts.filter(alert => alert.level === level) || []
  }
</script>

<div class="status-dashboard">
  <div class="dashboard-header">
    <h3>System Status</h3>
    <div class="update-info">
      {#if loading}
        <StatusDot status="warning" pulse size="small" label="Updating..." />
      {:else if error}
        <StatusDot status="error" size="small" label="Update failed" />
        <button class="retry-button" on:click={fetchStatus}>Retry</button>
      {:else if lastUpdated}
        <StatusDot status="success" size="small" label="Online" />
        <span class="last-updated">
          {lastUpdated.toLocaleTimeString()}
        </span>
      {/if}
    </div>
  </div>

  {#if status}
    <!-- System Health Overview -->
    <div class="health-overview">
      <div class="health-item">
        <StatusDot status={getSystemHealth()} pulse size="medium" />
        <span class="health-label">System Health</span>
        <span class="health-value">{getSystemHealth().toUpperCase()}</span>
      </div>
    </div>

    <!-- Service Status -->
    <div class="services-section">
      <h4>Services</h4>
      <div class="services-grid">
        <div class="service-item">
          <StatusDot status={getServiceStatus('kismet')} size="small" />
          <span class="service-name">Kismet</span>
          {#if status.services.kismet?.pid}
            <span class="service-pid">PID: {status.services.kismet.pid}</span>
          {/if}
        </div>
        
        <div class="service-item">
          <StatusDot status={getServiceStatus('wigletotak')} size="small" />
          <span class="service-name">WigleToTAK</span>
          {#if status.services.wigletotak?.pid}
            <span class="service-pid">PID: {status.services.wigletotak.pid}</span>
          {/if}
        </div>
        
        <div class="service-item">
          <StatusDot status={getServiceStatus('gpsd')} size="small" />
          <span class="service-name">GPSD</span>
          {#if status.services.gpsd?.pid}
            <span class="service-pid">PID: {status.services.gpsd.pid}</span>
          {/if}
        </div>
        
        <div class="service-item">
          <StatusDot status={getServiceStatus('spectrum_analyzer')} size="small" />
          <span class="service-name">Spectrum</span>
          {#if status.services.spectrum_analyzer?.pid}
            <span class="service-pid">PID: {status.services.spectrum_analyzer.pid}</span>
          {/if}
        </div>
        
        <div class="service-item">
          <StatusDot status={getServiceStatus('mavgps')} size="small" />
          <span class="service-name">MAVLink GPS</span>
        </div>
        
        <div class="service-item">
          <StatusDot status={getServiceStatus('wigletotak_enhanced')} size="small" />
          <span class="service-name">Enhanced</span>
        </div>
      </div>
    </div>

    <!-- System Metrics -->
    <div class="metrics-section">
      <h4>System Metrics</h4>
      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-label">CPU Usage</div>
          <div class="metric-value" class:warning={status.system.cpu_percent > 80} class:error={status.system.cpu_percent > 90}>
            {formatPercentage(status.system.cpu_percent)}
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">Memory</div>
          <div class="metric-value" class:warning={status.system.memory_percent > 80} class:error={status.system.memory_percent > 90}>
            {formatPercentage(status.system.memory_percent)}
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">Disk Usage</div>
          <div class="metric-value" class:warning={status.system.disk_percent > 80} class:error={status.system.disk_percent > 90}>
            {formatPercentage(status.system.disk_percent)}
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">CPU Temp</div>
          <div class="metric-value" class:warning={status.system.cpu_temp > 75} class:error={status.system.cpu_temp > 85}>
            {formatTemperature(status.system.cpu_temp)}
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">Load Avg</div>
          <div class="metric-value">
            {status.system.load_avg[0].toFixed(2)}
          </div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">Uptime</div>
          <div class="metric-value">
            {formatUptime(status.timestamp)}
          </div>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    {#if status.alerts.length > 0}
      <div class="alerts-section">
        <h4>Alerts ({status.alerts.length})</h4>
        <div class="alerts-list">
          {#each getAlertsByLevel('error') as alert}
            <div class="alert-item error">
              <StatusDot status="error" size="small" />
              <span class="alert-message">{alert.message}</span>
            </div>
          {/each}
          
          {#each getAlertsByLevel('warning') as alert}
            <div class="alert-item warning">
              <StatusDot status="warning" size="small" />
              <span class="alert-message">{alert.message}</span>
            </div>
          {/each}
          
          {#each getAlertsByLevel('info') as alert}
            <div class="alert-item info">
              <StatusDot status="active" size="small" />
              <span class="alert-message">{alert.message}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else if error}
    <div class="error-state">
      <p>Failed to load system status</p>
      <p class="error-message">{error}</p>
      <button on:click={fetchStatus}>Retry</button>
    </div>
  {:else}
    <div class="loading-state">
      <StatusDot status="warning" pulse size="medium" />
      <p>Loading system status...</p>
    </div>
  {/if}
</div>

<style>
  .status-dashboard {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-size: 0.75rem;
    overflow-y: auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-secondary);
  }

  .dashboard-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .update-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .retry-button {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 2px;
    color: var(--accent-primary);
    cursor: pointer;
    font-size: 0.65rem;
    padding: 0.25rem 0.5rem;
    transition: all 0.2s ease;
  }

  .retry-button:hover {
    background: var(--bg-tertiary);
    box-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
  }

  .last-updated {
    font-family: 'Courier New', monospace;
  }

  .health-overview {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
    padding: 0.75rem;
  }

  .health-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .health-label {
    flex: 1;
    color: var(--text-secondary);
  }

  .health-value {
    font-weight: 600;
    font-family: 'Courier New', monospace;
    color: var(--accent-primary);
  }

  .services-section, .metrics-section, .alerts-section {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
    padding: 0.75rem;
  }

  .services-section h4, .metrics-section h4, .alerts-section h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .services-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .service-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 2px;
  }

  .service-name {
    flex: 1;
    color: var(--text-primary);
    font-size: 0.7rem;
  }

  .service-pid {
    font-family: 'Courier New', monospace;
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .metric-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 2px;
    padding: 0.5rem;
    text-align: center;
  }

  .metric-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .metric-value {
    font-family: 'Courier New', monospace;
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-primary);
  }

  .metric-value.warning {
    color: var(--accent-warning);
  }

  .metric-value.error {
    color: var(--accent-error);
  }

  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .alert-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem;
    background: var(--bg-secondary);
    border-radius: 2px;
    border-left: 3px solid;
  }

  .alert-item.error {
    border-left-color: var(--accent-error);
  }

  .alert-item.warning {
    border-left-color: var(--accent-warning);
  }

  .alert-item.info {
    border-left-color: var(--accent-success);
  }

  .alert-message {
    flex: 1;
    color: var(--text-primary);
    font-size: 0.7rem;
    line-height: 1.3;
  }

  .error-state, .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
  }

  .error-message {
    color: var(--accent-error);
    font-size: 0.7rem;
    margin: 0.5rem 0;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .services-grid {
      grid-template-columns: 1fr;
    }

    .metrics-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.25rem;
    }

    .metric-item {
      padding: 0.375rem;
    }

    .metric-label {
      font-size: 0.6rem;
    }

    .metric-value {
      font-size: 0.7rem;
    }
  }

  /* Custom scrollbar */
  .status-dashboard::-webkit-scrollbar {
    width: 4px;
  }

  .status-dashboard::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
  }

  .status-dashboard::-webkit-scrollbar-thumb {
    background: var(--border-primary);
    border-radius: 2px;
  }

  .status-dashboard::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
  }
</style>