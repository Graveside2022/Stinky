<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/forms/Select.svelte';
  import NeonGlow from '$lib/components/effects/NeonGlow.svelte';
  
  // Settings state
  let kismetHost = 'localhost';
  let kismetPort = '2501';
  let gpsPort = '2947';
  let takServer = '';
  let takPort = '6969';
  let sdrDevice = 'hackrf';
  
  const sdrOptions = [
    { value: 'hackrf', label: 'HackRF One' },
    { value: 'rtlsdr', label: 'RTL-SDR' },
    { value: 'airspy', label: 'Airspy' },
    { value: 'none', label: 'No SDR Device' }
  ];
  
  function handleSave() {
    // Save settings logic here
    console.log('Saving settings...');
  }
</script>

<div class="container">
  <div class="page-header">
    <h1 class="page-title">
      <NeonGlow>System Settings</NeonGlow>
    </h1>
    <p class="page-subtitle">Configure your Stinkster system components</p>
  </div>
  
  <div class="settings-grid">
    <!-- Kismet Settings -->
    <Card>
      <h2 slot="header" class="section-title">Kismet Configuration</h2>
      <div class="settings-section">
        <div class="form-group">
          <label for="kismet-host">Kismet Host</label>
          <Input id="kismet-host" bind:value={kismetHost} placeholder="localhost" />
        </div>
        
        <div class="form-group">
          <label for="kismet-port">Kismet Port</label>
          <Input id="kismet-port" bind:value={kismetPort} type="number" placeholder="2501" />
        </div>
      </div>
    </Card>
    
    <!-- GPS Settings -->
    <Card>
      <h2 slot="header" class="section-title">GPS Configuration</h2>
      <div class="settings-section">
        <div class="form-group">
          <label for="gps-port">GPSD Port</label>
          <Input id="gps-port" bind:value={gpsPort} type="number" placeholder="2947" />
        </div>
        
        <div class="status-row">
          <span class="status-label">GPS Status:</span>
          <span class="status-value active">Connected (12 satellites)</span>
        </div>
      </div>
    </Card>
    
    <!-- TAK Settings -->
    <Card>
      <h2 slot="header" class="section-title">TAK Integration</h2>
      <div class="settings-section">
        <div class="form-group">
          <label for="tak-server">TAK Server</label>
          <Input id="tak-server" bind:value={takServer} placeholder="tak.example.com" />
        </div>
        
        <div class="form-group">
          <label for="tak-port">TAK Port</label>
          <Input id="tak-port" bind:value={takPort} type="number" placeholder="6969" />
        </div>
      </div>
    </Card>
    
    <!-- SDR Settings -->
    <Card>
      <h2 slot="header" class="section-title">SDR Configuration</h2>
      <div class="settings-section">
        <div class="form-group">
          <label for="sdr-device">SDR Device</label>
          <Select id="sdr-device" bind:value={sdrDevice} options={sdrOptions} />
        </div>
        
        <div class="status-row">
          <span class="status-label">Device Status:</span>
          <span class="status-value inactive">Not Connected</span>
        </div>
      </div>
    </Card>
  </div>
  
  <!-- Save Button -->
  <div class="actions">
    <Button variant="primary" size="large" on:click={handleSave}>
      Save Settings
    </Button>
  </div>
</div>

<style>
  .page-header {
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }
  
  .page-subtitle {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
  
  .settings-grid {
    display: grid;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  @media (min-width: 768px) {
    .settings-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #00ff7f;
  }
  
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }
  
  .status-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .status-value {
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .status-value.active {
    color: #00ff7f;
  }
  
  .status-value.inactive {
    color: #ff6b6b;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    margin-top: 3rem;
  }
</style>