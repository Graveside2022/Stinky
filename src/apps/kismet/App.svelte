<script>
  import { onMount } from 'svelte'
  import Card from '@components/ui/Card.svelte'
  import Button from '@components/ui/Button.svelte'
  import StatusIndicator from '@components/ui/StatusIndicator.svelte'
  
  // Placeholder state
  let kismetStatus = 'disconnected'
  let scanStatus = 'idle'
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-900">
  <header class="bg-white dark:bg-gray-800 shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Kismet Operations Center
        </h1>
        <StatusIndicator status={kismetStatus} />
      </div>
    </div>
  </header>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 gap-6">
      <Card title="Kismet Interface">
        <p class="text-gray-500">Kismet iframe integration will be implemented here</p>
      </Card>
      
      <Card title="Controls">
        <div class="space-y-4">
          <Button variant="primary">Start Kismet</Button>
          <Button variant="danger">Stop Kismet</Button>
        </div>
      </Card>
    </div>
  </main>
</div>