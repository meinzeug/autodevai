/// <reference types="vite/client" />

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __TAURI__: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __TAURI_METADATA__: any;
  }
}

export {};
