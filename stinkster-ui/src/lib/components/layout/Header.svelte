<script lang="ts">
  import { page } from '$app/stores';
  import { createEventDispatcher } from 'svelte';
  import NavLink from './NavLink.svelte';
  
  export let mobileMenuOpen = false;
  
  const dispatch = createEventDispatcher();
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/kismet', label: 'Kismet', icon: '📡' },
    { href: '/hackrf', label: 'HackRF', icon: '📊' },
    { href: '/devices', label: 'Devices', icon: '📱' },
    { href: '/map', label: 'Map', icon: '🗺️' },
    { href: '/settings', label: 'Settings', icon: '⚙️' }
  ];
  
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
    dispatch('menuToggle', { open: mobileMenuOpen });
  }
  
  // Status indicators
  let gpsActive = true;
  let kismetActive = true;
  let sdrActive = false;
</script>

<header class="header">
  <div class="header-content">
    <!-- Brand Section -->
    <div class="brand">
      <div class="logo">
        <span class="logo-icon">🦨</span>
        <span class="logo-text">Stinkster</span>
      </div>
    </div>
    
    <!-- Desktop Navigation -->
    <nav class="desktop-nav" aria-label="Main navigation">
      {#each navItems as item}
        <NavLink 
          href={item.href}
          active={$page.url.pathname === item.href}
          icon={item.icon}
        >
          {item.label}
        </NavLink>
      {/each}
    </nav>
    
    <!-- Status Indicators -->
    <div class="status-indicators">
      <div class="status-item" class:active={gpsActive} title="GPS Status">
        <span class="status-dot"></span>
        <span class="status-label">GPS</span>
      </div>
      <div class="status-item" class:active={kismetActive} title="Kismet Status">
        <span class="status-dot"></span>
        <span class="status-label">Kismet</span>
      </div>
      <div class="status-item" class:active={sdrActive} title="SDR Status">
        <span class="status-dot"></span>
        <span class="status-label">SDR</span>
      </div>
    </div>
    
    <!-- Mobile Menu Button -->
    <button 
      class="mobile-menu-button"
      on:click={toggleMobileMenu}
      aria-expanded={mobileMenuOpen}
      aria-label="Toggle navigation menu"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if mobileMenuOpen}
          <path d="M6 18L18 6M6 6l12 12" />
        {:else}
          <path d="M3 12h18M3 6h18M3 18h18" />
        {/if}
      </svg>
    </button>
  </div>
  
  <!-- Scan Line Animation -->
  <div class="scan-line"></div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(10, 10, 15, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 255, 127, 0.1);
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  /* Brand */
  .brand {
    flex-shrink: 0;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #00ff7f;
    text-decoration: none;
    transition: transform 0.2s ease;
  }
  
  .logo:hover {
    transform: translateY(-1px);
  }
  
  .logo-icon {
    font-size: 1.5rem;
  }
  
  .logo-text {
    background: linear-gradient(135deg, #00ff7f 0%, #00cc66 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* Desktop Navigation */
  .desktop-nav {
    display: none;
    align-items: center;
    gap: 0.5rem;
  }
  
  @media (min-width: 768px) {
    .desktop-nav {
      display: flex;
    }
  }
  
  /* Status Indicators */
  .status-indicators {
    display: none;
    align-items: center;
    gap: 1.5rem;
  }
  
  @media (min-width: 768px) {
    .status-indicators {
      display: flex;
    }
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    transition: color 0.3s ease;
  }
  
  .status-item.active {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
  }
  
  .status-item.active .status-dot {
    background-color: #00ff7f;
    box-shadow: 0 0 8px #00ff7f;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .status-label {
    font-weight: 500;
  }
  
  /* Mobile Menu Button */
  .mobile-menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #00ff7f;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .mobile-menu-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(0, 255, 127, 0.3);
  }
  
  .mobile-menu-button:active {
    transform: scale(0.95);
  }
  
  @media (min-width: 768px) {
    .mobile-menu-button {
      display: none;
    }
  }
  
  /* Scan Line Animation */
  .scan-line {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent,
      #00ff7f 10%,
      #00ff7f 90%,
      transparent
    );
    opacity: 0;
    animation: scan 3s ease-in-out infinite;
  }
  
  @keyframes scan {
    0% {
      transform: translateX(-100%);
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>