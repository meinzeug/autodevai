/**
 * @fileoverview Comprehensive tests for responsive hooks
 * Tests all responsive React hooks and their behaviors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMediaQuery,
  useBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouch,
  useOrientation,
  useWindowSize,
  useViewport,
  usePrefersReducedMotion,
  usePrefersHighContrast,
  usePrefersDarkMode,
  useResponsiveValue,
  useDeviceInfo,
  useIsFullscreen,
  useResponsiveClasses,
  useResponsiveRender,
  useResponsiveGrid,
  BREAKPOINTS,
  type Breakpoint,
  type ResponsiveValue,
  type WindowSize,
  type DeviceInfo
} from '../../../src/hooks/useResponsive';

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

// Mock window resize
const mockWindowResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, 'outerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'outerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('Responsive Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window dimensions
    mockWindowResize(1024, 768);
    // Reset matchMedia
    window.matchMedia = mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useMediaQuery', () => {
    it('should return false initially when query does not match', () => {
      window.matchMedia = mockMatchMedia(false);
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);
    });

    it('should return true when query matches', () => {
      window.matchMedia = mockMatchMedia(true);
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(true);
    });

    it('should update when media query changes', () => {
      const mediaQueryList = {
        matches: false,
        media: '(max-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mediaQueryList);

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);

      // Simulate media query change
      act(() => {
        mediaQueryList.matches = true;
        const callback = mediaQueryList.addEventListener.mock.calls.find(
          call => call[0] === 'change'
        )?.[1];
        if (callback) {
          callback({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);
    });

    it('should handle SSR environment gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);

      global.window = originalWindow;
    });

    it('should clean up event listeners', () => {
      const mediaQueryList = {
        matches: false,
        media: '(max-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mediaQueryList);

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      
      expect(mediaQueryList.addEventListener).toHaveBeenCalled();
      
      unmount();
      
      expect(mediaQueryList.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('useBreakpoint', () => {
    it('should detect xs breakpoint', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const isXs = query.includes('max-width: 639px');
        return {
          matches: isXs,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useBreakpoint());
      
      expect(result.current.isXs).toBe(true);
      expect(result.current.current).toBe('xs');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect lg breakpoint', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const isLg = query.includes('min-width: 1024px') && query.includes('max-width: 1279px');
        return {
          matches: isLg,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useBreakpoint());
      
      expect(result.current.isLg).toBe(true);
      expect(result.current.current).toBe('lg');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('should provide comparison utilities', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const isMd = query.includes('min-width: 768px') && query.includes('max-width: 1023px');
        return {
          matches: isMd,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useBreakpoint());
      
      expect(result.current.current).toBe('md');
      expect(result.current.isAbove('xs')).toBe(true);
      expect(result.current.isAbove('lg')).toBe(false);
      expect(result.current.isBelow('lg')).toBe(true);
      expect(result.current.isBelow('xs')).toBe(false);
      expect(result.current.isAtLeast('sm')).toBe(true);
      expect(result.current.isAtLeast('xl')).toBe(false);
    });

    it('should provide device category flags', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const isSm = query.includes('min-width: 640px') && query.includes('max-width: 767px');
        return {
          matches: isSm,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useBreakpoint());
      
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobileOrTablet).toBe(true);
      expect(result.current.isTabletOrDesktop).toBe(false);
      expect(result.current.isSmallScreen).toBe(true);
      expect(result.current.isLargeScreen).toBe(false);
    });
  });

  describe('Individual breakpoint hooks', () => {
    it('should detect mobile correctly', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width: 767px'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should detect tablet correctly', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(true);
    });

    it('should detect desktop correctly', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width: 1024px'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(true);
    });
  });

  describe('useIsTouch', () => {
    it('should detect touch support via ontouchstart', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: null,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useIsTouch());
      expect(result.current).toBe(true);
    });

    it('should detect touch support via maxTouchPoints', () => {
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 1,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useIsTouch());
      expect(result.current).toBe(true);
    });

    it('should return false when no touch support', () => {
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useIsTouch());
      expect(result.current).toBe(false);
    });

    it('should handle SSR environment', () => {
      const originalWindow = global.window;
      const originalNavigator = global.navigator;
      
      // @ts-ignore
      delete global.window;
      // @ts-ignore
      delete global.navigator;

      const { result } = renderHook(() => useIsTouch());
      expect(result.current).toBe(false);

      global.window = originalWindow;
      global.navigator = originalNavigator;
    });
  });

  describe('useOrientation', () => {
    it('should detect portrait orientation', () => {
      mockWindowResize(800, 1200);
      
      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('portrait');
    });

    it('should detect landscape orientation', () => {
      mockWindowResize(1200, 800);
      
      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('landscape');
    });

    it('should update on resize', () => {
      mockWindowResize(800, 1200);
      
      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('portrait');

      act(() => {
        mockWindowResize(1200, 800);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('landscape');
    });

    it('should update on orientation change', () => {
      mockWindowResize(800, 1200);
      
      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('portrait');

      act(() => {
        mockWindowResize(1200, 800);
        window.dispatchEvent(new Event('orientationchange'));
      });

      expect(result.current).toBe('landscape');
    });

    it('should clean up event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOrientation());
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });
  });

  describe('useWindowSize', () => {
    it('should return current window dimensions', () => {
      mockWindowResize(1024, 768);
      
      const { result } = renderHook(() => useWindowSize());
      
      expect(result.current).toEqual({
        width: 1024,
        height: 768,
        innerWidth: 1024,
        innerHeight: 768,
        outerWidth: 1024,
        outerHeight: 768,
      });
    });

    it('should debounce resize events', async () => {
      mockWindowResize(1024, 768);
      
      const { result } = renderHook(() => useWindowSize(50));
      
      expect(result.current.width).toBe(1024);

      act(() => {
        mockWindowResize(1200, 900);
        window.dispatchEvent(new Event('resize'));
      });

      // Should not update immediately due to debouncing
      expect(result.current.width).toBe(1024);

      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });

      expect(result.current.width).toBe(1200);
    });

    it('should handle SSR environment', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const { result } = renderHook(() => useWindowSize());
      
      expect(result.current).toEqual({
        width: 0,
        height: 0,
        innerWidth: 0,
        innerHeight: 0,
        outerWidth: 0,
        outerHeight: 0,
      });

      global.window = originalWindow;
    });
  });

  describe('useViewport', () => {
    it('should return viewport dimensions', () => {
      mockWindowResize(1024, 768);
      
      const { result } = renderHook(() => useViewport());
      
      expect(result.current).toEqual({
        width: 1024,
        height: 768,
      });
    });
  });

  describe('Preference hooks', () => {
    it('should detect reduced motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => usePrefersReducedMotion());
      expect(result.current).toBe(true);
    });

    it('should detect high contrast preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => usePrefersHighContrast());
      expect(result.current).toBe(true);
    });

    it('should detect dark mode preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => usePrefersDarkMode());
      expect(result.current).toBe(true);
    });
  });

  describe('useResponsiveValue', () => {
    const setupBreakpoint = (current: Breakpoint) => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const breakpointMatches = {
          xs: query.includes('max-width: 639px'),
          sm: query.includes('min-width: 640px') && query.includes('max-width: 767px'),
          md: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
          lg: query.includes('min-width: 1024px') && query.includes('max-width: 1279px'),
          xl: query.includes('min-width: 1280px') && query.includes('max-width: 1535px'),
          '2xl': query.includes('min-width: 1536px'),
        };
        
        return {
          matches: breakpointMatches[current] || false,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    };

    it('should return primitive values directly', () => {
      setupBreakpoint('md');
      
      const { result } = renderHook(() => useResponsiveValue('test'));
      expect(result.current).toBe('test');
    });

    it('should return correct responsive value with mobile-first strategy', () => {
      setupBreakpoint('md');
      
      const values: ResponsiveValue<string> = {
        xs: 'xs-value',
        sm: 'sm-value',
        md: 'md-value',
        lg: 'lg-value',
      };

      const { result } = renderHook(() => useResponsiveValue(values, 'mobile-first'));
      expect(result.current).toBe('md-value');
    });

    it('should fallback to smaller breakpoint with mobile-first strategy', () => {
      setupBreakpoint('md');
      
      const values: ResponsiveValue<string> = {
        xs: 'xs-value',
        sm: 'sm-value',
        lg: 'lg-value',
      };

      const { result } = renderHook(() => useResponsiveValue(values, 'mobile-first'));
      expect(result.current).toBe('sm-value');
    });

    it('should work with desktop-first strategy', () => {
      setupBreakpoint('md');
      
      const values: ResponsiveValue<string> = {
        xs: 'xs-value',
        lg: 'lg-value',
        xl: 'xl-value',
      };

      const { result } = renderHook(() => useResponsiveValue(values, 'desktop-first'));
      expect(result.current).toBe('lg-value');
    });

    it('should return undefined when no matching value found', () => {
      setupBreakpoint('md');
      
      const values: ResponsiveValue<string> = {
        xl: 'xl-value',
        '2xl': '2xl-value',
      };

      const { result } = renderHook(() => useResponsiveValue(values, 'mobile-first'));
      expect(result.current).toBeUndefined();
    });
  });

  describe('useDeviceInfo', () => {
    it('should return comprehensive device information', () => {
      // Setup for tablet
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const isMd = query.includes('min-width: 768px') && query.includes('max-width: 1023px');
        return {
          matches: isMd,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      mockWindowResize(800, 1200); // Portrait
      
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useDeviceInfo());
      
      expect(result.current).toEqual({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isTouch: false, // Default in test environment
        orientation: 'portrait',
        pixelRatio: 2,
      });
    });
  });

  describe('useIsFullscreen', () => {
    it('should detect fullscreen state', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: document.body,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useIsFullscreen());
      expect(result.current).toBe(true);
    });

    it('should detect non-fullscreen state', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useIsFullscreen());
      expect(result.current).toBe(false);
    });

    it('should update on fullscreen change', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useIsFullscreen());
      expect(result.current).toBe(false);

      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: document.body,
          writable: true,
          configurable: true
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useResponsiveClasses', () => {
    const setupBreakpoint = (current: Breakpoint) => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const breakpointMatches = {
          xs: query.includes('max-width: 639px'),
          sm: query.includes('min-width: 640px') && query.includes('max-width: 767px'),
          md: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
          lg: query.includes('min-width: 1024px') && query.includes('max-width: 1279px'),
          xl: query.includes('min-width: 1280px') && query.includes('max-width: 1535px'),
          '2xl': query.includes('min-width: 1536px'),
        };
        
        return {
          matches: breakpointMatches[current] || false,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    };

    it('should combine base and responsive classes', () => {
      setupBreakpoint('md');
      
      const responsiveClasses = {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      };

      const { result } = renderHook(() => 
        useResponsiveClasses('font-medium', responsiveClasses)
      );
      
      expect(result.current).toBe('font-medium text-xs text-sm text-base');
    });
  });

  describe('useResponsiveRender', () => {
    const setupBreakpoint = (current: Breakpoint) => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const breakpointMatches = {
          xs: query.includes('max-width: 639px'),
          sm: query.includes('min-width: 640px') && query.includes('max-width: 767px'),
          md: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
          lg: query.includes('min-width: 1024px') && query.includes('max-width: 1279px'),
          xl: query.includes('min-width: 1280px') && query.includes('max-width: 1535px'),
          '2xl': query.includes('min-width: 1536px'),
        };
        
        return {
          matches: breakpointMatches[current] || false,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    };

    it('should conditionally render based on device type', () => {
      setupBreakpoint('sm'); // Mobile
      
      const { result } = renderHook(() => useResponsiveRender());
      
      expect(result.current.showOnMobile('Mobile Content')).toBe('Mobile Content');
      expect(result.current.showOnTablet('Tablet Content')).toBe(null);
      expect(result.current.showOnDesktop('Desktop Content')).toBe(null);
    });

    it('should work with comparison functions', () => {
      setupBreakpoint('lg');
      
      const { result } = renderHook(() => useResponsiveRender());
      
      expect(result.current.showAbove('md', 'Above MD')).toBe('Above MD');
      expect(result.current.showBelow('xl', 'Below XL')).toBe('Below XL');
      expect(result.current.showAtLeast('lg', 'At Least LG')).toBe('At Least LG');
    });
  });

  describe('useResponsiveGrid', () => {
    const setupBreakpoint = (current: Breakpoint) => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const breakpointMatches = {
          xs: query.includes('max-width: 639px'),
          sm: query.includes('min-width: 640px') && query.includes('max-width: 767px'),
          md: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
          lg: query.includes('min-width: 1024px') && query.includes('max-width: 1279px'),
          xl: query.includes('min-width: 1280px') && query.includes('max-width: 1535px'),
          '2xl': query.includes('min-width: 1536px'),
        };
        
        return {
          matches: breakpointMatches[current] || false,
          media: query,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    };

    it('should return responsive grid configuration', () => {
      setupBreakpoint('md');
      
      const config = {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
      };

      const { result } = renderHook(() => useResponsiveGrid(config));
      
      expect(result.current).toEqual({
        columns: 3,
        gridClass: 'grid-cols-3',
        isCompact: false,
        spacing: 4,
      });
    });

    it('should provide different spacing for different screen sizes', () => {
      setupBreakpoint('xs');
      
      const { result } = renderHook(() => useResponsiveGrid({ xs: 1 }));
      expect(result.current.spacing).toBe(2); // Mobile
      expect(result.current.isCompact).toBe(true);
    });
  });

  describe('Type safety and edge cases', () => {
    it('should handle undefined responsive values', () => {
      const { result } = renderHook(() => useResponsiveValue(undefined));
      expect(result.current).toBeUndefined();
    });

    it('should handle null responsive values', () => {
      const { result } = renderHook(() => useResponsiveValue(null));
      expect(result.current).toBeNull();
    });

    it('should maintain type safety with generic values', () => {
      setupBreakpoint('md');
      
      const numberValues: ResponsiveValue<number> = {
        xs: 1,
        md: 2,
        lg: 3,
      };

      const { result } = renderHook(() => useResponsiveValue(numberValues));
      expect(typeof result.current).toBe('number');
      expect(result.current).toBe(2);
    });

    it('should handle breakpoint constant correctness', () => {
      expect(BREAKPOINTS.xs).toBe(0);
      expect(BREAKPOINTS.sm).toBe(640);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS['2xl']).toBe(1536);
    });
  });
});