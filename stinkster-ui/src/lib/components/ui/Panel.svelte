<script lang="ts">
  export let title: string = ''
  export let minimizable: boolean = true
  export let minimized: boolean = false
  export let className: string = ''
  
  function toggleMinimize() {
    if (minimizable) {
      minimized = !minimized
    }
  }
</script>

<div class="grid-item {className}" class:minimized>
  {#if title}
    <div class="box-header">
      <h3 class="text-[#d0d8f0] font-medium">{title}</h3>
      {#if minimizable}
        <div class="box-controls">
          <button 
            class="control-button-small"
            on:click={toggleMinimize}
            aria-label={minimized ? 'Expand panel' : 'Minimize panel'}
          >
            {minimized ? '▲' : '▼'}
          </button>
        </div>
      {/if}
    </div>
  {/if}
  
  {#if !minimized}
    <div class="grid-item-content">
      <slot />
    </div>
  {/if}
</div>

<style>
  .grid-item {
    background: rgba(12, 22, 48, 0.95);
    border: 1px solid rgba(0, 190, 215, 0.35);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .grid-item.minimized {
    height: auto;
  }
  
  .box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(12, 22, 48, 0.85);
    border-bottom: 1px solid rgba(0, 190, 215, 0.25);
  }
  
  .box-controls {
    display: flex;
    gap: 8px;
  }
  
  .control-button-small {
    background: rgba(0, 220, 255, 0.1);
    border: 1px solid rgba(0, 220, 255, 0.3);
    color: #00d2ff;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .control-button-small:hover {
    background: rgba(0, 220, 255, 0.2);
    box-shadow: 0 0 20px rgba(0, 220, 255, 0.5);
  }
  
  .grid-item-content {
    padding: 16px;
  }
</style>