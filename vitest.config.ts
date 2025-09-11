/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './tests/setup.ts',
      './tests/unit/setup.ts'
    ],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e',
      'tests/performance',
      'tests/security'
    ],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './tests/coverage',
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}',
        '!src/main.tsx',
        '!src/vite-env.d.ts'
      ],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'src-tauri/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/mock*.{js,ts}',
        '**/__tests__/**',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}'
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 75,
          lines: 80
        }
      },
      all: true,
      clean: true
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './tests/coverage/vitest-results.json',
      html: './tests/coverage/vitest-results.html'
    },
    watch: false,
    ui: true,
    open: false,
    passWithNoTests: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@store': path.resolve(__dirname, './src/store'),
      '@tests': path.resolve(__dirname, './tests'),
      '@mocks': path.resolve(__dirname, './tests/mocks'),
      '@tauri-apps/api/tauri': path.resolve(__dirname, './tests/mocks/@tauri-apps/api/tauri.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, './tests/mocks/@tauri-apps/api/event.ts'),
      '@tauri-apps/api/shell': path.resolve(__dirname, './tests/mocks/@tauri-apps/api/shell.ts'),
    }
  },
  define: {
    'import.meta.vitest': 'undefined'
  }
});