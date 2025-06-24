<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let title: string
  export let minimizable = true
  export let expandable = false
  export let isMinimized = false
  export let id = ''
  
  const dispatch = createEventDispatcher()
  
  function handleMinimize() {
    isMinimized = !isMinimized
    dispatch('minimize', { id, minimized: isMinimized })
  }
  
  function handleExpand() {
    dispatch('expand', { id })
  }
</script>

<div class="grid-item" class:minimized={isMinimized} {id}>
  <div class="box-header">
    <h2>{title}</h2>
    <div class="box-controls">
      {#if expandable}
        <button class="control-button-small" data-action="expand" on:click={handleExpand}>
          ⛶
        </button>
      {/if}
      {#if minimizable}
        <button class="control-button-small" data-action="minimize" on:click={handleMinimize}>
          {isMinimized ? '▲' : '▼'}
        </button>
      {/if}
    </div>
  </div>
  
  {#if !isMinimized}
    <div class="grid-item-content">
      <slot />
    </div>
  {/if}
</div>

<style>
  .grid-item {
    background-color: var(--bg-secondary);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-md);
    border-radius: 0;
    padding: 0;
    position: relative;
    transition: all 0.3s ease;
    overflow: hidden;
    min-height: 120px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .grid-item.minimized {
    min-height: 60px;
    height: 60px;
  }

  .grid-item:hover {
    border-color: var(--accent-primary);
    box-shadow: var(--glow-primary);
  }

  .box-header {
    background: linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
    border-bottom: 1px solid var(--border-secondary);
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
    user-select: none;
    min-height: 40px;
    flex-shrink: 0;
  }

  .box-header:active {
    cursor: grabbing;
  }

  .box-header h2 {
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-shadow: 0 0 5px rgba(0, 210, 255, 0.3);
  }

  .box-controls {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .control-button-small {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 2px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 10px;
    height: 20px;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
  }

  .control-button-small:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    box-shadow: 0 0 8px rgba(0, 210, 255, 0.4);
  }

  .control-button-small:active {
    transform: scale(0.9);
  }

  .grid-item-content {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.4;
  }

  /* Custom scrollbar for webkit browsers */
  .grid-item-content::-webkit-scrollbar {
    width: 6px;
  }

  .grid-item-content::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
  }

  .grid-item-content::-webkit-scrollbar-thumb {
    background: var(--border-primary);
    border-radius: 3px;
  }

  .grid-item-content::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .grid-item {
      min-height: 150px;
      margin-bottom: 8px;
    }

    .box-header {
      cursor: default !important;
    }

    .box-header h2 {
      font-size: 0.9em;
    }

    .grid-item-content {
      padding: 8px;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .grid-item {
      min-height: 120px;
    }
  }
</style>