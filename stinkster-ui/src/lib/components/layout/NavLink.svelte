<script lang="ts">
  import { goto } from '$app/navigation';
  
  export let href: string = '/';
  export let active: boolean = false;
  export let icon: string = '';
  export let mobile: boolean = false;
  
  function handleClick(e: MouseEvent) {
    e.preventDefault();
    goto(href);
  }
</script>

{#if mobile}
  <!-- Mobile Variant -->
  <a 
    {href}
    class="nav-link mobile"
    class:active
    on:click={handleClick}
    aria-current={active ? 'page' : undefined}
  >
    {#if icon}
      <span class="nav-icon">{icon}</span>
    {/if}
    <span class="nav-label">
      <slot />
    </span>
    <svg class="nav-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 12l4-4-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </a>
{:else}
  <!-- Desktop Variant -->
  <a 
    {href}
    class="nav-link desktop"
    class:active
    on:click={handleClick}
    aria-current={active ? 'page' : undefined}
  >
    {#if icon}
      <span class="nav-icon">{icon}</span>
    {/if}
    <span class="nav-label">
      <slot />
    </span>
  </a>
{/if}

<style>
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    transition: all 0.2s ease;
    position: relative;
  }
  
  /* Desktop Styles */
  .nav-link.desktop {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .nav-link.desktop:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  
  .nav-link.desktop.active {
    color: #00ff7f;
    background: rgba(0, 255, 127, 0.1);
  }
  
  .nav-link.desktop.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 2px;
    background: #00ff7f;
    border-radius: 1px;
    box-shadow: 0 0 10px #00ff7f;
  }
  
  /* Mobile Styles */
  .nav-link.mobile {
    padding: 1rem 1.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
    font-weight: 500;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    width: 100%;
  }
  
  .nav-link.mobile:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }
  
  .nav-link.mobile.active {
    color: #00ff7f;
    background: rgba(0, 255, 127, 0.05);
    border-left: 3px solid #00ff7f;
  }
  
  /* Shared Elements */
  .nav-icon {
    font-size: 1.125rem;
    line-height: 1;
  }
  
  .nav-label {
    flex: 1;
  }
  
  /* Mobile Arrow */
  .nav-arrow {
    opacity: 0.3;
    transition: all 0.2s ease;
  }
  
  .nav-link.mobile:hover .nav-arrow {
    opacity: 0.6;
    transform: translateX(2px);
  }
  
  .nav-link.mobile.active .nav-arrow {
    opacity: 0.8;
    color: #00ff7f;
  }
  
  /* Focus Styles */
  .nav-link:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 255, 127, 0.4);
  }
  
  /* Keyboard Navigation */
  .nav-link:focus-visible {
    outline: 2px solid #00ff7f;
    outline-offset: 2px;
  }
</style>