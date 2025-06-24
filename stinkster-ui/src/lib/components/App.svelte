<script lang="ts">
  import { onMount } from 'svelte'
  import { currentTheme, notifications } from '../../shared/stores'
  import { darkCyberTheme, cursorDarkTheme } from '../../shared/theme'
  import Header from './Header.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainContent from './MainContent.svelte'
  import Footer from './Footer.svelte'
  import type { ComponentProps } from 'svelte'

  // Theme reactivity
  let themeClass = 'dark-cyber'
  
  currentTheme.subscribe(theme => {
    themeClass = theme
    // Apply CSS custom properties based on theme
    const selectedTheme = theme === 'cursor-dark' ? cursorDarkTheme : darkCyberTheme
    applyThemeColors(selectedTheme.colors)
  })

  function applyThemeColors(colors: any) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      Object.entries(colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        root.style.setProperty(cssVar, value as string)
      })
    }
  }

  onMount(() => {
    // Set initial theme attribute
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', themeClass)
    }
  })

  // Update body theme attribute when theme changes
  $: if (typeof document !== 'undefined') {
    document.body.setAttribute('data-theme', themeClass)
  }
</script>

<svelte:head>
  <title>Kismet Operations Center - Svelte</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="format-detection" content="telephone=no">
  <meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="pragma" content="no-cache">
  <meta http-equiv="expires" content="0">
</svelte:head>

<div class="app-container" data-theme={themeClass}>
  <!-- Notification container -->
  {#if $notifications.length > 0}
    <div id="notification" class="notification">
      {#each $notifications as notification (notification.id)}
        <div class="notification-item notification-{notification.type}">
          <strong>{notification.title}</strong>
          {notification.message}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Status message container -->
  <div id="status-message" class="status-message hidden"></div>

  <!-- Main application layout -->
  <Header />
  
  <div class="page-container">
    <main class="main-content-area">
      <Sidebar />
      <MainContent />
    </main>
  </div>
  
  <Footer />
</div>

<style>
  :global(*), :global(*::before), :global(*::after) {
    box-sizing: border-box;
  }
  
  :global(html) {
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-text-size-adjust: 100%;
    touch-action: manipulation;
  }

  :global(body) {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    box-sizing: border-box;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100vw;
    background: linear-gradient(135deg, #0a192f 0%, #020c1b 100%);
    color: var(--accent-primary);
    font-family: 'Courier New', monospace;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    overflow: hidden;
    padding-bottom: 20px;
  }

  .page-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 10px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
  }

  .main-content-area {
    display: grid;
    grid-template-columns: 300px 1.2fr 0.8fr;
    gap: 20px;
    height: calc(100vh - 140px);
    overflow: hidden;
    padding: 10px 0;
    box-sizing: border-box;
  }

  /* Notification styles */
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    max-width: 400px;
    pointer-events: none;
  }

  .notification-item {
    background: var(--bg-panel);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 8px;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(12px);
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
  }

  .notification-info {
    border-left: 4px solid var(--accent-primary);
  }

  .notification-success {
    border-left: 4px solid var(--accent-success);
  }

  .notification-warning {
    border-left: 4px solid var(--accent-warning);
  }

  .notification-error {
    border-left: 4px solid var(--accent-error);
  }

  .status-message {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-panel);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 20px;
    z-index: 3000;
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-lg);
  }

  .status-message.hidden {
    display: none;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Mobile responsive */
  @media (max-width: 1023px) {
    .main-content-area {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      height: auto;
      overflow: visible;
      gap: 12px;
    }

    .page-container {
      padding: 0 5px;
    }
  }

  @media (max-width: 768px) {
    .app-container {
      padding-bottom: 60px;
    }
    
    .main-content-area {
      padding: 4px;
      gap: 8px;
    }
  }
</style>