<script lang="ts">
  export let value: number = -90; // Signal strength in dBm
  export let min: number = -90;
  export let max: number = -10;
  export let showValue: boolean = true;
  export let height: number = 24;
  
  // Clamp value between min and max
  $: clampedValue = Math.max(min, Math.min(max, value));
  
  // Calculate percentage (0-100)
  $: percentage = ((clampedValue - min) / (max - min)) * 100;
  
  // Calculate marker position
  $: markerPosition = `${percentage}%`;
  
  // Determine color based on signal strength
  $: signalColor = getSignalColor(percentage);
  
  function getSignalColor(pct: number): string {
    if (pct < 20) return '#3b82f6'; // blue - weak
    if (pct < 40) return '#10b981'; // green - fair
    if (pct < 60) return '#f59e0b'; // yellow - good
    if (pct < 80) return '#f97316'; // orange - very good
    return '#ef4444'; // red - excellent
  }
  
  // Define marker positions for common signal levels
  const markers = [
    { value: -90, label: '-90' },
    { value: -70, label: '-70' },
    { value: -50, label: '-50' },
    { value: -30, label: '-30' },
    { value: -10, label: '-10' }
  ];
  
  function getMarkerPosition(markerValue: number): number {
    return ((markerValue - min) / (max - min)) * 100;
  }
</script>

<div class="signal-indicator-container">
  <div class="relative" style="height: {height}px">
    <!-- Background bar -->
    <div class="absolute inset-0 bg-gray-800 rounded-full overflow-hidden">
      <!-- Gradient fill based on signal strength -->
      <div 
        class="h-full transition-all duration-500 ease-out rounded-full"
        style="width: {percentage}%; background: linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #f97316, #ef4444);"
      />
    </div>
    
    <!-- Marker lines -->
    <div class="absolute inset-0">
      {#each markers as marker}
        <div 
          class="absolute top-0 bottom-0 w-px bg-gray-600"
          style="left: {getMarkerPosition(marker.value)}%"
        />
      {/each}
    </div>
    
    <!-- Current value indicator -->
    <div 
      class="absolute top-1/2 -translate-y-1/2 w-1 h-5/6 rounded-full transition-all duration-500 ease-out"
      style="left: {markerPosition}; background-color: {signalColor}; box-shadow: 0 0 8px {signalColor};"
    />
  </div>
  
  <!-- Marker labels -->
  <div class="relative mt-1 text-xs text-gray-400">
    {#each markers as marker}
      <span 
        class="absolute -translate-x-1/2"
        style="left: {getMarkerPosition(marker.value)}%"
      >
        {marker.label}
      </span>
    {/each}
  </div>
  
  <!-- Current value display -->
  {#if showValue}
    <div class="mt-3 text-center">
      <span class="text-sm font-semibold" style="color: {signalColor}">
        {clampedValue} dBm
      </span>
    </div>
  {/if}
</div>

<style>
  .signal-indicator-container {
    min-width: 200px;
  }
</style>