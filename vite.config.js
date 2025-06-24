import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// Base configuration shared by all apps
export function createBaseConfig(appName) {
  return defineConfig({
    plugins: [svelte()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@components': path.resolve(__dirname, './src/lib/components'),
        '@stores': path.resolve(__dirname, './src/lib/stores'),
        '@services': path.resolve(__dirname, './src/lib/services'),
        '@utils': path.resolve(__dirname, './src/lib/utils'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy API requests to backend services
        '/api/hackrf': {
          target: 'http://localhost:8092',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hackrf/, '')
        },
        '/api/wigle': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wigle/, '')
        },
        '/api/kismet': {
          target: 'http://localhost:2501',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/kismet/, '')
        },
        // WebSocket proxies
        '/ws/hackrf': {
          target: 'ws://localhost:8092',
          ws: true,
          changeOrigin: true
        },
        '/ws/wigle': {
          target: 'ws://localhost:8000',
          ws: true,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: `dist/${appName}`,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, `src/apps/${appName}/index.html`)
        }
      }
    }
  })
}

// Default export for main development
export default createBaseConfig('hackrf')