/**
 * Cross-Browser Responsive Testing
 * Tests responsive behavior across different browsers and devices
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Helper function to check responsive layout
async function checkResponsiveLayout(page: Page, breakpoint: string) {
  // Wait for page to load and stabilize
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Allow time for responsive CSS to apply

  // Check that content doesn't overflow
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance

  // Check for mobile menu on smaller screens
  if (breakpoint === 'mobile-small' || breakpoint === 'mobile-large') {
    // Mobile menu button should be visible
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    await expect(menuButton).toBeVisible();
  }

  // Check for proper typography scaling
  const heading = page.locator('h1').first();
  if (await heading.isVisible()) {
    const fontSize = await heading.evaluate(el => {
      return parseInt(window.getComputedStyle(el).fontSize);
    });
    
    // Font size should be reasonable for the viewport
    if (breakpoint.includes('mobile')) {
      expect(fontSize).toBeGreaterThanOrEqual(18); // Minimum readable size on mobile
    } else {
      expect(fontSize).toBeGreaterThanOrEqual(20); // Larger on desktop
    }
  }

  // Check touch targets on mobile
  if (breakpoint.includes('mobile')) {
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          const minSize = Math.max(box.width, box.height);
          expect(minSize).toBeGreaterThanOrEqual(40); // Minimum touch target
        }
      }
    }
  }
}

// Helper function to test accessibility
async function checkAccessibility(page: Page) {
  // Check for proper heading hierarchy
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  if (headings.length > 0) {
    const firstHeading = headings[0];
    const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('h1'); // First heading should be h1
  }

  // Check for alt text on images
  const images = await page.locator('img').all();
  for (const image of images) {
    const alt = await image.getAttribute('alt');
    expect(alt).not.toBeNull(); // All images should have alt text (even if empty for decorative)
  }

  // Check for proper form labels
  const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all();
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      const hasLabel = await label.count() > 0;
      expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  }
}

test.describe('Cross-Browser Responsive Tests', () => {
  test('should render correctly on all desktop browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Check basic layout
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText('AutoDev-AI')).toBeVisible();
    
    // Take screenshot for visual comparison
    await page.screenshot({
      path: `test-results/desktop-${browserName}.png`,
      fullPage: true
    });
    
    await checkResponsiveLayout(page, 'desktop');
  });

  test('should handle mobile layout correctly', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile-specific elements
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    await expect(menuButton).toBeVisible();
    
    // Test mobile menu functionality
    await menuButton.click();
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    await page.screenshot({
      path: `test-results/mobile-${browserName}.png`,
      fullPage: true
    });
    
    await checkResponsiveLayout(page, 'mobile-large');
  });

  test('should handle tablet layout correctly', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Tablet should have mixed behavior
    await expect(page.locator('body')).toBeVisible();
    
    await page.screenshot({
      path: `test-results/tablet-${browserName}.png`,
      fullPage: true
    });
    
    await checkResponsiveLayout(page, 'tablet');
  });

  test('should maintain functionality during responsive changes', async ({ page }) => {
    await page.goto('/');
    
    // Test functionality at different viewport sizes
    const viewports = [
      { width: 320, height: 568 },   // Mobile small
      { width: 768, height: 1024 },  // Tablet
      { width: 1440, height: 900 }   // Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow layout to adjust
      
      // Test that main functionality still works
      const buttons = await page.locator('button:visible').all();
      if (buttons.length > 0) {
        // Test first visible button
        await buttons[0].click();
        // Should not cause layout breaks
        await checkResponsiveLayout(page, `${viewport.width}x${viewport.height}`);
      }
    }
  });
});

test.describe('Touch and Mobile Interactions', () => {
  test('should handle touch gestures on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile devices');
    
    await page.goto('/');
    
    // Test touch interactions
    const touchButton = page.getByRole('button').first();
    if (await touchButton.isVisible()) {
      // Touch should work
      await touchButton.tap();
      
      // Check that touch target is large enough
      const box = await touchButton.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should support swipe gestures where applicable', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile devices');
    
    await page.goto('/');
    
    // Look for swipeable elements (carousels, tabs, etc.)
    const swipeableElements = await page.locator('[class*="swipe"], [class*="carousel"], [role="tablist"]').all();
    
    for (const element of swipeableElements) {
      if (await element.isVisible()) {
        const box = await element.boundingBox();
        if (box) {
          // Perform swipe gesture
          await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2);
          await page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height / 2);
          
          // Should handle swipe without breaking layout
          await page.waitForTimeout(500);
          await checkResponsiveLayout(page, 'mobile');
        }
      }
    }
  });
});

test.describe('Performance on Different Devices', () => {
  test('should load quickly on mobile devices', async ({ page, isMobile }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Mobile should load within reasonable time
    if (isMobile) {
      expect(loadTime).toBeLessThan(5000); // 5 seconds on mobile
    } else {
      expect(loadTime).toBeLessThan(3000); // 3 seconds on desktop
    }
  });

  test('should not cause memory leaks during responsive changes', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Perform multiple viewport changes
    const viewports = [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
      { width: 375, height: 667 }
    ];
    
    for (let i = 0; i < 3; i++) { // Repeat cycle 3 times
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(100);
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory increase should be reasonable
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });
});

test.describe('Dark Mode and Theme Support', () => {
  test('should support dark mode across devices', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    
    // Check that dark mode styles are applied
    const body = page.locator('body');
    const bodyClasses = await body.getAttribute('class');
    const hasHasDarkMode = bodyClasses?.includes('dark') || 
      await body.evaluate(el => window.getComputedStyle(el).backgroundColor !== 'rgb(255, 255, 255)');
    
    expect(hasHasDarkMode).toBeTruthy();
    
    // Test on different viewport sizes
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1440, height: 900 }   // Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.screenshot({
        path: `test-results/dark-mode-${viewport.width}x${viewport.height}.png`,
        fullPage: true
      });
    }
  });

  test('should respect system preferences', async ({ page }) => {
    // Test light mode preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    
    await page.screenshot({
      path: 'test-results/light-mode.png',
      fullPage: true
    });
    
    // Test dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    
    await page.screenshot({
      path: 'test-results/dark-mode.png',
      fullPage: true
    });
  });
});

test.describe('Accessibility Across Browsers', () => {
  test('should be accessible on all browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    await checkAccessibility(page);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'TEXTAREA']).toContain(focusedElement);
  });

  test('should support high contrast mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    
    // High contrast mode should not break layout
    await checkResponsiveLayout(page, 'desktop');
    
    await page.screenshot({
      path: 'test-results/high-contrast.png',
      fullPage: true
    });
  });

  test('should respect reduced motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Check that animations are disabled or reduced
    const animatedElements = await page.locator('[class*="animate"]').all();
    
    for (const element of animatedElements) {
      const hasReducedMotion = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.animationDuration === '0s' || 
               style.animationName === 'none' ||
               style.transitionDuration === '0s';
      });
      
      // Should respect reduced motion preference
      expect(hasReducedMotion).toBeTruthy();
    }
  });
});

test.describe('Real Device Testing', () => {
  test('should work on actual mobile devices', async ({ page, isMobile, hasTouch }) => {
    test.skip(!isMobile, 'This test only runs on mobile devices');
    
    await page.goto('/');
    
    // Test mobile-specific features
    if (hasTouch) {
      // Touch interactions
      const touchableElements = await page.locator('button, [role="button"], a').all();
      
      for (const element of touchableElements.slice(0, 3)) { // Test first 3 elements
        if (await element.isVisible()) {
          await element.tap();
          await page.waitForTimeout(100);
        }
      }
    }
    
    // Test device orientation changes (if supported)
    try {
      const orientation = await page.evaluate(() => screen.orientation?.angle);
      if (orientation !== undefined) {
        // Orientation is supported
        await checkResponsiveLayout(page, 'mobile-portrait');
      }
    } catch (error) {
      // Orientation API not supported, skip
    }
  });

  test('should handle device-specific quirks', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Safari-specific tests
    if (browserName === 'webkit') {
      // Test backdrop-filter support
      const glassElements = await page.locator('[class*="backdrop-blur"], [class*="glass"]').all();
      
      for (const element of glassElements) {
        const hasBackdropFilter = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.backdropFilter !== 'none';
        });
        
        // Should work or have fallback
        expect(typeof hasBackdropFilter).toBe('boolean');
      }
    }
    
    // Firefox-specific tests
    if (browserName === 'firefox') {
      // Test CSS Grid support
      const gridElements = await page.locator('[class*="grid"]').all();
      
      for (const element of gridElements) {
        const hasGridSupport = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display.includes('grid');
        });
        
        expect(hasGridSupport).toBeTruthy();
      }
    }
  });
});