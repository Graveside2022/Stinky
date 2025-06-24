<script lang="ts">
  interface Props {
    title: string
    variant?: 'default' | 'glass' | 'bordered'
    collapsible?: boolean
    defaultExpanded?: boolean
    children: any
  }
  
  let { 
    title, 
    variant = 'glass',
    collapsible = false,
    defaultExpanded = true,
    children 
  }: Props = $props()
  
  let expanded = $state(defaultExpanded)
  
  function toggleExpanded() {
    if (collapsible) {
      expanded = !expanded
    }
  }
</script>

<div class="control-section control-section--{variant}" class:collapsible>
  <button 
    class="section-header" 
    onclick={toggleExpanded}
    disabled={!collapsible}
    type="button"
  >
    <h3 class="section-title">{title}</h3>
    {#if collapsible}
      <svg 
        class="chevron" 
        class:expanded
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    {/if}
  </button>
  
  {#if expanded}
    <div class="section-content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .control-section {
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .control-section--default {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .control-section--glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  }
  
  .control-section--bordered {
    background: transparent;
    border: 2px solid rgba(0, 255, 170, 0.3);
  }
  
  .section-header {
    width: 100%;
    padding: 16px 20px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: default;
    text-align: left;
    transition: background-color 0.2s ease;
  }
  
  .collapsible .section-header {
    cursor: pointer;
  }
  
  .collapsible .section-header:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .section-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: rgba(0, 255, 170, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .chevron {
    color: rgba(255, 255, 255, 0.6);
    transition: transform 0.3s ease;
  }
  
  .chevron.expanded {
    transform: rotate(180deg);
  }
  
  .section-content {
    padding: 0 20px 20px;
    animation: slideDown 0.3s ease;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>