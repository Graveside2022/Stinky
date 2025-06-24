<script>
  export let data = null
</script>

<div class="spectrum-display">
  {#if data}
    <!-- Canvas or SVG spectrum visualization will go here -->
    <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
      <p class="text-gray-500 dark:text-gray-400">Spectrum visualization placeholder</p>
    </div>
  {:else}
    <div class="h-64 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
      <p class="text-gray-500 dark:text-gray-400">No spectrum data</p>
    </div>
  {/if}
</div>