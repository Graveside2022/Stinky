<script lang="ts">
  import { onMount } from 'svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import MobileMenu from '$lib/components/layout/MobileMenu.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';
  import GeometricBackground from '$lib/components/effects/GeometricBackground.svelte';
  import '../lib/styles/globals.css';
  import '../app.css';
  
  let mobileMenuOpen = false;
  
  function handleMenuToggle(event: CustomEvent) {
    mobileMenuOpen = event.detail.open;
  }
  
  function handleMenuClose() {
    mobileMenuOpen = false;
  }
  
  // Prevent body scroll when mobile menu is open
  $: if (typeof document !== 'undefined') {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
  
  onMount(() => {
    // Cleanup on unmount
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  });
</script>

<div class="app-container">
  <!-- Background Effects -->
  <GeometricBackground />
  
  <!-- Header -->
  <Header 
    bind:mobileMenuOpen 
    on:menuToggle={handleMenuToggle}
  />
  
  <!-- Mobile Menu -->
  <MobileMenu 
    open={mobileMenuOpen}
    on:close={handleMenuClose}
  />
  
  <!-- Main Content -->
  <main class="main-content">
    <slot />
  </main>
  
  <!-- Footer -->
  <Footer />
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    background: #0a0a0f;
    color: #ffffff;
  }
  
  .main-content {
    flex: 1;
    position: relative;
    z-index: 1;
    padding: 2rem 1rem;
  }
  
  @media (min-width: 768px) {
    .main-content {
      padding: 3rem 1.5rem;
    }
  }
  
  @media (min-width: 1024px) {
    .main-content {
      padding: 4rem 2rem;
    }
  }
  
  /* Global Layout Adjustments */
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }
  
  :global(.container) {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
</style>