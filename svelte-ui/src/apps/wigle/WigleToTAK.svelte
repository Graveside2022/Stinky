<script>
  import { onMount, onDestroy } from 'svelte';
  import StatusPanel from './components/StatusPanel.svelte';
  import TAKSettings from './components/TAKSettings.svelte';
  import AntennaSettings from './components/AntennaSettings.svelte';
  import FileManager from './components/FileManager.svelte';
  import FilterManager from './components/FilterManager.svelte';
  import LogOutput from './components/LogOutput.svelte';
  
  let status = {
    broadcasting: false,
    takServerIp: '0.0.0.0',
    takServerPort: 6969,
    analysisMode: 'realtime',
    antennaSensitivity: 'standard'
  };
  
  let logs = [];
  let statusInterval;
  
  onMount(() => {
    // Initial status load
    refreshStatus();
    
    // Set up periodic status refresh
    statusInterval = setInterval(refreshStatus, 5000);
  });
  
  onDestroy(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
  });
  
  async function refreshStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      status = { ...status, ...data };
    } catch (error) {
      addLog(`❌ Status error: ${error.message}`, 'error');
    }
  }
  
  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    logs = [...logs, { timestamp, message, type }].slice(-100);
  }
  
  function handleTAKUpdate(event) {
    const { success, message } = event.detail;
    if (success) {
      addLog(`✅ ${message}`);
      refreshStatus();
    } else {
      addLog(`❌ ${message}`, 'error');
    }
  }
  
  function handleAntennaUpdate(event) {
    const { success, message } = event.detail;
    if (success) {
      addLog(`✅ ${message}`);
      refreshStatus();
    } else {
      addLog(`❌ ${message}`, 'error');
    }
  }
  
  function handleBroadcastStart(event) {
    const { success, message, file } = event.detail;
    if (success) {
      addLog(`🚀 Started broadcasting: ${file}`);
      status.broadcasting = true;
    } else {
      addLog(`❌ ${message}`, 'error');
    }
  }
  
  function handleBroadcastStop(event) {
    const { success, message } = event.detail;
    if (success) {
      addLog(`⏹️ Broadcasting stopped`);
      status.broadcasting = false;
    } else {
      addLog(`❌ ${message}`, 'error');
    }
  }
  
  function handleFilterUpdate(event) {
    const { action, type, item, success, message } = event.detail;
    if (success) {
      addLog(`✅ ${type} ${action}: ${item || message}`);
    } else {
      addLog(`❌ ${message}`, 'error');
    }
  }
</script>

<div class="wigle-to-tak">
  <!-- Header -->
  <header class="app-header">
    <h1>WigleToTAK Interface</h1>
    <StatusPanel {status} />
  </header>
  
  <div class="app-content">
    <!-- Left Column - Settings -->
    <div class="settings-column">
      <TAKSettings 
        takServerIp={status.takServerIp}
        takServerPort={status.takServerPort}
        on:update={handleTAKUpdate}
      />
      
      <AntennaSettings 
        antennaSensitivity={status.antennaSensitivity}
        on:update={handleAntennaUpdate}
      />
      
      <div class="analysis-mode">
        <h2>Analysis Mode</h2>
        <div class="mode-toggle">
          <button 
            class="mode-btn"
            class:active={status.analysisMode === 'realtime'}
            on:click={() => {
              status.analysisMode = 'realtime';
              // Update server
              fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisMode: 'realtime' })
              });
              addLog('🔄 Analysis mode: Real-time');
            }}
          >
            Real-time
          </button>
          <button 
            class="mode-btn"
            class:active={status.analysisMode === 'postcollection'}
            on:click={() => {
              status.analysisMode = 'postcollection';
              // Update server
              fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisMode: 'postcollection' })
              });
              addLog('🔄 Analysis mode: Post-collection');
            }}
          >
            Post-collection
          </button>
        </div>
      </div>
      
      <FilterManager on:update={handleFilterUpdate} />
    </div>
    
    <!-- Right Column - File Management -->
    <div class="file-column">
      <FileManager 
        broadcasting={status.broadcasting}
        on:start={handleBroadcastStart}
        on:stop={handleBroadcastStop}
        on:log={(e) => addLog(e.detail.message, e.detail.type)}
      />
      
      <div class="instructions">
        <h2>Instructions</h2>
        <ol>
          <li>Configure TAK server settings</li>
          <li>Select antenna sensitivity profile</li>
          <li>Choose analysis mode (real-time or post-collection)</li>
          <li>Browse to directory containing .wiglecsv files</li>
          <li>Select a file and start broadcasting</li>
          <li>WiFi devices will appear as markers in TAK</li>
        </ol>
      </div>
    </div>
  </div>
  
  <!-- Log Output -->
  <div class="log-section">
    <h3>System Log</h3>
    <LogOutput {logs} />
  </div>
</div>

<style>
  .wigle-to-tak {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--bg-primary);
  }
  
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }
  
  .app-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--text-highlight);
  }
  
  .app-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 2rem;
  }
  
  .settings-column,
  .file-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .analysis-mode {
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 1.5rem;
    border-radius: 4px;
  }
  
  .analysis-mode h2 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--text-highlight);
  }
  
  .mode-toggle {
    display: flex;
    gap: 0.5rem;
  }
  
  .mode-btn {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .mode-btn:hover {
    background-color: var(--bg-hover);
    border-color: var(--accent-color);
  }
  
  .mode-btn.active {
    background-color: var(--accent-color);
    color: var(--bg-primary);
    border-color: var(--accent-color);
    font-weight: bold;
  }
  
  .instructions {
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 1.5rem;
    border-radius: 4px;
  }
  
  .instructions h2 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--text-highlight);
  }
  
  .instructions ol {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  
  .instructions li {
    margin-bottom: 0.5rem;
  }
  
  .log-section {
    height: 200px;
    background-color: var(--bg-panel);
    border-top: 1px solid var(--border-color);
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
  }
  
  .log-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--text-highlight);
  }
  
  /* Responsive Design */
  @media (max-width: 1024px) {
    .app-content {
      grid-template-columns: 1fr;
    }
  }
  
  @media (max-width: 768px) {
    .app-header {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }
    
    .app-content {
      padding: 1rem;
      gap: 1rem;
    }
  }
</style>