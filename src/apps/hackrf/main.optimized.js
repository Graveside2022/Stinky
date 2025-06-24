import '../../app.css'

// Lazy load heavy dependencies
const loadApp = async () => {
  // Show loading indicator
  const appElement = document.getElementById('app')
  appElement.innerHTML = `
    <div class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading HackRF Spectrum Analyzer...</p>
      </div>
    </div>
  `

  // Preload critical chunks
  const criticalPromises = [
    import('@lib/stores/websocket/hackrf.js'),
    import('@lib/services/api/hackrf.js')
  ]

  // Load non-critical components in parallel
  const [
    { default: App },
    // Critical dependencies loaded in parallel
    ...criticalDeps
  ] = await Promise.all([
    import('./App.svelte'),
    ...criticalPromises
  ])

  // Clear loading indicator
  appElement.innerHTML = ''

  // Initialize app
  const app = new App({
    target: appElement,
    props: {
      // Pass preloaded stores if needed
    }
  })

  // Prefetch chart components after initial render
  requestIdleCallback(() => {
    import('@lib/components/charts/SpectrumChart.svelte')
  })

  return app
}

// Start loading immediately
const appPromise = loadApp()

// Export promise for testing
export default appPromise

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

// Preconnect to WebSocket server
if (import.meta.env.PROD) {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = 'ws://localhost:8092'
  document.head.appendChild(link)
}