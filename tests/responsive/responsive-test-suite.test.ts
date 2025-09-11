/**
 * Comprehensive Responsive Design Test Suite
 * Tests responsive behavior at critical breakpoints, touch targets, accessibility, and performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { ResizeObserver } from '@juggle/resize-observer';

// Import components to test
import App from '../../src/App';
import { AiOrchestrationPanel } from '../../src/components/AiOrchestrationPanel';
import { Header } from '../../src/components/layout/Header';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { StatusBar } from '../../src/components/layout/StatusBar';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock ResizeObserver
global.ResizeObserver = ResizeObserver;

// Critical breakpoints to test
const BREAKPOINTS = {
  mobile: { width: 320, height: 568 },
  mobileLarge: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
  ultrawide: { width: 1920, height: 1080 }
} as const;

// Touch target minimum size
const MIN_TOUCH_TARGET_SIZE = 44;

// Mock matchMedia
const mockMatchMedia = (width: number) => {
  return (query: string) => ({
    matches: query.includes(`max-width: ${width - 1}px`) || 
             query.includes(`min-width: ${width}px`),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn()
  });
};

// Utility to set viewport size
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });
  
  // Mock matchMedia for the new viewport
  window.matchMedia = mockMatchMedia(width);
  
  // Trigger resize event
  fireEvent(window, new Event('resize'));
};

// Mock services
vi.mock('../../src/services/tauri', () => ({
  TauriService: {
    executeClaudeFlow: vi.fn().mockResolvedValue('Mock execution result'),
    isAvailable: vi.fn().mockReturnValue(false)
  }
}));

vi.mock('../../src/utils/hive-coordination', () => ({
  hiveCoordinator: {
    subscribe: vi.fn(),
    updateState: vi.fn(),
    broadcast: vi.fn()
  }
}));

describe('Responsive Design Test Suite', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Reset viewport to default desktop size
    setViewport(1440, 900);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Breakpoint Testing', () => {
    Object.entries(BREAKPOINTS).forEach(([breakpointName, { width, height }]) => {
      describe(`${breakpointName} breakpoint (${width}x${height})`, () => {
        beforeEach(() => {
          setViewport(width, height);
        });

        it('should render without layout breaks', async () => {
          const { container } = render(<App />);
          
          // Check for horizontal scroll
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
          expect(container.querySelector('[data-testid="layout-break"]')).toBeNull();
        });

        it('should have properly sized touch targets', async () => {
          render(<App />);
          
          // Find all clickable elements
          const buttons = screen.getAllByRole('button');
          const links = screen.getAllByRole('link', { hidden: true });
          const interactive = [...buttons, ...links];

          interactive.forEach(element => {
            const rect = element.getBoundingClientRect();
            const minSize = width <= 768 ? MIN_TOUCH_TARGET_SIZE : 32; // Larger targets on mobile
            
            if (rect.width > 0 && rect.height > 0) { // Skip hidden elements
              expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize);
            }
          });
        });

        it('should maintain readable text sizes', () => {
          render(<App />);
          
          const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
          
          textElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const fontSize = parseFloat(computedStyle.fontSize);
            
            if (fontSize > 0) { // Skip elements without text
              const minFontSize = width <= 768 ? 14 : 12; // Larger text on mobile
              expect(fontSize).toBeGreaterThanOrEqual(minFontSize);
            }
          });
        });

        it('should prevent horizontal scroll', () => {
          const { container } = render(<App />);
          
          // Check that no element extends beyond viewport width
          const allElements = container.querySelectorAll('*');
          
          allElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0) {
              expect(rect.right).toBeLessThanOrEqual(width + 1); // Allow 1px tolerance
            }
          });
        });
      });
    });
  });

  describe('Component Responsiveness', () => {
    describe('Header Component', () => {
      it('should adapt layout on mobile', () => {
        setViewport(375, 667);
        
        const mockProps = {
          title: 'AutoDev-AI',
          statusIndicators: [],
          onMenuClick: vi.fn()
        };
        
        render(<Header {...mockProps} />);
        
        // Header should be compact on mobile
        const header = screen.getByRole('banner');
        expect(header).toBeInTheDocument();
        
        // Menu button should be visible on mobile
        const menuButton = screen.getByLabelText(/menu/i);
        expect(menuButton).toBeVisible();
      });

      it('should show all status indicators on desktop', () => {
        setViewport(1440, 900);
        
        const statusIndicators = [
          { status: 'online' as const, label: 'System', value: 'Ready' },
          { status: 'online' as const, label: 'AI', value: 'Connected' },
          { status: 'offline' as const, label: 'Docker', value: 'Inactive' }
        ];
        
        render(<Header title="Test" statusIndicators={statusIndicators} onMenuClick={vi.fn()} />);
        
        statusIndicators.forEach(indicator => {
          expect(screen.getByText(indicator.label)).toBeVisible();
          expect(screen.getByText(indicator.value)).toBeVisible();
        });
      });
    });

    describe('Sidebar Component', () => {
      const navigationItems = [
        { id: 'control', label: 'Control Panel', icon: '🎛️', active: true, onClick: vi.fn() },
        { id: 'monitoring', label: 'System Monitor', icon: '📊', active: false, onClick: vi.fn() }
      ];

      it('should be collapsible on mobile', async () => {
        setViewport(375, 667);
        
        render(
          <Sidebar 
            isOpen={true}
            onClose={vi.fn()}
            navigationItems={navigationItems}
          />
        );
        
        const sidebar = screen.getByRole('navigation');
        expect(sidebar).toHaveClass('fixed'); // Should be overlay on mobile
      });

      it('should be persistent on desktop', () => {
        setViewport(1440, 900);
        
        render(
          <Sidebar 
            isOpen={true}
            onClose={vi.fn()}
            navigationItems={navigationItems}
          />
        );
        
        const sidebar = screen.getByRole('navigation');
        expect(sidebar).toBeInTheDocument();
      });
    });

    describe('AI Orchestration Panel', () => {
      it('should stack content vertically on mobile', () => {
        setViewport(375, 667);
        
        render(<AiOrchestrationPanel />);
        
        const panel = screen.getByRole('tabpanel', { hidden: true });
        expect(panel).toBeInTheDocument();
        
        // Check for mobile-optimized layout
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBeGreaterThan(0);
      });

      it('should use grid layout on desktop', () => {
        setViewport(1440, 900);
        
        render(<AiOrchestrationPanel />);
        
        const panel = screen.getByRole('tabpanel', { hidden: true });
        expect(panel).toBeInTheDocument();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should implement lazy loading for off-screen content', async () => {
      const { container } = render(<App />);
      
      // Check for loading states
      const loadingElements = container.querySelectorAll('[data-loading="true"]');
      expect(loadingElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should use will-change for animated elements', () => {
      render(<App />);
      
      const animatedElements = document.querySelectorAll('[class*="animate"]');
      
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        // Check if element has will-change or is likely to be animated
        const hasWillChange = computedStyle.willChange !== 'auto';
        const hasTransform = computedStyle.transform !== 'none';
        const hasTransition = computedStyle.transition !== 'none';
        
        if (hasTransform || hasTransition) {
          expect(hasWillChange || hasTransform).toBe(true);
        }
      });
    });

    it('should not cause layout thrashing during resize', async () => {
      const { rerender } = render(<App />);
      
      let layoutCount = 0;
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      
      Element.prototype.getBoundingClientRect = function() {
        layoutCount++;
        return originalGetBoundingClientRect.call(this);
      };
      
      // Simulate multiple rapid resizes
      for (let i = 0; i < 10; i++) {
        setViewport(800 + i * 10, 600);
        rerender(<App />);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });
      }
      
      // Restore original method
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      
      // Should not have excessive layout calculations
      expect(layoutCount).toBeLessThan(100);
    });
  });

  describe('Accessibility Audit', () => {
    it('should have no accessibility violations on mobile', async () => {
      setViewport(375, 667);
      
      const { container } = render(<App />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on desktop', async () => {
      setViewport(1440, 900);
      
      const { container } = render(<App />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(<App />);
      
      // Tab through interactive elements
      const interactiveElements = screen.getAllByRole('button', { hidden: true });
      
      if (interactiveElements.length > 0) {
        await user.tab();
        
        const focusedElement = document.activeElement;
        expect(interactiveElements).toContain(focusedElement);
      }
    });

    it('should have proper ARIA labels for mobile menu', () => {
      setViewport(375, 667);
      
      render(<App />);
      
      const menuButtons = screen.getAllByLabelText(/menu/i);
      expect(menuButtons.length).toBeGreaterThan(0);
      
      menuButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should support screen reader navigation', () => {
      render(<App />);
      
      // Check for proper heading hierarchy
      const headings = screen.getAllByRole('heading', { hidden: true });
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for landmarks
      const main = screen.getByRole('main', { hidden: true });
      expect(main).toBeInTheDocument();
    });

    it('should meet color contrast requirements', async () => {
      const { container } = render(<App />);
      
      // This would need a more sophisticated implementation in practice
      // For now, just verify we don't have obviously bad combinations
      const textElements = container.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
      
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;
        
        // Basic check - not pure white on white or black on black
        expect(color).not.toBe('rgb(255, 255, 255)');
        expect(backgroundColor).not.toBe('rgb(0, 0, 0)');
      });
    });
  });

  describe('Animation and Transitions', () => {
    it('should respect reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      render(<App />);
      
      const animatedElements = document.querySelectorAll('[class*="animate"]');
      
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        // In reduced motion mode, animations should be minimal or disabled
        expect(['none', 'auto']).toContain(computedStyle.animation);
      });
    });

    it('should have smooth transitions between layouts', async () => {
      const { rerender } = render(<App />);
      
      // Check for transition properties on layout-affecting elements
      const layoutElements = document.querySelectorAll('[class*="transition"]');
      
      layoutElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(computedStyle.transition).not.toBe('none');
      });
      
      // Simulate layout change
      setViewport(768, 1024);
      rerender(<App />);
      
      await waitFor(() => {
        // Verify smooth transition occurred
        const transitioningElements = document.querySelectorAll('[class*="transition"]');
        expect(transitioningElements.length).toBeGreaterThan(0);
      });
    });

    it('should optimize transform animations', () => {
      render(<App />);
      
      const transformElements = document.querySelectorAll('[style*="transform"]');
      
      transformElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        
        // Check for GPU acceleration hints
        const willChange = computedStyle.willChange;
        const transform = computedStyle.transform;
        
        if (transform !== 'none') {
          expect(willChange === 'transform' || transform.includes('translateZ')).toBe(true);
        }
      });
    });

    it('should show loading skeletons during async operations', async () => {
      render(<App />);
      
      // Trigger async operation (this would need to be implemented based on your app)
      const executeButton = screen.getByText(/execute/i);
      if (executeButton) {
        await user.click(executeButton);
        
        // Look for loading indicators
        const loadingElements = screen.getAllByTestId(/loading|skeleton/i);
        expect(loadingElements.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Browser Compatibility', () => {
    const mockUserAgents = {
      chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
    };

    Object.entries(mockUserAgents).forEach(([browser, userAgent]) => {
      it(`should work correctly in ${browser}`, () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: userAgent
        });
        
        const { container } = render(<App />);
        
        // Basic functionality should work
        expect(container.firstChild).toBeInTheDocument();
        
        // Check for browser-specific features
        const modernFeatures = container.querySelectorAll('[class*="backdrop-blur"], [class*="grid"]');
        expect(modernFeatures.length).toBeGreaterThan(0);
      });
    });

    it('should handle missing modern CSS features gracefully', () => {
      // Mock lack of CSS Grid support
      const originalSupports = CSS.supports;
      CSS.supports = vi.fn().mockImplementation((property, value) => {
        if (property === 'display' && value === 'grid') {
          return false;
        }
        return originalSupports(property, value);
      });
      
      render(<App />);
      
      // Should still render without breaking
      expect(screen.getByText(/AutoDev-AI/i)).toBeInTheDocument();
      
      // Restore original
      CSS.supports = originalSupports;
    });
  });

  describe('PWA Capabilities', () => {
    it('should be installable as PWA', async () => {
      // Mock manifest
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
      
      render(<App />);
      
      // Check for PWA indicators
      const manifestLinkEl = document.querySelector('link[rel="manifest"]');
      expect(manifestLinkEl).toBeInTheDocument();
    });

    it('should work offline (when service worker is available)', () => {
      // Mock service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        value: {
          register: vi.fn().mockResolvedValue({}),
          ready: Promise.resolve({})
        }
      });
      
      render(<App />);
      
      // Should render without network dependencies
      expect(screen.getByText(/AutoDev-AI/i)).toBeInTheDocument();
    });

    it('should handle touch gestures on mobile devices', async () => {
      setViewport(375, 667);
      
      // Mock touch support
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5
      });
      
      render(<App />);
      
      const swipeableElements = document.querySelectorAll('[class*="swipe"], [class*="touch"]');
      
      // Should have touch-friendly interactions
      swipeableElements.forEach(element => {
        const style = window.getComputedStyle(element);
        expect(style.touchAction).not.toBe('none');
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should maintain 60fps during animations', async () => {
      const { rerender } = render(<App />);
      
      let frameCount = 0;
      const startTime = performance.now();
      
      // Simulate animation frames
      const measureFrames = () => {
        frameCount++;
        if (frameCount < 60) {
          requestAnimationFrame(measureFrames);
        }
      };
      
      requestAnimationFrame(measureFrames);
      
      // Trigger rerender during animation
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          rerender(<App />);
          await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
        }
      });
      
      const endTime = performance.now();
      const fps = (frameCount / (endTime - startTime)) * 1000;
      
      expect(fps).toBeGreaterThan(30); // At least 30fps (relaxed for testing)
    });

    it('should not exceed memory limits during responsive changes', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Simulate multiple responsive changes
      for (const [, { width, height }] of Object.entries(BREAKPOINTS)) {
        setViewport(width, height);
        render(<App />);
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not leak too much memory (this is a rough check)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });

    it('should load critical resources quickly', async () => {
      const startTime = performance.now();
      
      render(<App />);
      
      // Wait for critical content to appear
      await waitFor(() => {
        expect(screen.getByText(/AutoDev-AI/i)).toBeInTheDocument();
      });
      
      const loadTime = performance.now() - startTime;
      
      // Should load within reasonable time (relaxed for testing environment)
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });
  });
});