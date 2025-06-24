<script lang="ts">
  import StatusIndicator from './StatusIndicator.svelte'
  
  export let services: Array<{
    id: string
    name: string
    status: 'online' | 'offline' | 'warning' | 'error'
    description?: string
  }> = []
  
  export let title: string = 'Service Status'
</script>

<div class="service-status">
  {#if title}
    <h4 class="status-title">{title}</h4>
  {/if}
  
  <div class="status-list">
    {#each services as service}
      <div class="status-indicator">
        <StatusIndicator 
          status={service.status} 
          label={service.name}
          pulse={service.status === 'warning' || service.status === 'error'}
        />
        {#if service.description}
          <span class="status-description">{service.description}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .service-status {
    margin-top: 15px;
    padding: 15px 0;
    border-top: 1px solid rgba(0, 200, 220, 0.3);
    overflow: visible;
  }
  
  .status-title {
    color: #d0d8f0;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  
  .status-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 10px;
  }
  
  .status-description {
    color: rgba(0, 220, 255, 0.6);
    font-size: 12px;
    margin-left: auto;
  }
</style>