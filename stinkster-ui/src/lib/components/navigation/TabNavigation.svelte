<script lang="ts">
  export let tabs: Array<{
    id: string
    label: string
    href?: string
    active?: boolean
    target?: string
  }> = []
  
  export let activeTab: string = ''
  
  function handleTabClick(tabId: string, href?: string) {
    if (!href) {
      activeTab = tabId
    }
  }
</script>

<div class="tab-nav">
  {#each tabs as tab}
    <a 
      href={tab.href || '#'}
      target={tab.target || '_self'}
      class="tab-button"
      class:active-tab={tab.active || tab.id === activeTab}
      on:click={() => handleTabClick(tab.id, tab.href)}
      aria-current={tab.active || tab.id === activeTab ? 'page' : undefined}
    >
      {tab.label}
    </a>
  {/each}
</div>

<style>
  .tab-nav {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .tab-button {
    padding: 8px 16px;
    background: rgba(12, 22, 48, 0.65);
    border: 1px solid rgba(0, 190, 215, 0.25);
    border-radius: 6px;
    color: rgba(0, 220, 255, 0.8);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .tab-button:hover {
    background: rgba(12, 22, 48, 0.85);
    border-color: rgba(0, 190, 215, 0.5);
    color: #00d2ff;
  }
  
  .tab-button.active-tab {
    background: rgba(0, 220, 255, 0.1);
    border-color: #00d2ff;
    color: #00d2ff;
    box-shadow: 0 0 20px rgba(0, 220, 255, 0.3);
  }
</style>