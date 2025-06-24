<script>
  export let status = 'unknown' // connected, disconnected, error, connecting, idle, active
  export let label = ''
  export let showLabel = true
  
  const statusColors = {
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
    connecting: 'bg-yellow-500',
    idle: 'bg-blue-500',
    active: 'bg-green-500',
    unknown: 'bg-gray-400'
  }
  
  const statusLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    connecting: 'Connecting...',
    idle: 'Idle',
    active: 'Active',
    unknown: 'Unknown'
  }
  
  $: color = statusColors[status] || statusColors.unknown
  $: displayLabel = label || statusLabels[status] || 'Unknown'
  $: isAnimated = status === 'connecting' || status === 'active'
</script>

<div class="flex items-center space-x-2">
  <div class="relative">
    <div class="w-3 h-3 rounded-full {color}" class:animate-pulse={isAnimated}></div>
    {#if isAnimated}
      <div class="absolute inset-0 w-3 h-3 rounded-full {color} animate-ping"></div>
    {/if}
  </div>
  
  {#if showLabel}
    <span class="text-sm text-gray-700 dark:text-gray-300">
      {displayLabel}
    </span>
  {/if}
</div>