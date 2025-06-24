<script lang="ts">
  import KismetFrame from '$lib/components/KismetFrame.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import LoadingSpinner from '$lib/components/feedback/LoadingSpinner.svelte';
  import Alert from '$lib/components/feedback/Alert.svelte';
  import { onMount } from 'svelte';
  
  let isLoading = true;
  let hasError = false;
  
  onMount(() => {
    // Simulate loading
    setTimeout(() => {
      isLoading = false;
    }, 1000);
  });
</script>

<div class="container">
  <div class="page-header">
    <h1 class="page-title">Kismet Interface</h1>
    <p class="page-subtitle">Real-time WiFi monitoring and analysis</p>
  </div>
  
  {#if hasError}
    <Alert type="error">
      <strong>Connection Error:</strong> Unable to connect to Kismet server. Please check if Kismet is running on port 2501.
    </Alert>
  {:else if isLoading}
    <Card>
      <div class="loading-state">
        <LoadingSpinner size="large" />
        <p>Connecting to Kismet server...</p>
      </div>
    </Card>
  {:else}
    <KismetFrame />
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
  
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    gap: 1rem;
  }
  
  .loading-state p {
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
</style>