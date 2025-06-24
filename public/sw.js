/**
 * Optimized Service Worker for Stinkster Apps
 * Implements advanced caching strategies for Raspberry Pi
 */

const CACHE_VERSION = 'v1.0.0'
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  cdn: `cdn-${CACHE_VERSION}`
}

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/manifest.json',
  '/favicon.ico'
]

// CDN resources to cache
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/plotly.js-dist@2.27.1/plotly.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
]

// API endpoints to cache with network-first strategy
const API_PATTERNS = [
  /\/api\/hackrf\/status/,
  /\/api\/wigle\/devices/,
  /\/api\/kismet\/status/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAMES.static).then(cache => 
        cache.addAll(STATIC_ASSETS)
      ),
      // Cache CDN assets
      caches.open(CACHE_NAMES.cdn).then(cache => 
        cache.addAll(CDN_ASSETS).catch(err => {
          console.warn('Some CDN assets failed to cache:', err)
        })
      )
    ]).then(() => self.skipWaiting())
  )
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !Object.values(CACHE_NAMES).includes(name))
          .map(name => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) return
  
  event.respondWith(handleFetch(request))
})

async function handleFetch(request) {
  const url = new URL(request.url)
  
  // CDN resources - cache first, fallback to network
  if (url.hostname.includes('cdn.') || url.hostname.includes('cdnjs.')) {
    return cacheFirst(request, CACHE_NAMES.cdn)
  }
  
  // API requests - network first, fallback to cache
  if (API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return networkFirst(request, CACHE_NAMES.api, 5000)
  }
  
  // Static assets - cache first
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?)$/)) {
    return cacheFirst(request, CACHE_NAMES.static)
  }
  
  // Everything else - network first with dynamic cache
  return networkFirst(request, CACHE_NAMES.dynamic, 3000)
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  
  if (cached) {
    // Update cache in background
    fetchAndCache(request, cacheName).catch(() => {})
    return cached
  }
  
  return fetchAndCache(request, cacheName)
}

// Network-first strategy with timeout
async function networkFirst(request, cacheName, timeout = 5000) {
  const cache = await caches.open(cacheName)
  
  try {
    const networkResponse = await fetchWithTimeout(request, timeout)
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cached = await cache.match(request)
    if (cached) return cached
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(CACHE_NAMES.static)
      return offlineCache.match('/offline.html') || 
             new Response('Offline', { status: 503 })
    }
    
    throw error
  }
}

// Fetch with timeout
async function fetchWithTimeout(request, timeout) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(request, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Fetch and cache helper
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request)
  
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  
  return response
}

// Message handling for cache control
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      )
    )
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  // Implement offline data sync if needed
  console.log('Syncing offline data...')
}