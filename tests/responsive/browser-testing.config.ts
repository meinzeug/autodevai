/**
 * Browser Testing Configuration
 * Cross-browser testing setup with responsive viewport testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:50010',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 }
      }
    },

    // Tablet devices
    {
      name: 'ipad',
      use: { ...devices['iPad'] }
    },
    {
      name: 'ipad-pro',
      use: { ...devices['iPad Pro'] }
    },
    {
      name: 'android-tablet',
      use: {
        ...devices['Galaxy Tab S4'],
        viewport: { width: 768, height: 1024 }
      }
    },

    // Mobile devices
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] }
    },
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'] }
    },
    {
      name: 'pixel-5',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'galaxy-s8',
      use: { ...devices['Galaxy S8'] }
    },

    // Custom responsive breakpoints
    {
      name: 'mobile-small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'mobile-large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'tablet-portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: false,
        hasTouch: true
      }
    },
    {
      name: 'laptop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 }
      }
    },
    {
      name: 'desktop-large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Accessibility testing
    {
      name: 'high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
        forcedColors: 'active'
      }
    },
    {
      name: 'reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce'
      }
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 50010,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});