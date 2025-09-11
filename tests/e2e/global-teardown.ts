import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  // Launch browser for cleanup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to application
    await page.goto('http://localhost:1420');

    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Stop any running processes
    console.log('⏹️ Stopping test processes...');

    console.log('✅ E2E test teardown complete');

  } catch (error) {
    console.error('❌ E2E teardown failed:', error);
    // Don't throw here as it would mask test failures
  } finally {
    await browser.close();
  }
}

export default globalTeardown;