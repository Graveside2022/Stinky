<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    services, 
    alerts, 
    gpsStatus, 
    socketConnected, 
    lastUpdate,
    serviceStatusSummary 
  } from '../stores/kismet.js';
  
  export let showDetails: boolean = true;
  export let autoRefresh: boolean = true;
  export let refreshInterval: number = 5000; // 5 seconds
  
  let refreshTimer: NodeJS.Timeout;
  let isMinimized = false;
  
  onMount(() => {
    if (autoRefresh) {
      startAutoRefresh();
    }
  });
  
  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });
  
  function startAutoRefresh() {
    refreshTimer = setInterval(() => {
      fetchStatus();
    }, refreshInterval);
  }
  
  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  }
  
  async function fetchStatus() {
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const data = await response.json();
        updateStores(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  }
  
  function updateStores(data: any) {
    if (data.services) {
      services.set(data.services);
    }
    if (data.alerts) {
      alerts.set(data.alerts);
    }
    if (data.gps) {
      gpsStatus.set(data.gps);
    }
    lastUpdate.set(new Date().toISOString());
  }
  
  function toggleMinimize() {
    isMinimized = !isMinimized;
  }
  
  function getStatusColor(running: boolean, status?: string): string {
    if (!running || status === 'failed') return 'var(--accent-error)';
    if (status === 'degraded') return 'var(--accent-warning)';
    return 'var(--accent-success)';
  }
  
  function getAlertColor(level: string): string {
    switch (level) {
      case 'critical': 
      case 'error': 
        return 'var(--accent-error)';
      case 'warning': 
        return 'var(--accent-warning)';
      case 'info': 
        return 'var(--accent-primary)';
      default: 
        return 'var(--text-secondary)';
    }
  }
  
  function formatUptime(seconds?: number): string {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  
  function formatMemory(bytes?: number): string {
    if (!bytes) return 'N/A';
    
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb.toFixed(1)}MB`;
  }
  
  function formatLastUpdate(timestamp: string): string {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return date.toLocaleTimeString();
  }
  
  $: connectionStatus = $socketConnected ? 'Connected' : 'Disconnected';
  $: connectionColor = $socketConnected ? 'var(--accent-success)' : 'var(--accent-error)';
  $: criticalAlerts = $alerts.filter(a => a.level === 'critical' || a.level === 'error');
  $: warningAlerts = $alerts.filter(a => a.level === 'warning');
</script>

<div class="status-panel" class:minimized={isMinimized}>
  <div class="panel-header">
    <h3>System Status</h3>
    <div class="header-controls">
      <div class="connection-indicator" style="color: {connectionColor}">
        <div class="status-dot" style="background-color: {connectionColor}"></div>
        <span>{connectionStatus}</span>
      </div>
      <button class="control-btn" on:click={toggleMinimize}>
        {isMinimized ? '▶' : '▼'}
      </button>
    </div>
  </div>
  
  {#if !isMinimized}
    <div class="panel-content">
      <!-- Service Status Summary -->
      <div class="status-summary">
        <div class="summary-item">
          <span class="label">Services</span>
          <span class="value">
            {$serviceStatusSummary.running} / {$serviceStatusSummary.total}
          </span>
        </div>
        <div class="summary-item">
          <span class="label">Alerts</span>
          <span class="value alert-count" class:has-alerts={$alerts.length > 0}>
            {$alerts.length}
          </span>
        </div>
        <div class="summary-item">
          <span class="label">Updated</span>
          <span class="value">{formatLastUpdate($lastUpdate)}</span>
        </div>
      </div>
      
      <!-- Services List -->
      {#if showDetails}
        <div class="services-list">
          <h4>Services</h4>
          {#each Object.entries($services) as [name, service]}
            <div class="service-item">
              <div class="service-info">
                <div class="service-name">
                  <div 
                    class="status-dot" 
                    style="background-color: {getStatusColor(service.running, service.status)}"
                  ></div>
                  <span>{name}</span>
                </div>
                <div class="service-details">
                  {#if service.running && service.pid}
                    <span class="detail">PID: {service.pid}</span>
                  {/if}
                  {#if service.memory}
                    <span class="detail">RAM: {(service.memory * 100).toFixed(1)}%</span>
                  {/if}
                  {#if service.cpu}
                    <span class="detail">CPU: {service.cpu.toFixed(1)}%</span>
                  {/if}
                </div>
              </div>
              <div class="service-status">
                <span class="status-text" style="color: {getStatusColor(service.running, service.status)}">
                  {service.running ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
      
      <!-- GPS Status -->
      {#if $gpsStatus}
        <div class="gps-status">
          <h4>GPS Status</h4>
          <div class="gps-info">
            <div class="gps-item">
              <span class="label">Status:</span>
              <span class="value">{$gpsStatus.status}</span>
            </div>
            {#if $gpsStatus.lat && $gpsStatus.lon}
              <div class="gps-item">
                <span class="label">Position:</span>
                <span class="value">{$gpsStatus.lat.toFixed(6)}, {$gpsStatus.lon.toFixed(6)}</span>
              </div>
            {/if}
            {#if $gpsStatus.satellites}
              <div class="gps-item">
                <span class="label">Satellites:</span>
                <span class="value">{$gpsStatus.satellites}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Alerts -->
      {#if $alerts.length > 0}
        <div class="alerts-section">
          <h4>Alerts</h4>
          {#each $alerts.slice(0, 5) as alert}
            <div class="alert-item" style="border-left-color: {getAlertColor(alert.level)}">
              <div class="alert-header">
                <span class="alert-level" style="color: {getAlertColor(alert.level)}">
                  {alert.level.toUpperCase()}
                </span>
                <span class="alert-source">{alert.service || alert.type || 'System'}</span>
              </div>
              <div class="alert-message">{alert.message}</div>
            </div>
          {/each}
          
          {#if $alerts.length > 5}
            <div class="more-alerts">
              +{$alerts.length - 5} more alerts
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .status-panel {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    backdrop-filter: blur(12px);
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-primary);
  }
  
  .panel-header h3 {
    margin: 0;
    color: var(--accent-primary);
    font-size: 0.95rem;
    font-weight: 600;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .connection-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  .control-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--accent-primary);
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }
  
  .control-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent-primary);
  }
  
  .panel-content {
    padding: 16px;
  }
  
  .status-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
    padding: 12px;
    background: var(--bg-primary);
    border-radius: 4px;
  }
  
  .summary-item {
    text-align: center;
  }
  
  .summary-item .label {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  
  .summary-item .value {
    display: block;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .alert-count.has-alerts {
    color: var(--accent-warning);
  }
  
  .services-list, .gps-status, .alerts-section {
    margin-bottom: 20px;
  }
  
  .services-list h4, .gps-status h4, .alerts-section h4 {
    margin: 0 0 12px 0;
    color: var(--accent-primary);
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .service-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: var(--bg-primary);
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .service-info {
    flex: 1;
  }
  
  .service-name {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  
  .service-name span {
    font-weight: 500;
    color: var(--text-primary);
    text-transform: capitalize;
  }
  
  .service-details {
    display: flex;
    gap: 12px;
  }
  
  .detail {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  
  .service-status {
    text-align: right;
  }
  
  .status-text {
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .gps-info {
    background: var(--bg-primary);
    border-radius: 4px;
    padding: 12px;
  }
  
  .gps-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .gps-item .label {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  .gps-item .value {
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .alert-item {
    background: var(--bg-primary);
    border-left: 3px solid var(--accent-primary);
    border-radius: 0 4px 4px 0;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  
  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .alert-level {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  .alert-source {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: capitalize;
  }
  
  .alert-message {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }
  
  .more-alerts {
    text-align: center;
    padding: 8px;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-style: italic;
  }
  
  .minimized .panel-content {
    display: none;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  @media (max-width: 768px) {
    .status-summary {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    
    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: left;
    }
    
    .summary-item .label {
      margin-bottom: 0;
    }
    
    .service-details {
      flex-direction: column;
      gap: 4px;
    }
    
    .alert-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }
</style>