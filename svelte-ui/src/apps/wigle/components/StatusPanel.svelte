<script>
  export let status = {};
  
  $: isActive = status.broadcasting;
  $: serverInfo = `${status.takServerIp || '0.0.0.0'}:${status.takServerPort || 6969}`;
</script>

<div class="status-panel">
  <div class="status-item">
    <span class="label">Service:</span>
    <span class="value success">Running</span>
  </div>
  
  <div class="status-item">
    <span class="label">Broadcasting:</span>
    <span class="value" class:active={isActive} class:inactive={!isActive}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  </div>
  
  <div class="status-item">
    <span class="label">TAK Server:</span>
    <span class="value">{serverInfo}</span>
  </div>
  
  <div class="status-item">
    <span class="label">Mode:</span>
    <span class="value">{status.analysisMode || 'realtime'}</span>
  </div>
</div>

<style>
  .status-panel {
    display: flex;
    gap: 2rem;
    align-items: center;
  }
  
  .status-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .label {
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .value {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .value.success {
    color: var(--accent-color);
  }
  
  .value.active {
    color: var(--accent-color);
  }
  
  .value.inactive {
    color: var(--warning-color);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .status-panel {
      flex-wrap: wrap;
      gap: 1rem;
    }
  }
</style>