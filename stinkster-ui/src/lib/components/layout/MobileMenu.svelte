<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { page } from '$app/stores';
  import NavLink from './NavLink.svelte';
  
  export let open = false;
  
  const dispatch = createEventDispatcher();
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/kismet', label: 'Kismet', icon: '📡' },
    { href: '/hackrf', label: 'HackRF', icon: '📊' },
    { href: '/devices', label: 'Devices', icon: '📱' },
    { href: '/map', label: 'Map', icon: '🗺️' },
    { href: '/settings', label: 'Settings', icon: '⚙️' }
  ];
  
  // Status data (would come from stores in real app)
  let connectionStatus = 'Connected';
  let activeServices = 2;
  let totalServices = 3;
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
  
  // Close on escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleClose();
    }
  }
  
  // Trap focus within menu when open
  let menuEl: HTMLElement;
  
  onMount(() => {
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (!open || e.key !== 'Tab') return;
      
      const focusableElements = menuEl.querySelectorAll(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div 
    class="backdrop"
    on:click={handleBackdropClick}
    transition:fade={{ duration: 200 }}
    aria-hidden="true"
  />
  
  <!-- Menu Panel -->
  <nav 
    bind:this={menuEl}
    class="mobile-menu"
    transition:fly={{ y: -300, duration: 300 }}
    aria-label="Mobile navigation"
  >
    <!-- Close Button -->
    <button 
      class="close-button"
      on:click={handleClose}
      aria-label="Close navigation menu"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    <!-- Navigation Items -->
    <div class="nav-items">
      {#each navItems as item}
        <NavLink 
          href={item.href}
          active={$page.url.pathname === item.href}
          icon={item.icon}
          mobile
          on:click={handleClose}
        >
          {item.label}
        </NavLink>
      {/each}
    </div>
    
    <!-- Status Section -->
    <div class="status-section">
      <h3 class="status-title">System Status</h3>
      
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Connection</span>
          <span class="status-value" class:connected={connectionStatus === 'Connected'}>
            {connectionStatus}
          </span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Services</span>
          <span class="status-value">
            {activeServices} / {totalServices}
          </span>
        </div>
        
        <div class="status-item">
          <span class="status-label">GPS</span>
          <span class="status-value connected">Active</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Kismet</span>
          <span class="status-value connected">Running</span>
        </div>
      </div>
    </div>
  </nav>
{/if}

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 100;
  }
  
  .mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(10, 10, 15, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 255, 127, 0.1);
    z-index: 101;
    max-height: 100vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  
  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #00ff7f;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(0, 255, 127, 0.3);
    transform: rotate(90deg);
  }
  
  .close-button:active {
    transform: scale(0.95) rotate(90deg);
  }
  
  .nav-items {
    padding-top: 4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  /* Status Section */
  .status-section {
    padding: 1.5rem;
  }
  
  .status-title {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .status-item {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }
  
  .status-label {
    display: block;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 0.25rem;
  }
  
  .status-value {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .status-value.connected {
    color: #00ff7f;
  }
  
  /* Scrollbar Styling */
  .mobile-menu::-webkit-scrollbar {
    width: 6px;
  }
  
  .mobile-menu::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }
  
  .mobile-menu::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  .mobile-menu::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  /* Focus Styles */
  .close-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 255, 127, 0.4);
  }
  
  .close-button:focus-visible {
    outline: 2px solid #00ff7f;
    outline-offset: 2px;
  }
</style>