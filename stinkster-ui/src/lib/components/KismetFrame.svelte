<script lang="ts">
  import { onMount } from 'svelte';
  import { services, socketConnected } from '../stores/kismet.js';
  import Button from './ui/Button.svelte';
  import GlassPanel from './ui/GlassPanel.svelte';
  import LoadingSpinner from './feedback/LoadingSpinner.svelte';
  import StatusBadge from './display/StatusBadge.svelte';
  import Alert from './feedback/Alert.svelte';
  
  export let kismetUrl: string = 'http://localhost:2501';
  export let height: string = '600px';
  export let autoResize: boolean = true;
  export let title: string = 'Kismet Web Interface';
  
  let iframeElement: HTMLIFrameElement;
  let frameLoaded = false;
  let frameError = false;
  let isVisible = true;
  
  $: kismetRunning = $services?.kismet?.running || false;
  $: kismetPort = $services?.kismet?.port || 2501;
  $: effectiveUrl = `http://${window.location.hostname}:${kismetPort}`;
  
  onMount(() => {
    // Monitor iframe load status
    const handleLoad = () => {
      frameLoaded = true;
      frameError = false;
    };
    
    const handleError = () => {
      frameLoaded = false;
      frameError = true;
    };
    
    if (iframeElement) {
      iframeElement.addEventListener('load', handleLoad);
      iframeElement.addEventListener('error', handleError);
      
      return () => {
        iframeElement?.removeEventListener('load', handleLoad);
        iframeElement?.removeEventListener('error', handleError);
      };
    }
  });
  
  function reloadFrame() {
    if (iframeElement) {
      frameLoaded = false;
      frameError = false;
      iframeElement.src = iframeElement.src;
    }
  }
  
  function toggleVisibility() {
    isVisible = !isVisible;
  }
  
  function openInNewTab() {
    window.open(effectiveUrl, '_blank');
  }
</script>

<GlassPanel variant="primary" glow>
  <div class="frame-header">
    <h3 class="frame-title">{title}</h3>
    <div class="frame-controls">
      <Button 
        variant="ghost" 
        size="small"
        on:click={toggleVisibility}
        title={isVisible ? 'Hide Frame' : 'Show Frame'}
      >
        {isVisible ? '▼' : '▶'}
      </Button>
      <Button 
        variant="ghost" 
        size="small"
        on:click={reloadFrame}
        disabled={!kismetRunning}
        title="Reload Frame"
      >
        ↻
      </Button>
      <Button 
        variant="ghost" 
        size="small"
        on:click={openInNewTab}
        disabled={!kismetRunning}
        title="Open in New Tab"
      >
        ⧉
      </Button>
    </div>
  </div>
  
  {#if isVisible}
    <div class="frame-content" style="height: {height}">
      {#if !kismetRunning}
        <div class="frame-placeholder">
          <Alert type="warning">
            <h4>Kismet Service Not Running</h4>
            <p>Start the Kismet service to access the web interface.</p>
            <StatusBadge status={$socketConnected ? 'success' : 'error'}>
              Socket: {$socketConnected ? 'Connected' : 'Disconnected'}
            </StatusBadge>
          </Alert>
        </div>
      {:else if frameError}
        <div class="frame-placeholder">
          <Alert type="error">
            <h4>Failed to Load Kismet Interface</h4>
            <p>Unable to connect to Kismet at {effectiveUrl}</p>
            <Button variant="primary" on:click={reloadFrame}>
              Retry Connection
            </Button>
          </Alert>
        </div>
      {:else}
        <div class="iframe-wrapper">
          {#if !frameLoaded}
            <LoadingSpinner message="Loading Kismet Interface..." />
          {/if}
          
          <iframe
            bind:this={iframeElement}
            src={effectiveUrl}
            title="Kismet Web Interface"
            class="kismet-iframe"
            class:loaded={frameLoaded}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            loading="lazy"
          ></iframe>
        </div>
      {/if}
    </div>
  {/if}
</GlassPanel>

<style>
  .frame-title {
    color: var(--color-primary);
    text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5);
  }
  
  .frame-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .frame-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .frame-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  .frame-content {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  
  .iframe-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .kismet-iframe {
    width: 100%;
    height: 100%;
    border: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .kismet-iframe.loaded {
    opacity: 1;
  }
  
  
  .frame-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  :global(.frame-placeholder h4) {
    margin: 0 0 0.75rem 0;
    font-size: 1.25rem;
  }
  
  :global(.frame-placeholder p) {
    margin: 0 0 1rem 0;
  }
  
  
  @media (max-width: 768px) {
    .frame-header h3 {
      font-size: 1rem;
    }
  }
</style>