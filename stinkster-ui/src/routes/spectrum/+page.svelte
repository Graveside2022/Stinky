<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import EmptyState from '$lib/components/feedback/EmptyState.svelte';
  import NeonGlow from '$lib/components/effects/NeonGlow.svelte';
</script>

<div class="container">
  <div class="page-header">
    <h1 class="page-title">
      <NeonGlow>Spectrum Analyzer</NeonGlow>
    </h1>
    <p class="page-subtitle">Real-time RF spectrum analysis and SDR control</p>
  </div>
  
  <Card>
    <EmptyState
      icon="📈"
      title="Spectrum Analyzer"
      description="The spectrum analyzer interface will be available here. Connect your HackRF or compatible SDR device to begin."
    >
      <Button variant="primary" href="/settings">
        Configure SDR Settings
      </Button>
    </EmptyState>
  </Card>
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
</style>