<script>
  export let frequency = 915000000
  
  function formatFrequency(freq) {
    if (freq >= 1e9) {
      return (freq / 1e9).toFixed(3) + ' GHz'
    } else if (freq >= 1e6) {
      return (freq / 1e6).toFixed(3) + ' MHz'
    } else if (freq >= 1e3) {
      return (freq / 1e3).toFixed(3) + ' kHz'
    }
    return freq + ' Hz'
  }
</script>

<div class="frequency-control">
  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Frequency: {formatFrequency(frequency)}
  </label>
  <input
    type="range"
    bind:value={frequency}
    min="1000000"
    max="6000000000"
    step="1000000"
    class="w-full"
  />
</div>