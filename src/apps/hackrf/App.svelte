<script>
  import { onMount, onDestroy } from 'svelte'
  import Card from '@components/ui/Card.svelte'
  import Button from '@components/ui/Button.svelte'
  import StatusIndicator from '@components/ui/StatusIndicator.svelte'
  import SpectrumDisplay from './components/SpectrumDisplay.svelte'
  import FrequencyControl from './components/FrequencyControl.svelte'
  
  import { 
    hackrfWS, 
    spectrumData, 
    frequency,
    scanStatus,
    startScan,
    stopScan
  } from '@stores/websocket/hackrf.js'
  
  import { hackrfAPI } from '@services/api/hackrf.js'
  
  let deviceInfo = null
  let error = null
  
  onMount(async () => {
    // Connect to WebSocket
    hackrfWS.connect()
    
    // Load device info
    try {
      deviceInfo = await hackrfAPI.getDeviceInfo()
    } catch (err) {
      error = err.message
    }
  })
  
  onDestroy(() => {
    // Cleanup WebSocket connection
    hackrfWS.disconnect()
  })
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-900">
  <header class="bg-white dark:bg-gray-800 shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          HackRF Spectrum Analyzer
        </h1>
        <StatusIndicator status={$hackrfWS.connected ? 'connected' : 'disconnected'} />
      </div>
    </div>
  </header>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Control Panel -->
      <div class="lg:col-span-1">
        <Card title="Controls">
          {#if deviceInfo}
            <div class="mb-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Device: {deviceInfo.board_name}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Version: {deviceInfo.version}
              </p>
            </div>
          {/if}
          
          <FrequencyControl bind:frequency={$frequency} />
          
          <div class="mt-6">
            {#if $scanStatus === 'idle'}
              <Button 
                variant="success" 
                fullWidth
                on:click={startScan}
                disabled={!$hackrfWS.connected}
              >
                Start Scan
              </Button>
            {:else}
              <Button 
                variant="danger" 
                fullWidth
                on:click={stopScan}
              >
                Stop Scan
              </Button>
            {/if}
          </div>
        </Card>
      </div>
      
      <!-- Spectrum Display -->
      <div class="lg:col-span-2">
        <Card title="Spectrum">
          <SpectrumDisplay data={$spectrumData} />
        </Card>
      </div>
    </div>
  </main>
</div>