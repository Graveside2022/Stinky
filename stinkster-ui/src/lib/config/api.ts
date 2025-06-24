/**
 * API Configuration Helper
 * 
 * Provides centralized configuration for API endpoints.
 * In production, uses relative URLs for same-origin deployment.
 * In development, uses environment variables or defaults to localhost.
 */

const isProd = import.meta.env.PROD

// Base URLs from environment or defaults
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || ''

// Service ports
const HACKRF_PORT = import.meta.env.VITE_HACKRF_PORT || '8092'
const WIGLE_PORT = import.meta.env.VITE_WIGLE_PORT || '8000'
const KISMET_PORT = import.meta.env.VITE_KISMET_PORT || '2501'

// Build service URLs
function buildServiceUrl(port: string, protocol: 'http' | 'ws' = 'http'): string {
  if (isProd && !API_BASE) {
    // Production with same-origin - use relative URLs
    const location = typeof window !== 'undefined' ? window.location : null
    if (location) {
      const host = location.hostname
      const scheme = protocol === 'ws' 
        ? (location.protocol === 'https:' ? 'wss:' : 'ws:')
        : location.protocol
      return `${scheme}//${host}:${port}`
    }
    // Fallback for SSR
    return ''
  }
  
  // Development or custom base URL
  const base = protocol === 'ws' ? (WS_BASE || `ws://localhost`) : (API_BASE || `http://localhost`)
  return `${base}:${port}`
}

export const apiConfig = {
  hackrf: {
    http: buildServiceUrl(HACKRF_PORT, 'http'),
    ws: buildServiceUrl(HACKRF_PORT, 'ws'),
    api: '/api/hackrf'
  },
  wigle: {
    http: buildServiceUrl(WIGLE_PORT, 'http'),
    ws: buildServiceUrl(WIGLE_PORT, 'ws'),
    api: '/api'
  },
  kismet: {
    http: buildServiceUrl(KISMET_PORT, 'http'),
    ws: buildServiceUrl(KISMET_PORT, 'ws'),
    api: '/api'
  }
}

// Helper to get WebSocket URL for a service
export function getWebSocketUrl(service: 'hackrf' | 'wigle' | 'kismet'): string {
  return apiConfig[service].ws
}

// Helper to get HTTP API URL for a service
export function getApiUrl(service: 'hackrf' | 'wigle' | 'kismet'): string {
  return apiConfig[service].http
}