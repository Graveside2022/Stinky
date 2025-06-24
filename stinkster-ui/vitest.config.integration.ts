import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    name: 'integration',
    include: ['src/**/*.integration.{test,spec}.{js,ts}', 'tests/integration/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results/integration.json',
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib'),
      '$shared': path.resolve('./src/shared'),
      '$hackrf': path.resolve('./src/apps/hackrf'),
      '$wigle': path.resolve('./src/apps/wigle'),
      '$kismet': path.resolve('./src/apps/kismet'),
    },
  },
})