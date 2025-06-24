<script>
  export let title = ''
  export let padding = 'p-4'
  export let shadow = 'shadow-md'
  export let rounded = 'rounded-lg'
  export let background = 'bg-white dark:bg-gray-800'
</script>

<div class="card {background} {shadow} {rounded} {padding}">
  {#if title}
    <div class="card-header mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
    </div>
  {/if}
  
  <div class="card-body">
    <slot />
  </div>
</div>

<style>
  .card {
    transition: all 0.3s ease;
  }
  
  .card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
</style>