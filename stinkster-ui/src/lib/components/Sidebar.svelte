<script lang="ts">
  import { onMount } from 'svelte'
  import { services, updateServiceStatus, addNotification } from '../../shared/stores'
  import StatusIndicator from './ui/StatusIndicator.svelte'
  import Button from './ui/Button.svelte'
  import type { ServiceStatus } from '../../shared/stores'

  let isMinimized = false
  
  // Service control functions
  async function startKismet() {
    try {
      addNotification({
        type: 'info',
        title: 'Service Control',
        message: 'Starting Kismet service...'
      })
      
      const response = await fetch('/api/kismet/start', { method: 'POST' })
      if (response.ok) {
        updateServiceStatus('kismet', 'online')
        addNotification({
          type: 'success',
          title: 'Service Started',
          message: 'Kismet service started successfully'
        })
      } else {
        throw new Error('Failed to start Kismet')
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Service Error',
        message: `Failed to start Kismet: ${error}`
      })
    }
  }

  async function stopKismet() {
    try {
      addNotification({
        type: 'info',
        title: 'Service Control',
        message: 'Stopping Kismet service...'
      })
      
      const response = await fetch('/api/kismet/stop', { method: 'POST' })
      if (response.ok) {
        updateServiceStatus('kismet', 'offline')
        addNotification({
          type: 'success',
          title: 'Service Stopped',
          message: 'Kismet service stopped successfully'
        })
      } else {
        throw new Error('Failed to stop Kismet')
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Service Error',
        message: `Failed to stop Kismet: ${error}`
      })
    }
  }

  function openKismetWebUI() {
    window.open(`http://${window.location.hostname}:2501`, '_blank')
  }

  function openWigleToTak() {
    window.open(`http://${window.location.hostname}:8000`, '_blank')
  }

  function openWebRX() {
    window.open(`http://${window.location.hostname}:8073`, '_blank')
  }

  function openHackRFSweep() {
    window.open(`http://${window.location.hostname}:8092`, '_blank')
  }

  function toggleMinimize() {
    isMinimized = !isMinimized
  }

  // Check service status on mount
  onMount(async () => {
    try {
      const response = await fetch('/api/system/status')
      if (response.ok) {
        const status = await response.json()
        // Update service statuses based on API response
        Object.entries(status.services || {}).forEach(([key, service]: [string, any]) => {
          updateServiceStatus(key, service.running ? 'online' : 'offline')
        })
      }
    } catch (error) {
      console.error('Failed to check service status:', error)
    }
  })
</script>

<div class="side-stack left-stack">
  <!-- Setup Instructions -->
  <div class="grid-item" id="instructions">
    <div class="box-header">
      <h2>Setup Instructions</h2>
      <div class="box-controls">
        <button class="control-button-small" on:click={toggleMinimize}>
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>
    </div>
    {#if !isMinimized}
      <div class="grid-item-content">
        <div class="tab-nav">
          <a href="wigle.html" class="tab-button active-tab" target="_blank">Wigle</a>
          <a href="atak.html" class="tab-button" target="_blank">ATAK</a>
          <a href="kismet2.html" class="tab-button" target="_blank">Kismet</a>
        </div>
      </div>
    {/if}
  </div>

  <!-- Start Menu -->
  <div class="grid-item" id="start-menu">
    <div class="box-header">
      <h2>Start Menu</h2>
      <div class="box-controls">
        <button class="control-button-small" on:click={toggleMinimize}>▼</button>
      </div>
    </div>
    <div class="grid-item-content">
      <div class="button-group">
        <Button variant="primary" size="small" on:click={startKismet}>
          Start Kismet
        </Button>
        <Button variant="secondary" size="small" on:click={stopKismet}>
          Stop Kismet
        </Button>
        <Button variant="primary" size="small" on:click={openKismetWebUI}>
          Open Kismet Web UI
        </Button>
        <Button variant="primary" size="small" on:click={openWigleToTak}>
          Open WigletoTak
        </Button>
        <Button variant="primary" size="small" on:click={openWebRX}>
          Open WebRX UI
        </Button>
        <Button variant="primary" size="small" on:click={openHackRFSweep}>
          Open HackRF Sweep
        </Button>
      </div>
      
      <!-- Service Status Indicators -->
      <div class="service-status">
        {#each $services as service (service.id)}
          <div class="status-indicator">
            <StatusIndicator status={service.status} />
            <span class="service-name">{service.name}</span>
            <span class="service-description">{service.description}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- System Status -->
  <div class="grid-item" id="system-status">
    <div class="box-header">
      <h2>System Status</h2>
      <div class="box-controls">
        <button class="control-button-small" on:click={toggleMinimize}>▼</button>
      </div>
    </div>
    <div class="grid-item-content">
      <div class="system-metrics">
        <div class="metric">
          <span class="metric-label">CPU:</span>
          <span class="metric-value" id="cpu-usage">--</span>
        </div>
        <div class="metric">
          <span class="metric-label">Memory:</span>
          <span class="metric-value" id="memory-usage">--</span>
        </div>
        <div class="metric">
          <span class="metric-label">Temp:</span>
          <span class="metric-value" id="temp-reading">--</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .side-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 300px;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .left-stack {
    grid-column: 1;
  }

  .grid-item {
    background: var(--bg-secondary);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .grid-item:hover {
    border-color: var(--accent-primary);
    box-shadow: var(--glow-primary);
  }

  .box-header {
    background: var(--bg-tertiary);
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .box-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .box-controls {
    display: flex;
    gap: 5px;
  }

  .control-button-small {
    background: var(--bg-panel);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }

  .control-button-small:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    box-shadow: var(--glow-primary);
  }

  .grid-item-content {
    padding: 16px;
  }

  .tab-nav {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .tab-button {
    background: var(--bg-panel);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    display: block;
    text-align: center;
  }

  .tab-button:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    box-shadow: var(--glow-primary);
  }

  .tab-button.active-tab {
    background: var(--accent-primary);
    color: var(--bg-primary);
  }

  .button-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 15px;
  }

  .service-status {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-secondary);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .service-name {
    color: var(--text-primary);
    font-size: 0.9em;
    font-weight: 500;
  }

  .service-description {
    color: var(--text-muted);
    font-size: 0.8em;
    margin-left: auto;
  }

  .system-metrics {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .metric-label {
    color: var(--text-secondary);
    font-size: 0.9em;
  }

  .metric-value {
    color: var(--text-primary);
    font-size: 0.9em;
    font-weight: 500;
  }

  /* Mobile responsive */
  @media (max-width: 1023px) {
    .side-stack {
      width: 100%;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }

    .grid-item {
      flex: 1;
      min-width: 280px;
    }

    .button-group {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .side-stack {
      flex-direction: column;
    }

    .grid-item {
      margin-bottom: 8px;
    }

    .box-header h2 {
      font-size: 0.9rem;
    }

    .grid-item-content {
      padding: 12px;
    }
  }
</style>