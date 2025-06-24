import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        // Enable runtime checks in development
        dev: process.env.NODE_ENV !== 'production'
      }
    })
  ],
  
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib'),
      '$components': path.resolve('./src/components'),
      '$stores': path.resolve('./src/stores'),
      '$utils': path.resolve('./src/utils')
    }
  },
  
  server: {
    port: 5173,
    host: true, // Allow external connections
    
    proxy: {
      // Proxy API requests to backend services
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      
      // Socket.IO for Spectrum Analyzer
      '/socket.io': {
        target: 'http://localhost:8092',
        ws: true,
        changeOrigin: true
      },
      
      // Kismet proxy
      '/kismet': {
        target: 'http://localhost:2501',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/kismet/, '')
      },
      
      // WigleToTAK API
      '/wigle': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-svelte': ['svelte', 'svelte/store', 'svelte/transition'],
          'vendor-plotting': ['plotly.js-dist-min'],
          'vendor-cesium': ['cesium'],
          'vendor-utils': ['socket.io-client', 'mgrs']
        },
        
        // Asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    },
    
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  optimizeDeps: {
    include: [
      'svelte',
      'plotly.js-dist-min',
      'socket.io-client',
      'cesium',
      'mgrs'
    ],
    exclude: ['svelte-navigator']
  },
  
  // Environment variables
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    '__BUILD_DATE__': JSON.stringify(new Date().toISOString())
  }
});