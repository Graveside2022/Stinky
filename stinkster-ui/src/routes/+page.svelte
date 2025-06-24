<script lang="ts">
  import StatusPanel from '$lib/components/StatusPanel.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import MetricCard from '$lib/components/display/MetricCard.svelte';
  import NeonGlow from '$lib/components/effects/NeonGlow.svelte';
  
  // Quick stats for the dashboard
  const stats = [
    { label: 'Active Devices', value: '127', trend: 'up' },
    { label: 'Signal Strength', value: '-45 dBm', trend: 'stable' },
    { label: 'Scan Rate', value: '2.4 GHz', trend: 'stable' },
    { label: 'GPS Lock', value: '12 sats', trend: 'up' }
  ];
</script>

<div class="container">
  <div class="dashboard">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">
        <NeonGlow>System Dashboard</NeonGlow>
      </h1>
      <p class="page-subtitle">Real-time monitoring and control center</p>
    </div>
    
    <!-- Quick Stats Grid -->
    <div class="stats-grid">
      {#each stats as stat}
        <MetricCard
          label={stat.label}
          value={stat.value}
          trend={stat.trend}
        />
      {/each}
    </div>
    
    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Status Panel -->
      <div class="panel-section">
        <Card>
          <h2 slot="header">System Status</h2>
          <StatusPanel />
        </Card>
      </div>
      
      <!-- Quick Actions -->
      <div class="panel-section">
        <Card>
          <h2 slot="header">Quick Actions</h2>
          <div class="quick-actions">
            <a href="/kismet" class="action-card">
              <span class="action-icon">📡</span>
              <span class="action-label">Open Kismet</span>
              <span class="action-description">WiFi scanning interface</span>
            </a>
            
            <a href="/spectrum" class="action-card">
              <span class="action-icon">📈</span>
              <span class="action-label">Spectrum Analyzer</span>
              <span class="action-description">Real-time RF analysis</span>
            </a>
            
            <a href="/devices" class="action-card">
              <span class="action-icon">📱</span>
              <span class="action-label">Device List</span>
              <span class="action-description">Tracked devices</span>
            </a>
            
            <a href="/map" class="action-card">
              <span class="action-icon">🗺️</span>
              <span class="action-label">Live Map</span>
              <span class="action-description">GPS & device locations</span>
            </a>
          </div>
        </Card>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .page-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }
  
  @media (min-width: 768px) {
    .page-title {
      font-size: 3rem;
    }
  }
  
  .page-subtitle {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
  
  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  @media (min-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  
  /* Content Grid */
  .content-grid {
    display: grid;
    gap: 2rem;
  }
  
  @media (min-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  .panel-section {
    min-height: 400px;
  }
  
  /* Quick Actions */
  .quick-actions {
    display: grid;
    gap: 1rem;
  }
  
  @media (min-width: 640px) {
    .quick-actions {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  .action-card {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .action-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 255, 127, 0.1) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .action-card:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 255, 127, 0.2);
    box-shadow: 0 4px 20px rgba(0, 255, 127, 0.1);
  }
  
  .action-card:hover::before {
    opacity: 1;
  }
  
  .action-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
  
  .action-label {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  
  .action-description {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* Card header styling */
  :global(.panel-section h2) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #00ff7f;
  }
</style>