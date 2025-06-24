<script>
  import { spectrumStore } from '../stores/spectrum';
  
  $: status = $spectrumStore.status;
  $: config = $spectrumStore.config;
  $: isConnected = status?.connected || false;
  $: isRealData = isConnected && (status?.buffer_size || 0) > 0;
</script>

<div class="status-panel">
  <div class="mode-indicator" class:real-data={isRealData} class:demo={!isRealData}>
    {isRealData ? 'REAL DATA MODE - Live HackRF Data' : 'DEMO MODE - No real data'}
  </div>
  
  <div class="status-grid">
    <div class="status-item">
      <span class="label">OpenWebRX:</span>
      <span class="value" class:connected={isConnected} class:disconnected={!isConnected}>
        {isConnected ? 'Connected ✅' : 'Disconnected ❌'}
      </span>
    </div>
    
    <div class="status-item">
      <span class="label">FFT Buffer:</span>
      <span class="value">{status?.buffer_size || 0}</span>
    </div>
    
    <div class="status-item">
      <span class="label">Center Freq:</span>
      <span class="value">
        {config?.center_freq ? `${(config.center_freq / 1e6).toFixed(3)} MHz` : 'N/A'}
      </span>
    </div>
    
    <div class="status-item">
      <span class="label">Sample Rate:</span>
      <span class="value">
        {config?.samp_rate ? `${(config.samp_rate / 1e6).toFixed(3)} MHz` : 'N/A'}
      </span>
    </div>
  </div>
</div>

<style>
  .status-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mode-indicator {
    padding: 0.5rem 1rem;
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 2px solid;
    transition: all 0.3s;
  }

  .mode-indicator.real-data {
    background-color: rgba(0, 255, 65, 0.1);
    border-color: var(--accent-color, #00ff41);
    color: var(--accent-color, #00ff41);
  }

  .mode-indicator.demo {
    background-color: rgba(255, 184, 0, 0.1);
    border-color: #ffb800;
    color: #ffb800;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background-color: var(--bg-panel, #1f1f1f);
    border: 1px solid var(--border-color, #444);
    font-size: 0.875rem;
  }

  .label {
    color: var(--text-secondary, #a0a0a0);
    font-weight: 500;
  }

  .value {
    color: var(--text-primary, #e0e0e0);
    font-family: var(--font-mono, monospace);
  }

  .value.connected {
    color: var(--accent-color, #00ff41);
  }

  .value.disconnected {
    color: #ff4444;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .status-grid {
      grid-template-columns: 1fr;
    }
  }
</style>