/**
 * CDN Asset Loader with fallback support
 * Optimizes loading of external libraries from CDN with local fallbacks
 */

const CDN_CONFIG = {
  // Chart libraries
  'plotly': {
    url: 'https://cdn.jsdelivr.net/npm/plotly.js-dist@2.27.1/plotly.min.js',
    integrity: 'sha384-TlPLzJ2kp+2Fn7Qvy0r1Q0tHjdNjL4UdZzJpZP05dQX1LmPmZJ3f1H5v1Y1oH5Lk',
    fallback: '/assets/js/vendor/plotly.min.js',
    test: () => window.Plotly
  },
  
  // Socket.IO (if needed separately)
  'socket.io': {
    url: 'https://cdn.socket.io/4.7.2/socket.io.min.js',
    integrity: 'sha384-mZLF4UVrpi/TNHH4Z/QmqNqB8t9MJvQ5b6KtJ9Y6kx6Ue1kQdKUaR9cI2PO5M/uO',
    fallback: '/assets/js/vendor/socket.io.min.js',
    test: () => window.io
  },
  
  // Tailwind CSS (for dynamic loading)
  'tailwindcss': {
    url: 'https://cdn.tailwindcss.com',
    fallback: '/assets/css/tailwind.min.css',
    type: 'css'
  },
  
  // Font Awesome icons
  'fontawesome': {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    integrity: 'sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==',
    fallback: '/assets/css/fontawesome.min.css',
    type: 'css'
  }
}

/**
 * Load asset from CDN with fallback
 * @param {string} name - Asset name from CDN_CONFIG
 * @param {object} options - Loading options
 * @returns {Promise} - Resolves when asset is loaded
 */
export async function loadFromCDN(name, options = {}) {
  const config = CDN_CONFIG[name]
  if (!config) {
    throw new Error(`Unknown CDN asset: ${name}`)
  }
  
  const { url, integrity, fallback, test, type = 'js' } = config
  const { timeout = 5000, retries = 1 } = options
  
  // Check if already loaded
  if (test && test()) {
    return Promise.resolve()
  }
  
  let attempts = 0
  
  const loadAsset = (src, useFallback = false) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout loading ${name}`))
      }, timeout)
      
      if (type === 'css') {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = src
        if (integrity && !useFallback) {
          link.integrity = integrity
          link.crossOrigin = 'anonymous'
        }
        
        link.onload = () => {
          clearTimeout(timeoutId)
          resolve()
        }
        
        link.onerror = () => {
          clearTimeout(timeoutId)
          reject(new Error(`Failed to load ${name}`))
        }
        
        document.head.appendChild(link)
      } else {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        if (integrity && !useFallback) {
          script.integrity = integrity
          script.crossOrigin = 'anonymous'
        }
        
        script.onload = () => {
          clearTimeout(timeoutId)
          if (test && !test()) {
            reject(new Error(`${name} loaded but test failed`))
          } else {
            resolve()
          }
        }
        
        script.onerror = () => {
          clearTimeout(timeoutId)
          reject(new Error(`Failed to load ${name}`))
        }
        
        document.body.appendChild(script)
      }
    })
  }
  
  // Try CDN first
  while (attempts <= retries) {
    try {
      await loadAsset(url)
      return
    } catch (error) {
      attempts++
      if (attempts > retries) {
        console.warn(`CDN failed for ${name}, trying fallback...`, error)
        break
      }
    }
  }
  
  // Try fallback
  if (fallback) {
    try {
      await loadAsset(fallback, true)
      console.log(`Loaded ${name} from fallback`)
    } catch (error) {
      throw new Error(`Both CDN and fallback failed for ${name}`)
    }
  } else {
    throw new Error(`CDN failed and no fallback for ${name}`)
  }
}

/**
 * Preload multiple CDN assets
 * @param {string[]} assets - Array of asset names
 * @param {object} options - Loading options
 * @returns {Promise} - Resolves when all assets are loaded
 */
export async function preloadCDNAssets(assets, options = {}) {
  const results = await Promise.allSettled(
    assets.map(asset => loadFromCDN(asset, options))
  )
  
  const failed = results
    .filter(r => r.status === 'rejected')
    .map((r, i) => ({ asset: assets[i], error: r.reason }))
  
  if (failed.length > 0) {
    console.error('Failed to load CDN assets:', failed)
  }
  
  return {
    loaded: results.filter(r => r.status === 'fulfilled').length,
    failed: failed
  }
}

/**
 * Resource hints for faster loading
 */
export function addResourceHints() {
  // Preconnect to CDN
  const cdnHosts = new Set()
  Object.values(CDN_CONFIG).forEach(config => {
    try {
      const url = new URL(config.url)
      cdnHosts.add(url.origin)
    } catch (e) {}
  })
  
  cdnHosts.forEach(host => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = host
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
  
  // DNS prefetch for additional domains
  const dnsPrefetch = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ]
  
  dnsPrefetch.forEach(host => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = host
    document.head.appendChild(link)
  })
}

// Auto-initialize resource hints
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addResourceHints)
  } else {
    addResourceHints()
  }
}