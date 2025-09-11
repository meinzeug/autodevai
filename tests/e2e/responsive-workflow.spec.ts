/**
 * @fileoverview End-to-end tests for responsive workflow
 * Comprehensive E2E testing across devices and user flows
 */

import { test, expect, devices } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test configuration for different viewport sizes
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 }
};

// Utility functions for common test operations
const waitForLayout = async (page: Page, layoutMode: string) => {
  await expect(page.locator('[data-testid="layout-container"]')).toBeVisible();
  await page.waitForSelector(`[data-layout-mode="${layoutMode}"]`, { timeout: 5000 });
};

const openSidebar = async (page: Page) => {
  await page.click('[data-testid="menu-button"]');
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
};

const closeSidebar = async (page: Page) => {
  await page.click('[data-testid="sidebar-close"]');
  await expect(page.locator('[data-testid="sidebar"]')).toBeHidden();
};

// Main test suite
test.describe('Responsive Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Desktop Experience', () => {
    test.use({ viewport: viewports.desktop });

    test('should display full layout with persistent sidebar', async ({ page }) => {
      // Verify desktop layout is active
      await waitForLayout(page, 'desktop');
      
      // Sidebar should be visible by default
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'true');
      
      // Header should show full content
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
      await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
      
      // Main content should be properly positioned
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Footer should be visible
      await expect(page.locator('[data-testid="footer"]')).toBeVisible();
    });

    test('should handle navigation between sections', async ({ page }) => {
      await waitForLayout(page, 'desktop');
      
      // Navigate to AI Orchestration
      await page.click('[data-testid="nav-orchestration"]');
      await expect(page.locator('[data-testid="orchestration-panel"]')).toBeVisible();
      
      // Navigate to Configuration
      await page.click('[data-testid="nav-configuration"]');
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
      
      // Navigate back to Dashboard
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('should maintain layout state during browser resize', async ({ page }) => {
      await waitForLayout(page, 'desktop');
      
      // Verify initial state
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Resize to tablet
      await page.setViewportSize(viewports.tablet);
      await waitForLayout(page, 'tablet');
      
      // Resize back to desktop
      await page.setViewportSize(viewports.desktop);
      await waitForLayout(page, 'desktop');
      
      // Sidebar should be restored
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await waitForLayout(page, 'desktop');
      
      // Tab through navigation items
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="nav-orchestration"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="nav-configuration"]')).toBeFocused();
      
      // Enter should activate navigation
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
    });
  });

  test.describe('Tablet Experience', () => {
    test.use({ viewport: viewports.tablet });

    test('should display overlay sidebar on tablet', async ({ page }) => {
      await waitForLayout(page, 'tablet');
      
      // Sidebar should be hidden by default
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'false');
      
      // Menu button should be visible
      await expect(page.locator('[data-testid="menu-button"]')).toBeVisible();
      
      // Open sidebar
      await openSidebar(page);
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'true');
      
      // Backdrop should be visible
      await expect(page.locator('.fixed.inset-0.bg-black\\/30')).toBeVisible();
      
      // Close sidebar by clicking backdrop
      await page.click('.fixed.inset-0.bg-black\\/30');
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'false');
    });

    test('should adapt content layout for tablet', async ({ page }) => {
      await waitForLayout(page, 'tablet');
      
      // Content should use tablet spacing
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toHaveClass(/sm:p-4/);
      
      // Navigation should work with overlay
      await openSidebar(page);
      await page.click('[data-testid="nav-orchestration"]');
      await expect(page.locator('[data-testid="orchestration-panel"]')).toBeVisible();
      
      // Sidebar should auto-close after navigation on tablet
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'false');
    });

    test('should handle touch interactions', async ({ page }) => {
      await waitForLayout(page, 'tablet');
      
      // Simulate touch to open sidebar
      await page.tap('[data-testid="menu-button"]');
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'true');
      
      // Simulate swipe gesture (touch drag to close)
      const sidebar = page.locator('[data-testid="sidebar"]');
      const box = await sidebar.boundingBox();
      
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.touchscreen.tap(box.x - 100, box.y + box.height / 2);
      }
    });
  });

  test.describe('Mobile Experience', () => {
    test.use({ viewport: viewports.mobile });

    test('should display drawer sidebar on mobile', async ({ page }) => {
      await waitForLayout(page, 'mobile');
      
      // Sidebar should be hidden by default
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'false');
      
      // Menu button should be prominent
      await expect(page.locator('[data-testid="menu-button"]')).toBeVisible();
      
      // Open sidebar
      await openSidebar(page);
      
      // Should take full width on mobile
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toHaveClass(/w-80|max-w-\[85vw\]/);
      
      // Should have backdrop
      await expect(page.locator('.fixed.inset-0.bg-black\\/50')).toBeVisible();
    });

    test('should optimize content for mobile', async ({ page }) => {
      await waitForLayout(page, 'mobile');
      
      // Content should use mobile spacing
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toHaveClass(/p-3/);
      
      // Text should be appropriate size
      const headings = page.locator('h1, h2, h3');
      await expect(headings.first()).toHaveClass(/text-lg|text-xl/);
    });

    test('should handle mobile navigation flow', async ({ page }) => {
      await waitForLayout(page, 'mobile');
      
      // Open sidebar
      await openSidebar(page);
      
      // Navigate to orchestration
      await page.click('[data-testid="nav-orchestration"]');
      
      // Sidebar should close automatically
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'false');
      
      // Content should be visible
      await expect(page.locator('[data-testid="orchestration-panel"]')).toBeVisible();
      
      // Return to dashboard
      await openSidebar(page);
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('should support mobile accessibility', async ({ page }) => {
      await waitForLayout(page, 'mobile');
      
      // Menu button should have proper ARIA attributes
      const menuButton = page.locator('[data-testid="menu-button"]');
      await expect(menuButton).toHaveAttribute('aria-label');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      // Open sidebar
      await page.click('[data-testid="menu-button"]');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      // Navigation should have proper roles
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="main"]')).toBeVisible();
    });
  });

  test.describe('Cross-Device Compatibility', () => {
    test('should maintain session state across device changes', async ({ page }) => {
      // Start on desktop
      await page.setViewportSize(viewports.desktop);
      await waitForLayout(page, 'desktop');
      
      // Navigate to configuration
      await page.click('[data-testid="nav-configuration"]');
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
      
      // Switch to mobile
      await page.setViewportSize(viewports.mobile);
      await waitForLayout(page, 'mobile');
      
      // Content should still be visible
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
      
      // Switch back to desktop
      await page.setViewportSize(viewports.desktop);
      await waitForLayout(page, 'desktop');
      
      // Should maintain state
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
    });

    test('should handle orientation changes on mobile', async ({ page }) => {
      // Portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForLayout(page, 'mobile');
      
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await waitForLayout(page, 'mobile');
      
      // Layout should adapt
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load responsively without layout shift', async ({ page }) => {
      // Monitor for layout shifts
      let cumulativeLayoutShift = 0;
      
      await page.addInitScript(() => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        (window as any).__cls = () => cls;
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Get final CLS score
      cumulativeLayoutShift = await page.evaluate(() => (window as any).__cls());
      
      // CLS should be minimal (< 0.1 is good, < 0.25 is acceptable)
      expect(cumulativeLayoutShift).toBeLessThan(0.25);
    });

    test('should load quickly on slow networks', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/');
      await waitForLayout(page, 'desktop');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time even on slow network
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should be responsive under heavy load', async ({ page }) => {
      await page.goto('/');
      await waitForLayout(page, 'desktop');
      
      // Simulate multiple rapid interactions
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          page.click('[data-testid="nav-orchestration"]').then(() =>
            page.click('[data-testid="nav-configuration"]')
          ).then(() =>
            page.click('[data-testid="nav-dashboard"]')
          )
        );
      }
      
      await Promise.all(promises);
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      // Inject an error
      await page.addInitScript(() => {
        window.addEventListener('error', (e) => {
          console.log('Caught error:', e.error?.message);
        });
      });
      
      await page.goto('/');
      
      // Simulate runtime error
      await page.evaluate(() => {
        throw new Error('Test runtime error');
      });
      
      // Layout should still work
      await waitForLayout(page, 'desktop');
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('should handle network failures', async ({ page, context }) => {
      await page.goto('/');
      await waitForLayout(page, 'desktop');
      
      // Simulate network failure
      await context.setOffline(true);
      
      // Basic functionality should still work
      await page.setViewportSize(viewports.mobile);
      await waitForLayout(page, 'mobile');
      
      // UI should remain functional
      await openSidebar(page);
      await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-open', 'true');
    });

    test('should handle extreme viewport sizes', async ({ page }) => {
      // Very small viewport
      await page.setViewportSize({ width: 200, height: 300 });
      await page.goto('/');
      
      // Should still be usable
      await expect(page.locator('[data-testid="menu-button"]')).toBeVisible();
      
      // Very large viewport
      await page.setViewportSize({ width: 3840, height: 2160 });
      await waitForLayout(page, 'desktop');
      
      // Layout should scale appropriately
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });

  test.describe('Accessibility E2E', () => {
    test('should be navigable via keyboard on all devices', async ({ page }) => {
      // Test on desktop
      await page.setViewportSize(viewports.desktop);
      await page.goto('/');
      await waitForLayout(page, 'desktop');
      
      // Navigate with keyboard
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(['nav-dashboard', 'nav-orchestration', 'nav-configuration']).toContain(focusedElement);
      
      // Test on mobile
      await page.setViewportSize(viewports.mobile);
      await waitForLayout(page, 'mobile');
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="menu-button"]')).toBeFocused();
    });

    test('should announce layout changes to screen readers', async ({ page }) => {
      await page.goto('/');
      
      // This would require screen reader testing tools
      // For now, verify ARIA attributes are present
      await page.setViewportSize(viewports.mobile);
      await waitForLayout(page, 'mobile');
      
      const menuButton = page.locator('[data-testid="menu-button"]');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      await page.click('[data-testid="menu-button"]');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    test('should support high contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      await page.goto('/');
      await waitForLayout(page, 'desktop');
      
      // Elements should remain visible and interactive
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });

  test.describe('Real-World Scenarios', () => {
    test('should handle typical user workflow', async ({ page }) => {
      await page.goto('/');
      await waitForLayout(page, 'desktop');
      
      // User opens AI orchestration
      await page.click('[data-testid="nav-orchestration"]');
      await expect(page.locator('[data-testid="orchestration-panel"]')).toBeVisible();
      
      // Configure some settings
      await page.click('[data-testid="nav-configuration"]');
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
      
      // Switch to mobile view (user rotates device or changes window size)
      await page.setViewportSize(viewports.mobile);
      await waitForLayout(page, 'mobile');
      
      // Configuration should still be visible
      await expect(page.locator('[data-testid="configuration-panel"]')).toBeVisible();
      
      // User navigates via mobile menu
      await openSidebar(page);
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('should handle multi-user collaborative scenario', async ({ page, context }) => {
      // Simulate multiple browser instances
      const secondPage = await context.newPage();
      
      // Both users load the app
      await page.goto('/');
      await secondPage.goto('/');
      
      await waitForLayout(page, 'desktop');
      await waitForLayout(secondPage, 'desktop');
      
      // Different viewport sizes for different users
      await page.setViewportSize(viewports.desktop);
      await secondPage.setViewportSize(viewports.tablet);
      
      // Both should work independently
      await page.click('[data-testid="nav-orchestration"]');
      await secondPage.click('[data-testid="nav-configuration"]');
      
      await expect(page.locator('[data-testid="orchestration-panel"]')).toBeVisible();
      await expect(secondPage.locator('[data-testid="configuration-panel"]')).toBeVisible();
      
      await secondPage.close();
    });
  });
});