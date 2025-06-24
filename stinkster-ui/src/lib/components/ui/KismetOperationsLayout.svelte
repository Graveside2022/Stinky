<script lang="ts">
  import { onMount } from 'svelte'
  
  export let title = 'Kismet Operations Center'
  
  let currentTheme = 'cyber-blue' // Default theme matching original
  
  function toggleTheme() {
    if (currentTheme === 'cyber-blue') {
      currentTheme = 'dark'
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      currentTheme = 'cyber-blue'
      document.documentElement.removeAttribute('data-theme')
    }
  }
  
  onMount(() => {
    // Set initial theme
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  })
</script>

<div class="ops-container">
  <!-- Top Banner Header -->
  <header class="top-banner">
    <h1>{title}</h1>
    <div class="header-controls">
      <button class="theme-toggle" on:click={toggleTheme}>
        {currentTheme === 'cyber-blue' ? '🌙' : '☀️'}
      </button>
    </div>
  </header>

  <!-- Minimized Tabs Area -->
  <div id="minimized-tabs" class="minimized-tabs"></div>

  <!-- Main Content Grid -->
  <div class="page-container">
    <main class="main-content-area">
      <!-- Left Stack (Sidebar) -->
      <div class="side-stack left-stack">
        <slot name="left-sidebar" />
      </div>

      <!-- Middle Column (Main Content) -->
      <div class="middle-long-box">
        <slot name="main-content" />
      </div>

      <!-- Right Stack -->
      <div class="right-long-box">
        <slot name="right-sidebar" />
      </div>
    </main>
  </div>
</div>

<style>
  /* CSS Custom Properties for Theme Support */
  :global(:root) {
    /* Default Blue Cyber Theme */
    --bg-primary: #030610;
    --bg-secondary: rgba(12, 22, 48, 0.65);
    --bg-tertiary: rgba(12, 22, 48, 0.85);
    --bg-panel: rgba(12, 22, 48, 0.95);
    
    --text-primary: #d0d8f0;
    --text-secondary: rgba(0, 220, 255, 0.8);
    --text-muted: #737373;
    
    --border-primary: rgba(0, 190, 215, 0.35);
    --border-secondary: rgba(0, 190, 215, 0.25);
    
    --accent-primary: #00d2ff;    /* Cyan accent */
    --accent-success: #44ff44;    /* Green accent */
    --accent-error: #ff4444;      /* Red accent */
    --accent-warning: #f59e0b;    /* Amber accent */
    
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.2);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    
    /* Original glow effects */
    --glow-primary: 0 0 20px rgba(0, 220, 255, 0.5);
    --glow-success: 0 0 20px rgba(68, 255, 68, 0.5);
    --glow-error: 0 0 20px rgba(255, 68, 68, 0.5);
  }
  
  /* Dark Theme Override */
  :global([data-theme="dark"]) {
    --bg-primary: #0f172a;
    --bg-secondary: rgba(30, 41, 59, 0.65);
    --bg-tertiary: rgba(51, 65, 85, 0.85);
    --bg-panel: rgba(30, 41, 59, 0.95);
    
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    
    --border-primary: rgba(71, 85, 105, 0.35);
    --border-secondary: rgba(56, 189, 248, 0.25);
    
    --accent-primary: #38bdf8;
    --accent-success: #10b981;
    --accent-error: #ef4444;
    --accent-warning: #f59e0b;
    
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
    
    --glow-primary: 0 0 20px rgba(56, 189, 248, 0.6);
    --glow-success: 0 0 20px rgba(16, 185, 129, 0.5);
    --glow-error: 0 0 20px rgba(239, 68, 68, 0.5);
  }

  /* Reset and Foundation */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Animated Background */
  :global(body::before) {
    content: "";
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background:
      linear-gradient(45deg, rgba(14, 165, 233, 0.02) 25%, transparent 25%, transparent 75%, rgba(14, 165, 233, 0.02) 75%),
      linear-gradient(-45deg, rgba(14, 165, 233, 0.02) 25%, transparent 25%, transparent 75%, rgba(14, 165, 233, 0.02) 75%);
    background-size: 70px 70px;
    z-index: -2;
    opacity: 0.4;
    animation: background-pan 80s linear infinite;
  }

  :global(body::after) {
    content: "";
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="%23203050" cx="10" cy="10" r="0.3"/><circle fill="%23203050" cx="30" cy="30" r="0.2"/><circle fill="%23203050" cx="50" cy="50" r="0.4"/><circle fill="%23203050" cx="70" cy="70" r="0.1"/><circle fill="%23203050" cx="90" cy="90" r="0.3"/><circle fill="%23203050" cx="10" cy="90" r="0.2"/><circle fill="%23203050" cx="90" cy="10" r="0.4"/><circle fill="%23203050" cx="50" cy="10" r="0.1"/><circle fill="%23203050" cx="10" cy="50" r="0.3"/><circle fill="%23203050" cx="30" cy="70" r="0.2"/><circle fill="%23203050" cx="70" cy="30" r="0.3"/></svg>');
    background-size: 100px 100px;
    opacity: 0.08;
    z-index: -1;
  }

  @keyframes background-pan {
    0% { background-position: 0% 0%; }
    100% { background-position: 1200px 1200px; }
  }

  .ops-container {
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

  .top-banner {
    width: 100%;
    background: var(--bg-panel);
    backdrop-filter: blur(12px);
    border-bottom: 2px solid var(--accent-primary);
    box-shadow: var(--glow-primary);
    padding: 15px 25px;
    text-align: center;
    box-sizing: border-box;
    flex-shrink: 0;
    z-index: 10;
    position: relative;
    transition: all 0.3s ease;
    overflow: hidden;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .top-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 200%;
    height: 100%;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(124, 58, 237, 0.1) 25%,
      rgba(124, 58, 237, 0.2) 50%,
      rgba(124, 58, 237, 0.1) 75%,
      transparent 100%);
    animation: banner-scan 4s linear infinite;
  }

  @keyframes banner-scan {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  .top-banner h1 {
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 12px;
    font-size: 2.4em;
    font-weight: 800;
    margin: 0;
    text-shadow: var(--glow-primary);
    position: relative;
    z-index: 1;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    z-index: 1;
  }

  .theme-toggle {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--accent-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1.2rem;
  }

  .theme-toggle:hover {
    background: var(--bg-tertiary);
    box-shadow: var(--glow-primary);
  }

  .minimized-tabs {
    /* Space for minimized tab buttons */
    height: 0;
    overflow: hidden;
    transition: height 0.3s ease;
  }

  .page-container {
    flex: 1;
    display: flex;
    width: 100%;
    height: calc(100vh - 130px);
    overflow: hidden;
  }

  .main-content-area {
    display: grid;
    grid-template-columns: 300px 1.2fr 0.8fr; /* Three columns: left-stack(300px), middle(larger), right(smaller) */
    grid-template-rows: 1fr; /* Single row, all items same height */
    align-items: start;
    align-content: start;
    gap: 20px;
    width: 100%;
    height: 100%;
    padding: 20px;
    margin: 0;
    box-sizing: border-box;
    overflow-y: auto;
  }

  .side-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
  }

  .middle-long-box, .right-long-box {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .middle-long-box {
    display: grid !important;
    grid-template-rows: 1fr 1fr;
    gap: 10px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  /* Responsive Design */
  @media (max-width: 600px) {
    .main-content-area {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      height: auto;
      overflow: visible;
      gap: 8px;
    }
    
    .side-stack,
    .middle-long-box,
    .right-long-box {
      width: 100%;
    }
  }

  @media (min-width: 601px) and (max-width: 1023px) {
    .main-content-area {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      height: auto;
      overflow: visible;
      gap: 12px;
      padding: 12px;
    }
    
    .side-stack,
    .middle-long-box,
    .right-long-box {
      width: 100%;
    }
  }

  @media (max-width: 1400px) {
    .main-content-area {
      grid-template-columns: 280px 1.2fr 0.8fr;
    }
  }

  @media (max-width: 1200px) {
    .main-content-area {
      grid-template-columns: 1fr;
    }
    
    .side-stack,
    .right-long-box {
      width: 100%;
    }
    
    .side-stack {
      order: 1;
    }
    
    .middle-long-box {
      order: 2;
    }
    
    .right-long-box {
      order: 3;
    }
  }

  /* Mobile Optimizations */
  @media (max-width: 768px) {
    .top-banner {
      height: auto;
      min-height: 60px;
      padding: 0.75rem;
      flex-direction: column;
      gap: 0.5rem;
    }

    .top-banner h1 {
      font-size: 1.1rem;
      letter-spacing: 2px;
    }

    .main-content-area {
      flex: none !important;
      overflow-y: visible !important;
      position: static !important;
      padding: 4px;
    }

    .page-container {
      height: auto;
      min-height: calc(100vh - 80px);
    }
  }
</style>