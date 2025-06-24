<script>
  import { onMount, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  
  // Performance metrics stores
  const metrics = writable({
    pageLoad: {},
    resources: [],
    memory: {},
    fps: 0,
    bundleSize: {},
    networkRequests: [],
    cacheStats: {},
    errors: []
  })
  
  let intervalId
  let observer
  
  // Collect initial page load metrics
  function collectPageLoadMetrics() {
    if (!window.performance) return {}
    
    const nav = performance.getEntriesByType('navigation')[0]
    const paint = performance.getEntriesByType('paint')
    
    return {
      domContentLoaded: nav?.domContentLoadedEventEnd - nav?.domContentLoadedEventStart || 0,
      loadComplete: nav?.loadEventEnd - nav?.loadEventStart || 0,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      totalLoadTime: nav?.loadEventEnd - nav?.fetchStart || 0
    }
  }
  
  // Collect resource timing
  function collectResourceMetrics() {
    if (!window.performance) return []
    
    return performance.getEntriesByType('resource')
      .map(r => ({
        name: r.name.split('/').pop() || r.name,
        type: r.initiatorType,
        size: r.transferSize || 0,
        duration: r.duration,
        cached: r.transferSize === 0 && r.decodedBodySize > 0
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20) // Top 20 slowest resources
  }
  
  // Monitor memory usage
  function collectMemoryMetrics() {
    if (!performance.memory) return {}
    
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576), // MB
      percentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    }
  }
  
  // Monitor FPS
  let lastTime = performance.now()
  let frames = 0
  let fps = 0
  
  function measureFPS() {
    frames++
    const currentTime = performance.now()
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frames * 1000) / (currentTime - lastTime))
      frames = 0
      lastTime = currentTime
    }
    
    requestAnimationFrame(measureFPS)
  }
  
  // Monitor network requests
  function setupNetworkMonitoring() {
    if (!window.PerformanceObserver) return
    
    observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      metrics.update(m => ({
        ...m,
        networkRequests: [
          ...m.networkRequests,
          ...entries.map(e => ({
            url: e.name,
            method: e.initiatorType,
            duration: e.duration,
            size: e.transferSize || 0,
            timestamp: e.startTime
          }))
        ].slice(-50) // Keep last 50 requests
      }))
    })
    
    observer.observe({ entryTypes: ['resource'] })
  }
  
  // Get cache statistics
  async function getCacheStats() {
    if (!('caches' in window)) return {}
    
    try {
      const cacheNames = await caches.keys()
      const stats = {}
      
      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()
        stats[name] = keys.length
      }
      
      return stats
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return {}
    }
  }
  
  // Monitor errors
  function setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      metrics.update(m => ({
        ...m,
        errors: [
          ...m.errors,
          {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            timestamp: Date.now()
          }
        ].slice(-20) // Keep last 20 errors
      }))
    })
  }
  
  // Get bundle sizes from build
  async function getBundleSizes() {
    try {
      const response = await fetch('/api/bundle-stats')
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to get bundle stats:', error)
    }
    
    // Fallback: estimate from loaded resources
    const scripts = performance.getEntriesByType('resource')
      .filter(r => r.name.endsWith('.js'))
    
    return {
      totalSize: scripts.reduce((sum, s) => sum + (s.transferSize || 0), 0),
      scripts: scripts.length,
      largest: Math.max(...scripts.map(s => s.transferSize || 0))
    }
  }
  
  // Update metrics periodically
  function updateMetrics() {
    metrics.update(m => ({
      ...m,
      pageLoad: collectPageLoadMetrics(),
      resources: collectResourceMetrics(),
      memory: collectMemoryMetrics(),
      fps
    }))
    
    // Update cache stats less frequently
    getCacheStats().then(stats => {
      metrics.update(m => ({ ...m, cacheStats: stats }))
    })
  }
  
  onMount(() => {
    // Initial metrics
    updateMetrics()
    
    // Get bundle sizes
    getBundleSizes().then(sizes => {
      metrics.update(m => ({ ...m, bundleSize: sizes }))
    })
    
    // Start monitoring
    measureFPS()
    setupNetworkMonitoring()
    setupErrorMonitoring()
    
    // Update metrics every 2 seconds
    intervalId = setInterval(updateMetrics, 2000)
  })
  
  onDestroy(() => {
    if (intervalId) clearInterval(intervalId)
    if (observer) observer.disconnect()
  })
  
  // Format bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Format duration
  function formatDuration(ms) {
    if (ms < 1000) return Math.round(ms) + 'ms'
    return (ms / 1000).toFixed(2) + 's'
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
      Performance Monitoring Dashboard
    </h1>
    
    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Page Load Time</h3>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatDuration($metrics.pageLoad.totalLoadTime)}
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">First Contentful Paint</h3>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatDuration($metrics.pageLoad.firstContentfulPaint)}
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Memory Usage</h3>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {$metrics.memory.used || 0} MB
          <span class="text-sm text-gray-500 dark:text-gray-400">
            ({$metrics.memory.percentage || 0}%)
          </span>
        </p>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">FPS</h3>
        <p class="text-2xl font-bold {$metrics.fps < 30 ? 'text-red-600' : 'text-gray-900 dark:text-white'}">
          {$metrics.fps}
        </p>
      </div>
    </div>
    
    <!-- Bundle Size Info -->
    {#if $metrics.bundleSize.totalSize}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Bundle Statistics</h2>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Size</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {formatBytes($metrics.bundleSize.totalSize)}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Scripts</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {$metrics.bundleSize.scripts}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Largest Chunk</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            {formatBytes($metrics.bundleSize.largest)}
          </p>
        </div>
      </div>
    </div>
    {/if}
    
    <!-- Resource Loading -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Slowest Resources
      </h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resource</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Size</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cached</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {#each $metrics.resources.slice(0, 10) as resource}
            <tr>
              <td class="px-4 py-2 text-sm text-gray-900 dark:text-white truncate max-w-xs">
                {resource.name}
              </td>
              <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                {resource.type}
              </td>
              <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                {formatBytes(resource.size)}
              </td>
              <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(resource.duration)}
              </td>
              <td class="px-4 py-2 text-sm">
                <span class="inline-flex px-2 py-1 text-xs rounded-full {resource.cached ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                  {resource.cached ? 'Yes' : 'No'}
                </span>
              </td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Cache Statistics -->
    {#if Object.keys($metrics.cacheStats).length > 0}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Cache Statistics</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {#each Object.entries($metrics.cacheStats) as [name, count]}
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{name}</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">{count} items</p>
        </div>
        {/each}
      </div>
    </div>
    {/if}
    
    <!-- Recent Errors -->
    {#if $metrics.errors.length > 0}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Errors</h2>
      <div class="space-y-2">
        {#each $metrics.errors.slice(-5) as error}
        <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded">
          <p class="text-sm font-medium text-red-800 dark:text-red-400">{error.message}</p>
          <p class="text-xs text-red-600 dark:text-red-500">
            {error.source}:{error.line}:{error.column}
          </p>
        </div>
        {/each}
      </div>
    </div>
    {/if}
  </div>
</div>

<style>
  /* Add any custom styles here */
</style>