<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  
  // Lazy load components
  let SpectrumDisplay = null
  let FrequencyControl = null
  let isLoading = true
  let error = null
  
  onMount(async () => {
    try {
      // Load components in parallel
      const [spectrumModule, frequencyModule] = await Promise.all([
        import('./components/SpectrumDisplay.svelte'),
        import('./components/FrequencyControl.svelte')
      ])
      
      SpectrumDisplay = spectrumModule.default
      FrequencyControl = frequencyModule.default
      isLoading = false
      
      // Prefetch WebSocket store after components load
      requestIdleCallback(() => {
        import('@lib/stores/websocket/hackrf.js')
      })
    } catch (e) {
      error = e.message
      isLoading = false
    }
  })
  
  // State management
  let frequency = 100000000 // 100 MHz default
  let gain = 20
  let sampleRate = 2048000
</script>

{#if isLoading}
  <div class="flex items-center justify-center h-screen" transition:fade>
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Loading components...</p>
    </div>
  </div>
{:else if error}
  <div class="flex items-center justify-center h-screen">
    <div class="text-center text-red-600">
      <p class="text-xl mb-2">Error loading application</p>
      <p class="text-sm">{error}</p>
      <button 
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        on:click={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors" transition:fade>
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          HackRF Spectrum Analyzer
        </h1>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Frequency Controls -->
        <div class="lg:col-span-1">
          {#if FrequencyControl}
            <svelte:component 
              this={FrequencyControl} 
              bind:frequency
              bind:gain
              bind:sampleRate
            />
          {/if}
        </div>
        
        <!-- Spectrum Display -->
        <div class="lg:col-span-2">
          {#if SpectrumDisplay}
            <svelte:component 
              this={SpectrumDisplay}
              {frequency}
              {gain}
              {sampleRate}
            />
          {/if}
        </div>
      </div>
    </main>
  </div>
{/if}

<style>
  /* Critical styles only - rest loaded from app.css */
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>