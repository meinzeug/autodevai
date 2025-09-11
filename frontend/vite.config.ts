import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Clear screen on reload
  clearScreen: false,
  
  // Tauri expects a fixed port, fail if port not available
  server: {
    port: 1420,
    strictPort: true,
  },
  
  // Environment prefix for client-side env variables
  envPrefix: ['VITE_', 'TAURI_'],
  
  // Build configuration
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    
    // Output directory
    outDir: '../dist',
    
    // Empty output directory before build
    emptyOutDir: true,
    
    // Rollup options
    rollupOptions: {
      external: ['@tauri-apps/api'],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          'state-vendor': ['zustand'],
          'utils-vendor': ['clsx', 'date-fns']
        }
      }
    }
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@stores': resolve(__dirname, './src/stores'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@styles': resolve(__dirname, './src/styles')
    }
  },
  
  // CSS configuration
  css: {
    postcss: './postcss.config.js'
  },
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tauri-apps/api',
      'zustand'
    ]
  }
})