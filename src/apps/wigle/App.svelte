<script>
  import { onMount } from 'svelte'
  import Card from '@components/ui/Card.svelte'
  import Button from '@components/ui/Button.svelte'
  import StatusIndicator from '@components/ui/StatusIndicator.svelte'
  
  // Placeholder state
  let devices = []
  let kismetStatus = 'disconnected'
  let takStatus = 'disconnected'
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-900">
  <header class="bg-white dark:bg-gray-800 shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          WigleToTAK Dashboard
        </h1>
        <div class="flex space-x-4">
          <StatusIndicator status={kismetStatus} label="Kismet" />
          <StatusIndicator status={takStatus} label="TAK" />
        </div>
      </div>
    </div>
  </header>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Device List">
        <p class="text-gray-500">Device list will be implemented here</p>
      </Card>
      
      <Card title="Map View">
        <p class="text-gray-500">Map visualization will be implemented here</p>
      </Card>
    </div>
  </main>
</div>