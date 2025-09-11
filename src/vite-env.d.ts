/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TAURI_DEBUG: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_CLAUDE_API_KEY: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_GITHUB_TOKEN: string
  readonly VITE_DOCKER_REGISTRY: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ENABLE_DEVTOOLS?: string
  readonly VITE_FEATURE_DOCKER?: string
  readonly VITE_FEATURE_MONITORING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    __TAURI__: any
    __TAURI_METADATA__: any
  }
}

export {}
