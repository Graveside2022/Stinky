/// <reference types="svelte" />
/// <reference types="vite/client" />

// Environment variable types
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_BASE_URL?: string
  readonly VITE_HACKRF_PORT?: string
  readonly VITE_WIGLE_PORT?: string
  readonly VITE_KISMET_PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Module declarations
declare module '*.svelte' {
  import type { ComponentType } from 'svelte'
  const component: ComponentType
  export default component
}

declare module '$app/environment' {
  export const browser: boolean
  export const dev: boolean
  export const building: boolean
  export const version: string
}
