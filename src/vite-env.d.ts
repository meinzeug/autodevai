/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEVTOOLS?: string;
  readonly VITE_FEATURE_DOCKER?: string;
  readonly VITE_FEATURE_MONITORING?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
