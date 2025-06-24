<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let tabs: Array<{
    id: string
    label: string
    href?: string
    target?: string
    active?: boolean
  }> = []
  
  export let activeTab: string = ''
  
  const dispatch = createEventDispatcher()
  
  function handleTabClick(tab: typeof tabs[0], event: Event) {
    if (tab.href) {
      // Let the default link behavior handle it
      return
    }
    
    event.preventDefault()
    activeTab = tab.id
    dispatch('tab-change', { tabId: tab.id, tab })
  }
</script>

<div class="tab-nav">
  {#each tabs as tab}
    {#if tab.href}
      <a 
        href={tab.href} 
        target={tab.target || '_self'}
        class="tab-button"
        class:active-tab={tab.active || tab.id === activeTab}
        on:click={(e) => handleTabClick(tab, e)}
      >
        {tab.label}
      </a>
    {:else}
      <button 
        class="tab-button"
        class:active-tab={tab.active || tab.id === activeTab}
        on:click={(e) => handleTabClick(tab, e)}
      >
        {tab.label}
      </button>
    {/if}
  {/each}
</div>

<style>
  .tab-nav {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
  }

  .tab-button {
    background: linear-gradient(90deg, var(--bg-tertiary) 0%, transparent 100%);
    border: 1px solid var(--border-secondary);
    border-radius: 0;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    padding: 8px 12px;
    text-align: left;
    text-decoration: none;
    text-transform: uppercase;
    transition: all 0.2s ease;
    display: block;
    width: 100%;
    margin-bottom: 2px;
  }

  .tab-button:hover {
    background: linear-gradient(90deg, var(--accent-primary) 0%, var(--bg-tertiary) 100%);
    border-color: var(--accent-primary);
    color: var(--text-primary);
    transform: translateX(3px);
    box-shadow: 0 0 15px rgba(0, 210, 255, 0.4);
  }

  .tab-button:active {
    transform: translateX(1px);
  }

  .tab-button.active-tab {
    background: linear-gradient(90deg, var(--accent-primary) 0%, var(--bg-secondary) 100%);
    border-color: var(--accent-primary);
    color: var(--text-primary);
    font-weight: 700;
    box-shadow: var(--glow-primary);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .tab-nav {
      flex-direction: row;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      gap: 5px;
    }
    
    .tab-button {
      flex: 0 0 auto;
      min-width: 80px;
      padding: 6px 10px;
      margin-bottom: 0;
      text-align: center;
    }
  }

  /* Custom scrollbar for webkit browsers */
  @media (max-width: 768px) {
    .tab-nav::-webkit-scrollbar {
      height: 3px;
    }

    .tab-nav::-webkit-scrollbar-track {
      background: var(--bg-tertiary);
    }

    .tab-nav::-webkit-scrollbar-thumb {
      background: var(--border-primary);
      border-radius: 2px;
    }

    .tab-nav::-webkit-scrollbar-thumb:hover {
      background: var(--accent-primary);
    }
  }
</style>