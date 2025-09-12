import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react({
      // Optimize React refresh for development
      fastRefresh: true,
    }),
  ],

  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [
      '@tauri-apps/api',
    ],
  },

  // Build optimizations  
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-select'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  // Development server - optimized for both standalone and Tauri
  server: {
    port: process.env.TAURI_DEV ? 1420 : 50010,
    strictPort: true,
    host: '0.0.0.0',
    hmr: {
      port: process.env.TAURI_DEV ? 1421 : 50010,
    },
    watch: {
      ignored: ['**/src-tauri/**', '**/tests/**', '**/coverage/**'],
    },
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@store': path.resolve(__dirname, './src/store'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },

  // CSS processing
  css: {
    devSourcemap: true,
  },

  // Environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },

  // Prevent vite from obscuring rust errors for Tauri
  clearScreen: false,
  
  // Enable esbuild for TypeScript
  esbuild: {
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
}));