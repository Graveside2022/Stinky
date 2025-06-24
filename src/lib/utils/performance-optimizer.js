/**
 * Runtime Performance Optimizer
 * Optimizes app performance on Raspberry Pi with limited resources
 */

class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      enableThrottling: true,
      enableLazyImages: true,
      enableRequestBatching: true,
      enableMemoryMonitoring: true,
      memoryThreshold: 0.8, // 80% memory usage threshold
      throttleDelay: 16, // ~60fps
      batchDelay: 50, // 50ms request batching
      ...options
    }
    
    this.pendingRequests = new Map()
    this.observers = new Map()
    this.rafCallbacks = new Set()
    this.lastFrameTime = 0
  }
  
  /**
   * Initialize performance optimizations
   */
  init() {
    if (this.options.enableLazyImages) {
      this.setupLazyImageLoading()
    }
    
    if (this.options.enableRequestBatching) {
      this.setupRequestBatching()
    }
    
    if (this.options.enableMemoryMonitoring) {
      this.setupMemoryMonitoring()
    }
    
    if (this.options.enableThrottling) {
      this.setupAnimationThrottling()
    }
    
    // Setup passive event listeners
    this.setupPassiveListeners()
    
    // Enable GPU acceleration hints
    this.enableGPUAcceleration()
    
    return this
  }
  
  /**
   * Setup lazy image loading with Intersection Observer
   */
  setupLazyImageLoading() {
    if (!('IntersectionObserver' in window)) return
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          const src = img.dataset.src
          
          if (src) {
            // Preload image
            const tempImg = new Image()
            tempImg.onload = () => {
              img.src = src
              img.classList.add('loaded')
              imageObserver.unobserve(img)
            }
            tempImg.src = src
          }
        }
      })
    }, {
      rootMargin: '50px',
      threshold: 0.01
    })
    
    this.observers.set('images', imageObserver)
    
    // Auto-observe images with data-src
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img)
      })
    })
  }
  
  /**
   * Setup request batching for API calls
   */
  setupRequestBatching() {
    const originalFetch = window.fetch
    
    window.fetch = (url, options = {}) => {
      // Skip batching for non-GET requests or WebSocket upgrades
      if (options.method && options.method !== 'GET') {
        return originalFetch(url, options)
      }
      
      // Skip batching for real-time endpoints
      if (url.includes('/ws/') || url.includes('socket.io')) {
        return originalFetch(url, options)
      }
      
      // Check if we should batch this request
      const batchKey = this.getBatchKey(url)
      if (!batchKey) {
        return originalFetch(url, options)
      }
      
      // Return existing promise if request is pending
      if (this.pendingRequests.has(batchKey)) {
        return this.pendingRequests.get(batchKey)
      }
      
      // Create batched request
      const batchedPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          const promise = originalFetch(url, options)
          promise.then(resolve).catch(reject)
          this.pendingRequests.delete(batchKey)
        }, this.options.batchDelay)
      })
      
      this.pendingRequests.set(batchKey, batchedPromise)
      return batchedPromise
    }
  }
  
  /**
   * Get batch key for request deduplication
   */
  getBatchKey(url) {
    // Only batch API requests
    if (!url.includes('/api/')) return null
    
    // Extract endpoint and params
    const urlObj = new URL(url, window.location.origin)
    const endpoint = urlObj.pathname
    
    // Batch status/list endpoints
    if (endpoint.includes('status') || endpoint.includes('list')) {
      return `${endpoint}:${urlObj.search}`
    }
    
    return null
  }
  
  /**
   * Setup memory monitoring and cleanup
   */
  setupMemoryMonitoring() {
    if (!performance.memory) return
    
    const checkMemory = () => {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
      
      if (memoryUsage > this.options.memoryThreshold) {
        this.performMemoryCleanup()
      }
    }
    
    // Check memory every 30 seconds
    setInterval(checkMemory, 30000)
    
    // Also check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performMemoryCleanup()
      }
    })
  }
  
  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    // Clear caches
    if ('caches' in window) {
      this.clearOldCaches()
    }
    
    // Clear pending requests
    this.pendingRequests.clear()
    
    // Dispatch cleanup event
    window.dispatchEvent(new CustomEvent('memoryCleanup'))
    
    // Force garbage collection if available (Chrome with --js-flags="--expose-gc")
    if (window.gc) {
      window.gc()
    }
  }
  
  /**
   * Clear old caches
   */
  async clearOldCaches() {
    const cacheWhitelist = ['static-v1.0.0', 'dynamic-v1.0.0']
    const cacheNames = await caches.keys()
    
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        if (!cacheWhitelist.includes(cacheName)) {
          await caches.delete(cacheName)
        }
      })
    )
  }
  
  /**
   * Setup animation frame throttling
   */
  setupAnimationThrottling() {
    const originalRAF = window.requestAnimationFrame
    
    window.requestAnimationFrame = (callback) => {
      const now = performance.now()
      const delta = now - this.lastFrameTime
      
      // Throttle to target framerate
      if (delta < this.options.throttleDelay) {
        return originalRAF(() => {
          window.requestAnimationFrame(callback)
        })
      }
      
      this.lastFrameTime = now
      return originalRAF(callback)
    }
  }
  
  /**
   * Setup passive event listeners for better scroll performance
   */
  setupPassiveListeners() {
    // Get all scrollable elements
    const scrollables = document.querySelectorAll('[data-scrollable], .overflow-auto, .overflow-scroll')
    
    scrollables.forEach(element => {
      // Remove existing listeners
      const oldListeners = element.cloneNode(true)
      element.parentNode.replaceChild(oldListeners, element)
      
      // Add passive listeners
      element.addEventListener('touchstart', this.noop, { passive: true })
      element.addEventListener('touchmove', this.noop, { passive: true })
      element.addEventListener('wheel', this.noop, { passive: true })
    })
  }
  
  /**
   * Enable GPU acceleration hints
   */
  enableGPUAcceleration() {
    // Add will-change hints to animated elements
    const animated = document.querySelectorAll('[data-animated], .transition, .animate')
    animated.forEach(el => {
      el.style.willChange = 'transform'
    })
    
    // Force GPU layers for fixed elements
    const fixed = document.querySelectorAll('.fixed, [data-fixed]')
    fixed.forEach(el => {
      el.style.transform = 'translateZ(0)'
    })
  }
  
  /**
   * Defer non-critical work
   */
  defer(callback, priority = 'low') {
    if ('requestIdleCallback' in window) {
      const options = priority === 'high' ? { timeout: 1000 } : { timeout: 5000 }
      return requestIdleCallback(callback, options)
    } else {
      // Fallback to setTimeout
      const delay = priority === 'high' ? 100 : 1000
      return setTimeout(callback, delay)
    }
  }
  
  /**
   * Prefetch resources
   */
  prefetch(urls) {
    if (!('link' in document.createElement('link'))) return
    
    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      link.as = this.getResourceType(url)
      document.head.appendChild(link)
    })
  }
  
  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.endsWith('.js')) return 'script'
    if (url.endsWith('.css')) return 'style'
    if (url.match(/\.(png|jpg|jpeg|svg|webp)$/)) return 'image'
    if (url.endsWith('.woff2')) return 'font'
    return 'fetch'
  }
  
  /**
   * No-op function for passive listeners
   */
  noop() {}
  
  /**
   * Destroy and cleanup
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.pendingRequests.clear()
    this.rafCallbacks.clear()
  }
}

// Auto-initialize on load
let optimizer
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    optimizer = new PerformanceOptimizer()
    optimizer.init()
    
    // Expose for debugging
    window.__performanceOptimizer = optimizer
  })
}

export default PerformanceOptimizer