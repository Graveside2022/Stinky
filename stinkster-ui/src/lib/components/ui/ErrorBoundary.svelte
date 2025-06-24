<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let title: string = 'Application Error'
  export let showDetails: boolean = false
  export let error: Error | null = null
  
  const dispatch = createEventDispatcher()
  
  function retry() {
    dispatch('retry')
  }
  
  function reload() {
    window.location.reload()
  }
  
  function toggleDetails() {
    showDetails = !showDetails
  }
</script>

<div class="error-boundary">
  <div class="error-content">
    <div class="error-icon">⚠</div>
    <h2 class="error-title">{title}</h2>
    
    {#if error}
      <p class="error-message">{error.message}</p>
      
      <div class="error-actions">
        <button class="error-button primary" on:click={retry}>
          Retry
        </button>
        <button class="error-button secondary" on:click={reload}>
          Reload Page
        </button>
        <button class="error-button ghost" on:click={toggleDetails}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {#if showDetails && error.stack}
        <details class="error-details">
          <summary>Error Details</summary>
          <pre class="error-stack">{error.stack}</pre>
        </details>
      {/if}
    {:else}
      <p class="error-message">An unexpected error occurred. Please try refreshing the page.</p>
      <div class="error-actions">
        <button class="error-button primary" on:click={reload}>
          Reload Page
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .error-boundary {
    min-height: 100vh;
    background: #030610;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d0d8f0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .error-content {
    text-align: center;
    max-width: 500px;
    padding: 32px;
    background: rgba(12, 22, 48, 0.95);
    border: 1px solid rgba(255, 68, 68, 0.3);
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }
  
  .error-icon {
    font-size: 48px;
    color: #ff4444;
    margin-bottom: 16px;
  }
  
  .error-title {
    color: #ff4444;
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 16px 0;
  }
  
  .error-message {
    color: rgba(208, 216, 240, 0.8);
    font-size: 16px;
    line-height: 1.5;
    margin: 0 0 24px 0;
  }
  
  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  
  .error-button {
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid;
  }
  
  .error-button.primary {
    background: rgba(0, 220, 255, 0.1);
    border-color: #00d2ff;
    color: #00d2ff;
  }
  
  .error-button.primary:hover {
    background: rgba(0, 220, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 220, 255, 0.3);
  }
  
  .error-button.secondary {
    background: rgba(255, 68, 68, 0.1);
    border-color: #ff4444;
    color: #ff4444;
  }
  
  .error-button.secondary:hover {
    background: rgba(255, 68, 68, 0.2);
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
  }
  
  .error-button.ghost {
    background: transparent;
    border-color: rgba(208, 216, 240, 0.3);
    color: rgba(208, 216, 240, 0.8);
  }
  
  .error-button.ghost:hover {
    background: rgba(208, 216, 240, 0.05);
    border-color: rgba(208, 216, 240, 0.5);
  }
  
  .error-details {
    text-align: left;
    margin-top: 16px;
  }
  
  .error-details summary {
    cursor: pointer;
    color: rgba(208, 216, 240, 0.8);
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .error-stack {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(208, 216, 240, 0.2);
    border-radius: 4px;
    padding: 12px;
    font-size: 12px;
    color: rgba(208, 216, 240, 0.7);
    white-space: pre-wrap;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }
</style>