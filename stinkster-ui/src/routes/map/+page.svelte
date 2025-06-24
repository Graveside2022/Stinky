<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/feedback/EmptyState.svelte';
  import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="container">
  <div class="page-header">
    <h1 class="page-title">Live Map</h1>
    <p class="page-subtitle">Real-time GPS tracking and device locations</p>
  </div>
  
  <Card>
    <div class="map-container">
      <EmptyState
        icon="🗺️"
        title="Map View"
        description="The interactive map will display GPS location and tracked devices. TAK integration coming soon."
      >
        <Button variant="primary">Configure GPS</Button>
      </EmptyState>
    </div>
  </Card>
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
  
  .map-container {
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>