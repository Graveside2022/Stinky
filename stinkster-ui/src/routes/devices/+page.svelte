<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import EmptyState from '$lib/components/feedback/EmptyState.svelte';
  import StatusBadge from '$lib/components/display/StatusBadge.svelte';
  
  // Mock data for demonstration
  const devices = [
    { id: 1, name: 'Unknown Device', mac: 'AA:BB:CC:DD:EE:FF', signal: -45, lastSeen: '2 min ago', status: 'active' },
    { id: 2, name: 'iPhone 12', mac: '11:22:33:44:55:66', signal: -72, lastSeen: '5 min ago', status: 'idle' },
    { id: 3, name: 'Router AP', mac: '00:11:22:33:44:55', signal: -38, lastSeen: 'Just now', status: 'active' }
  ];
</script>

<div class="container">
  <div class="page-header">
    <h1 class="page-title">Tracked Devices</h1>
    <p class="page-subtitle">WiFi and Bluetooth devices detected in your area</p>
  </div>
  
  {#if devices.length > 0}
    <div class="devices-grid">
      {#each devices as device}
        <Card>
          <div class="device-card">
            <div class="device-header">
              <h3 class="device-name">{device.name}</h3>
              <StatusBadge status={device.status} />
            </div>
            
            <div class="device-details">
              <div class="detail-row">
                <span class="detail-label">MAC Address</span>
                <span class="detail-value">{device.mac}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Signal</span>
                <span class="detail-value signal" class:strong={device.signal > -50} class:weak={device.signal < -70}>
                  {device.signal} dBm
                </span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Last Seen</span>
                <span class="detail-value">{device.lastSeen}</span>
              </div>
            </div>
            
            <div class="device-actions">
              <Button size="small" variant="ghost">Details</Button>
              <Button size="small" variant="ghost">Track</Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {:else}
    <Card>
      <EmptyState
        icon="📱"
        title="No Devices Found"
        description="Start scanning to detect WiFi and Bluetooth devices in your area."
      >
        <Button variant="primary">Start Scanning</Button>
      </EmptyState>
    </Card>
  {/if}
</div>

<style>
  .page-header {
    margin-bottom: 2rem;
  }
  
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: #00ff7f;
  }
  
  .page-subtitle {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
  
  .devices-grid {
    display: grid;
    gap: 1.5rem;
  }
  
  @media (min-width: 768px) {
    .devices-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (min-width: 1024px) {
    .devices-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  .device-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .device-name {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }
  
  .device-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }
  
  .detail-label {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .detail-value {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }
  
  .signal.strong {
    color: #00ff7f;
  }
  
  .signal.weak {
    color: #ff6b6b;
  }
  
  .device-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>