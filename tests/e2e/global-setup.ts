import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for application to be ready
    console.log('⏳ Waiting for application to start...');
    await page.goto('http://localhost:1420', { waitUntil: 'networkidle' });
    
    // Verify application is loaded
    await page.waitForSelector('[data-testid="app-container"]', { 
      timeout: 30000 
    });

    // Setup test environment
    console.log('🔧 Setting up test environment...');
    
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Setup test data if needed
    await page.evaluate(() => {
      localStorage.setItem('test-mode', 'true');
    });

    console.log('✅ E2E test environment setup complete');

  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;