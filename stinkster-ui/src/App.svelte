<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './lib/components/ui/Panel.svelte'
  import TabNavigation from './lib/components/navigation/TabNavigation.svelte'
  import ServiceStatus from './lib/components/ui/ServiceStatus.svelte'
  import Notifications from './lib/components/ui/Notifications.svelte'
  import './shared/app.css'
  
  // Import shared stores
  import {
    services,
    connectionStatus,
    serviceCount,
    updateServiceStatus,
    addNotification,
    type ServiceStatus as ServiceType
  } from './shared/stores'
  
  // Import routing system
  import { getMainNavigation, getToolNavigation } from './lib/routing'
  
  // Main navigation tabs
  const mainTabs = getMainNavigation()
  const toolTabs = getToolNavigation()
  
  let activeTab = 'wigle'
  let isLoading = true
  let lastStatusCheck = new Date()
  
  // Subscribe to stores
  $: currentServices = $services
  $: currentConnectionStatus = $connectionStatus
  $: counts = $serviceCount
  
  onMount(() => {
    // Initialize application
    initializeApp()
    
    // Start service monitoring
    const statusInterval = setInterval(checkServiceStatus, 5000)
    const connectionInterval = setInterval(checkConnectionHealth, 10000)
    
    // Initial status check
    checkServiceStatus()
    
    return () => {
      clearInterval(statusInterval)
      clearInterval(connectionInterval)
    }
  })
  
  async function initializeApp() {
    try {
      // Load any saved preferences
      loadUserPreferences()
      
      // Initial service status check
      await checkServiceStatus()
      
      addNotification({
        type: 'success',
        title: 'Application Initialized',
        message: 'Stinkster Operations Center is ready',
        duration: 3000
      })
      
    } catch (error) {
      console.error('Failed to initialize app:', error)
      addNotification({
        type: 'error',
        title: 'Initialization Error',
        message: 'Failed to initialize application properly'
      })
    } finally {
      isLoading = false
    }
  }
  
  async function checkServiceStatus() {
    try {
      connectionStatus.set('connecting')
      
      const response = await fetch('/api/status')
      if (response.ok) {
        const status = await response.json()
        
        // Update individual service statuses
        Object.keys(status).forEach(serviceId => {
          updateServiceStatus(serviceId, status[serviceId])
        })
        
        connectionStatus.set('connected')
        lastStatusCheck = new Date()
      } else {
        throw new Error(`Status check failed: ${response.status}`)
      }
    } catch (error) {
      console.warn('Failed to check service status:', error)
      connectionStatus.set('disconnected')
      
      // Don't spam notifications for connection issues
      if (currentConnectionStatus === 'connected') {
        addNotification({
          type: 'warning',
          title: 'Connection Issue',
          message: 'Unable to check service status',
          duration: 5000
        })
      }
    }
  }
  
  async function checkConnectionHealth() {
    const now = new Date()
    const timeSinceLastCheck = now.getTime() - lastStatusCheck.getTime()
    
    // If we haven't had a successful status check in over 30 seconds
    if (timeSinceLastCheck > 30000 && currentConnectionStatus !== 'disconnected') {
      connectionStatus.set('disconnected')
      addNotification({
        type: 'error',
        title: 'Connection Lost',
        message: 'Lost connection to backend services',
        duration: 0 // Persistent until reconnected
      })
    }
  }
  
  function loadUserPreferences() {
    try {
      const saved = localStorage.getItem('stinkster-preferences')
      if (saved) {
        const prefs = JSON.parse(saved)
        activeTab = prefs.activeTab || 'wigle'
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error)
    }
  }
  
  function saveUserPreferences() {
    try {
      const prefs = { activeTab }
      localStorage.setItem('stinkster-preferences', JSON.stringify(prefs))
    } catch (error) {
      console.warn('Failed to save user preferences:', error)
    }
  }
  
  // Handle tab changes
  function handleTabChange(event: CustomEvent<string>) {
    activeTab = event.detail
    saveUserPreferences()
  }
  
  // System control functions
  async function startAllServices() {
    try {
      const response = await fetch('/api/system/start-all', { method: 'POST' })
      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Services Starting',
          message: 'All services are being started...'
        })
      } else {
        throw new Error('Failed to start services')
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Start Failed',
        message: 'Failed to start services'
      })
    }
  }
  
  async function stopAllServices() {
    try {
      const response = await fetch('/api/system/stop-all', { method: 'POST' })
      if (response.ok) {
        addNotification({
          type: 'info',
          title: 'Services Stopping',
          message: 'All services are being stopped...'
        })
      } else {
        throw new Error('Failed to stop services')
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Stop Failed',
        message: 'Failed to stop services'
      })
    }
  }
</script>

{#if isLoading}
  <div class="loading-screen">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <h2>Initializing Stinkster Operations Center</h2>
      <p>Loading system components...</p>
    </div>
  </div>
{:else}
  <div class="stinkster-app">
    <!-- Header -->
    <header class="top-banner">
      <div class="banner-content">
        <h1 class="app-title">Stinkster Operations Center</h1>
        <div class="status-summary">
          <div class="connection-indicator {currentConnectionStatus}">
            <span class="connection-dot"></span>
            <span class="connection-text">{currentConnectionStatus}</span>
          </div>
          <div class="service-summary">
            <span class="online-count">{counts.online} Online</span>
            <span class="total-count">/ {counts.total} Services</span>
          </div>
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <div class="page-container">
      <main class="main-content-area">
        
        <!-- Left Stack -->
        <div class="side-stack left-stack">
          <Panel title="Main Applications" minimizable={true}>
            <TabNavigation 
              tabs={mainTabs} 
              bind:activeTab 
              on:tabChange={handleTabChange}
            />
          </Panel>
          
          {#if toolTabs && toolTabs.length > 0}
          <Panel title="Additional Tools" minimizable={true}>
            <div class="tool-links">
              {#each toolTabs as tool}
                <a 
                  href={tool.href} 
                  target={tool.target || '_blank'}
                  class="tool-link"
                  title={tool.description}
                >
                  {#if tool.icon}
                    <span class="tool-icon">{tool.icon}</span>
                  {/if}
                  <span class="tool-label">{tool.label}</span>
                  {#if tool.status}
                    <span class="tool-status {tool.status}"></span>
                  {/if}
                </a>
              {/each}
            </div>
          </Panel>
          {/if}
          
          <Panel title="System Control" minimizable={true}>
            <div class="button-group">
              <button 
                class="control-button primary" 
                on:click={startAllServices}
                disabled={currentConnectionStatus === 'disconnected'}
              >
                Start All
              </button>
              <button 
                class="control-button secondary" 
                on:click={stopAllServices}
                disabled={currentConnectionStatus === 'disconnected'}
              >
                Stop All
              </button>
            </div>
            <ServiceStatus services={currentServices} />
          </Panel>
        </div>
        
        <!-- Central Content -->
        <div class="central-content">
          <Panel title="Welcome to Stinkster" minimizable={false}>
            <div class="welcome-content">
              <p class="description">
                Integrated SDR, WiFi, and tactical operations platform. 
                Select a service from the navigation to get started.
              </p>
              
              <div class="system-status">
                <div class="status-row">
                  <strong>Connection:</strong> 
                  <span class="status-indicator {currentConnectionStatus}">{currentConnectionStatus}</span>
                </div>
                <div class="status-row">
                  <strong>Services:</strong>
                  <span class="online">{counts.online} Online</span>
                  <span class="offline">{counts.offline} Offline</span>
                  {#if counts.error > 0}
                    <span class="error">{counts.error} Error</span>
                  {/if}
                  {#if counts.warning > 0}
                    <span class="warning">{counts.warning} Warning</span>
                  {/if}
                </div>
              </div>
              
              <div class="feature-grid">
                <div class="feature-card wigle">
                  <h3>WigleToTAK</h3>
                  <p>WiFi network detection with TAK integration for tactical mapping</p>
                  <a href="/wigle/" target="_blank" class="feature-link">Open WigleToTAK →</a>
                </div>
                <div class="feature-card kismet">
                  <h3>Kismet Operations</h3>
                  <p>Advanced WiFi scanning and network analysis dashboard</p>
                  <a href="/kismet/" target="_blank" class="feature-link">Open Kismet →</a>
                </div>
                <div class="feature-card hackrf">
                  <h3>HackRF Spectrum</h3>
                  <p>Software-defined radio spectrum analysis and signal processing</p>
                  <a href="/hackrf/" target="_blank" class="feature-link">Open HackRF →</a>
                </div>
                <div class="feature-card operations">
                  <h3>Operations Center</h3>
                  <p>Unified operations dashboard with multi-panel views</p>
                  <a href="/operations/" target="_blank" class="feature-link">Open Operations →</a>
                </div>
              </div>
            </div>
          </Panel>
        </div>
        
      </main>
    </div>
    
    <!-- Notifications -->
    <Notifications />
  </div>
{/if}

<style>
  .loading-screen {
    min-height: 100vh;
    background: #030610;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d0d8f0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .loading-content {
    text-align: center;
    max-width: 400px;
  }
  
  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(0, 220, 255, 0.2);
    border-top: 3px solid #00d2ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-content h2 {
    color: #00d2ff;
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }
  
  .loading-content p {
    color: rgba(208, 216, 240, 0.8);
    font-size: 16px;
    margin: 0;
  }
  
  .stinkster-app {
    min-height: 100vh;
    background: #030610;
    color: #d0d8f0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .top-banner {
    background: rgba(12, 22, 48, 0.95);
    border-bottom: 1px solid rgba(0, 190, 215, 0.35);
    padding: 16px 24px;
  }
  
  .banner-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .app-title {
    font-size: 24px;
    font-weight: 700;
    color: #00d2ff;
    margin: 0;
  }
  
  .status-summary {
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 14px;
  }
  
  .connection-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid;
  }
  
  .connection-indicator.connected {
    border-color: #44ff44;
    color: #44ff44;
  }
  
  .connection-indicator.connecting {
    border-color: #ffa500;
    color: #ffa500;
  }
  
  .connection-indicator.disconnected {
    border-color: #ff4444;
    color: #ff4444;
  }
  
  .connection-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
  
  .connection-indicator.connecting .connection-dot {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .connection-text {
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .service-summary {
    display: flex;
    gap: 4px;
  }
  
  .online-count {
    color: #44ff44;
    font-weight: 600;
  }
  
  .total-count {
    color: rgba(0, 220, 255, 0.8);
  }
  
  .page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
  }
  
  .main-content-area {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 24px;
    min-height: calc(100vh - 120px);
  }
  
  .side-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .central-content {
    min-height: 600px;
  }
  
  .button-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .control-button {
    padding: 12px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid;
  }
  
  .control-button.primary {
    background: rgba(0, 220, 255, 0.1);
    border-color: #00d2ff;
    color: #00d2ff;
  }
  
  .control-button.primary:hover {
    background: rgba(0, 220, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 220, 255, 0.5);
  }
  
  .control-button.secondary {
    background: rgba(255, 68, 68, 0.1);
    border-color: #ff4444;
    color: #ff4444;
  }
  
  .control-button.secondary:hover {
    background: rgba(255, 68, 68, 0.2);
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
  }
  
  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  .control-button:disabled:hover {
    background: rgba(0, 0, 0, 0.1);
    box-shadow: none;
  }
  
  .welcome-content {
    text-align: center;
  }
  
  .description {
    font-size: 16px;
    color: rgba(0, 220, 255, 0.8);
    margin-bottom: 24px;
    line-height: 1.6;
  }
  
  .system-status {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(0, 190, 215, 0.25);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 32px;
    text-align: left;
  }
  
  .status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  
  .status-row:last-child {
    margin-bottom: 0;
  }
  
  .status-indicator {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .status-indicator.connected {
    background: rgba(68, 255, 68, 0.1);
    color: #44ff44;
  }
  
  .status-indicator.connecting {
    background: rgba(255, 165, 0, 0.1);
    color: #ffa500;
  }
  
  .status-indicator.disconnected {
    background: rgba(255, 68, 68, 0.1);
    color: #ff4444;
  }
  
  .status-row .online { color: #44ff44; font-weight: 500; }
  .status-row .offline { color: #888; font-weight: 500; }
  .status-row .error { color: #ff4444; font-weight: 500; }
  .status-row .warning { color: #ffa500; font-weight: 500; }
  
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 24px;
  }
  
  .feature-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(0, 190, 215, 0.25);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .feature-card:hover {
    border-color: rgba(0, 190, 215, 0.5);
    background: rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 220, 255, 0.1);
  }
  
  .feature-card.wigle { border-left: 4px solid #00ff88; }
  .feature-card.kismet { border-left: 4px solid #ff6600; }
  .feature-card.hackrf { border-left: 4px solid #8844ff; }
  .feature-card.operations { border-left: 4px solid #00d2ff; }
  
  .feature-card h3 {
    color: #00d2ff;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 12px 0;
  }
  
  .feature-card p {
    color: #d0d8f0;
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 16px 0;
  }
  
  .feature-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #00d2ff;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
    padding: 8px 16px;
    border: 1px solid rgba(0, 220, 255, 0.3);
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .feature-link:hover {
    background: rgba(0, 220, 255, 0.1);
    border-color: #00d2ff;
    text-decoration: none;
  }
  
  /* Tool Links Styling */
  .tool-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .tool-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 190, 215, 0.2);
    border-radius: 6px;
    color: #d0d8f0;
    text-decoration: none;
    font-size: 13px;
    transition: all 0.2s ease;
  }
  
  .tool-link:hover {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(0, 190, 215, 0.4);
    text-decoration: none;
    transform: translateX(2px);
  }
  
  .tool-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
  
  .tool-label {
    flex: 1;
    color: inherit;
  }
  
  .tool-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .tool-status.online {
    background: #44ff44;
    box-shadow: 0 0 6px rgba(68, 255, 68, 0.5);
  }
  
  .tool-status.offline {
    background: #888;
  }
  
  .tool-status.maintenance {
    background: #ffa500;
    box-shadow: 0 0 6px rgba(255, 165, 0, 0.5);
  }
  
  @media (max-width: 768px) {
    .main-content-area {
      grid-template-columns: 1fr;
    }
    
    .banner-content {
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }
    
    .feature-grid {
      grid-template-columns: 1fr;
    }
  }
</style>