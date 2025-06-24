<script>
  import { onMount, onDestroy } from 'svelte';
  import { spectrumStore, signalsStore } from './stores/spectrum';
  import { createWebSocket } from '../../lib/stores/websocket';
  import SpectrumPlot from './components/SpectrumPlot.svelte';
  import SignalsList from './components/SignalsList.svelte';
  import StatusPanel from './components/StatusPanel.svelte';
  import ProfileSelector from './components/ProfileSelector.svelte';
  import LogOutput from './components/LogOutput.svelte';

  // Create WebSocket connection
  const ws = createWebSocket('/spectrum', {
    useSocketIO: true,
    socketIOOptions: {
      transports: ['websocket']
    }
  });

  let isScanning = false;
  let selectedProfile = 'vhf';
  let logs = [];

  onMount(() => {
    // Connect WebSocket
    ws.connect();
    
    // Set up event handlers
    ws.on('fftData', handleFFTData);
    ws.on('status', handleStatus);
    ws.on('signalsDetected', handleSignalsDetected);
    ws.on('error', handleError);
    
    // Initial status refresh
    refreshStatus();
    
    // Periodic status updates
    const interval = setInterval(refreshStatus, 5000);
    
    return () => {
      clearInterval(interval);
    };
  });

  onDestroy(() => {
    ws.disconnect();
  });

  function handleFFTData(data) {
    spectrumStore.updateFFTData(data);
    addLog(`📡 FFT data received: ${data.data.length} bins @ ${(data.center_freq/1e6).toFixed(3)} MHz`);
  }

  function handleStatus(data) {
    spectrumStore.updateStatus(data);
    addLog(`📊 Status update: OpenWebRX=${data.connected ? 'Connected' : 'Disconnected'}`);
  }

  function handleSignalsDetected(data) {
    signalsStore.set(data.signals || []);
    addLog(`🔍 Signals detected: ${data.signals.length}`);
  }

  function handleError(error) {
    addLog(`❌ Error: ${error.message || error}`, 'error');
  }

  async function refreshStatus() {
    try {
      const response = await fetch('/api/status');
      const status = await response.json();
      spectrumStore.updateStatus(status);
    } catch (error) {
      addLog(`❌ Status error: ${error.message}`, 'error');
    }
  }

  async function startScan() {
    if (isScanning) return;
    
    isScanning = true;
    addLog(`🔍 Starting scan with profile: ${selectedProfile}`);

    try {
      const response = await fetch(`/api/signals?profile=${selectedProfile}`);
      const result = await response.json();

      signalsStore.set(result.signals || []);
      addLog(`✅ Scan complete: Found ${(result.signals || []).length} signals (${result.real_data ? 'REAL' : 'DEMO'} data)`);
    } catch (error) {
      addLog(`❌ Scan error: ${error.message}`, 'error');
    } finally {
      isScanning = false;
    }
  }

  async function connectToOpenWebRX() {
    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `ws://${window.location.hostname}:8073/ws`
        }),
      });

      const result = await response.json();
      addLog(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    } catch (error) {
      addLog(`❌ Connection error: ${error.message}`, 'error');
    }
  }

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    logs = [...logs, { timestamp, message, type }].slice(-100); // Keep last 100 logs
  }

  function handleProfileChange(event) {
    selectedProfile = event.detail.profile;
    addLog(`🎯 Selected profile: ${event.detail.name}`);
  }
</script>

<div class="spectrum-analyzer">
  <!-- Header Section -->
  <header class="analyzer-header">
    <h1>HackRF Spectrum Analyzer</h1>
    <StatusPanel />
  </header>

  <!-- Control Section -->
  <section class="controls-section">
    <ProfileSelector 
      {selectedProfile} 
      on:change={handleProfileChange} 
    />
    
    <div class="control-buttons">
      <button 
        on:click={startScan} 
        disabled={isScanning}
        class="btn btn-primary"
      >
        {isScanning ? 'Scanning...' : 'Start Scan'}
      </button>
      
      <button 
        on:click={refreshStatus}
        class="btn btn-secondary"
      >
        Refresh Status
      </button>
      
      <button 
        on:click={connectToOpenWebRX}
        class="btn btn-secondary"
      >
        Connect to OpenWebRX
      </button>
    </div>
  </section>

  <!-- Main Content -->
  <div class="main-content">
    <!-- Spectrum Plot -->
    <section class="spectrum-section">
      <SpectrumPlot />
    </section>

    <!-- Signals List -->
    <section class="signals-section">
      <h2>Detected Signals</h2>
      <SignalsList />
    </section>
  </div>

  <!-- Log Output -->
  <section class="log-section">
    <h3>System Log</h3>
    <LogOutput {logs} />
  </section>
</div>

<style>
  .spectrum-analyzer {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary, #1a1a1a);
    color: var(--text-primary, #e0e0e0);
    font-family: var(--font-mono, 'Fira Code', monospace);
  }

  .analyzer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: var(--bg-secondary, #272727);
    border-bottom: 1px solid var(--border-color, #444);
  }

  .analyzer-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-highlight, #00ff41);
  }

  .controls-section {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--bg-panel, #1f1f1f);
    border-bottom: 1px solid var(--border-color, #444);
    align-items: center;
    flex-wrap: wrap;
  }

  .control-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #444);
    background-color: var(--bg-secondary, #272727);
    color: var(--text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn:hover:not(:disabled) {
    background-color: var(--bg-hover, #333);
    border-color: var(--accent-color, #00ff41);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    border-color: var(--accent-color, #00ff41);
    color: var(--accent-color, #00ff41);
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--accent-color, #00ff41);
    color: var(--bg-primary, #1a1a1a);
  }

  .main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 1rem;
    padding: 1rem;
    overflow: hidden;
  }

  .spectrum-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .signals-section {
    display: flex;
    flex-direction: column;
    background-color: var(--bg-panel, #1f1f1f);
    border: 1px solid var(--border-color, #444);
    padding: 1rem;
    overflow: hidden;
  }

  .signals-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--text-highlight, #00ff41);
  }

  .log-section {
    height: 200px;
    background-color: var(--bg-panel, #1f1f1f);
    border-top: 1px solid var(--border-color, #444);
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }

  .log-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--text-highlight, #00ff41);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .main-content {
      grid-template-columns: 1fr;
    }

    .signals-section {
      max-height: 300px;
    }
  }

  @media (max-width: 768px) {
    .analyzer-header {
      flex-direction: column;
      gap: 1rem;
    }

    .controls-section {
      flex-direction: column;
      align-items: stretch;
    }

    .control-buttons {
      flex-direction: column;
    }
  }
</style>