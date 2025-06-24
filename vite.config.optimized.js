import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

// Advanced performance optimized configuration
export function createOptimizedConfig(appName) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return defineConfig({
    plugins: [
      svelte({
        compilerOptions: {
          dev: !isProduction,
          css: 'injected',
          immutable: true
        },
        experimental: {
          prebundleSvelteLibraries: true
        }
      }),
      
      // Legacy browser support with modern/legacy bundle splitting
      legacy({
        targets: ['defaults', 'not IE 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
        modernPolyfills: true,
        renderLegacyChunks: false
      }),
      
      // Compression plugin for gzip and brotli
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
        deleteOriginFile: false
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false
      }),
      
      // PWA for offline capabilities
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: `Stinkster ${appName.charAt(0).toUpperCase() + appName.slice(1)}`,
          short_name: `${appName.toUpperCase()}`,
          theme_color: '#1a1a1a',
          background_color: '#1a1a1a',
          display: 'standalone'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        }
      }),
      
      // Bundle visualizer for analysis
      isProduction && visualizer({
        filename: `stats/${appName}-stats.html`,
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@components': path.resolve(__dirname, './src/lib/components'),
        '@stores': path.resolve(__dirname, './src/lib/stores'),
        '@services': path.resolve(__dirname, './src/lib/services'),
        '@utils': path.resolve(__dirname, './src/lib/utils'),
        '@shared': path.resolve(__dirname, './src/shared')
      },
      // Optimize dependency resolution
      dedupe: ['svelte', 'socket.io-client']
    },
    
    optimizeDeps: {
      include: ['svelte', 'socket.io-client'],
      exclude: ['@sveltejs/vite-plugin-svelte'],
      esbuildOptions: {
        target: 'es2020'
      }
    },
    
    server: {
      port: 5173,
      proxy: {
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
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info'] : []
        },
        mangle: {
          safari10: true
        }
      },
      
      // Advanced chunking strategy
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, `src/apps/${appName}/index.html`)
        },
        output: {
          manualChunks: (id) => {
            // Core vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('svelte')) return 'vendor-svelte'
              if (id.includes('socket.io')) return 'vendor-socketio'
              if (id.includes('chart') || id.includes('plotly')) return 'vendor-charts'
              if (id.includes('tailwind')) return 'vendor-styles'
              return 'vendor'
            }
            
            // App-specific chunks
            if (id.includes('/lib/components/charts/')) return 'components-charts'
            if (id.includes('/lib/components/ui/')) return 'components-ui'
            if (id.includes('/lib/services/')) return 'services'
            if (id.includes('/lib/stores/')) return 'stores'
            if (id.includes('/lib/utils/')) return 'utils'
          },
          
          // Optimize chunk names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : ''
            return isProduction ? `chunks/[name]-[hash].js` : `chunks/[name].js`
          },
          
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name.split('.').pop()
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img'
            }
            return isProduction ? `assets/${extType}/[name]-[hash][extname]` : `assets/${extType}/[name][extname]`
          }
        }
      },
      
      // Enable source maps in production for debugging
      sourcemap: isProduction ? 'hidden' : true,
      
      // Increase chunk size warning limit for Raspberry Pi
      chunkSizeWarningLimit: 1000,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Optimize assets
      assetsInlineLimit: 4096,
      
      // Report compressed size
      reportCompressedSize: true
    },
    
    // Production optimizations
    esbuild: {
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction
    },
    
    // CSS optimizations
    css: {
      devSourcemap: !isProduction,
      postcss: {
        plugins: isProduction ? [
          require('autoprefixer'),
          require('cssnano')({
            preset: ['default', {
              discardComments: {
                removeAll: true
              }
            }]
          })
        ] : []
      }
    }
  })
}

// Export individual app configs
export const hackrfConfig = createOptimizedConfig('hackrf')
export const wigleConfig = createOptimizedConfig('wigle')
export const kismetConfig = createOptimizedConfig('kismet')

// Default export
export default hackrfConfig