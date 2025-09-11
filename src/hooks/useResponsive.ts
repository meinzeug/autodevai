import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Breakpoint definitions matching Tailwind CSS defaults
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Responsive value type for components
 */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

/**
 * Window size interface
 */
export interface WindowSize {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
}

/**
 * Device type detection
 */
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

/**
 * Hook for responsive design and media queries with enhanced functionality
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

/**
 * Enhanced hook for getting current breakpoint with additional utilities
 */
export function useBreakpoint() {
  const isXs = useMediaQuery('(max-width: 639px)');
  const isSm = useMediaQuery('(min-width: 640px) and (max-width: 767px)');
  const isMd = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isLg = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
  const isXl = useMediaQuery('(min-width: 1280px) and (max-width: 1535px)');
  const is2Xl = useMediaQuery('(min-width: 1536px)');

  const getCurrentBreakpoint = useCallback((): Breakpoint => {
    if (is2Xl) return '2xl';
    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    if (isSm) return 'sm';
    return 'xs';
  }, [is2Xl, isXl, isLg, isMd, isSm]);

  const breakpointIndex = useMemo(() => {
    const current = getCurrentBreakpoint();
    return Object.keys(BREAKPOINTS).indexOf(current);
  }, [getCurrentBreakpoint]);

  const isAbove = useCallback((breakpoint: Breakpoint) => {
    const targetIndex = Object.keys(BREAKPOINTS).indexOf(breakpoint);
    return breakpointIndex > targetIndex;
  }, [breakpointIndex]);

  const isBelow = useCallback((breakpoint: Breakpoint) => {
    const targetIndex = Object.keys(BREAKPOINTS).indexOf(breakpoint);
    return breakpointIndex < targetIndex;
  }, [breakpointIndex]);

  const isAtLeast = useCallback((breakpoint: Breakpoint) => {
    const targetIndex = Object.keys(BREAKPOINTS).indexOf(breakpoint);
    return breakpointIndex >= targetIndex;
  }, [breakpointIndex]);

  return {
    // Individual breakpoint flags
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    
    // Current breakpoint
    current: getCurrentBreakpoint(),
    index: breakpointIndex,
    
    // Device categories
    isMobile: isXs || isSm,
    isTablet: isMd,
    isDesktop: isLg || isXl || is2Xl,
    
    // Comparison utilities
    isAbove,
    isBelow,
    isAtLeast,
    
    // Convenience methods
    isMobileOrTablet: isXs || isSm || isMd,
    isTabletOrDesktop: isMd || isLg || isXl || is2Xl,
    isSmallScreen: isXs || isSm,
    isLargeScreen: isLg || isXl || is2Xl,
  };
}

/**
 * Enhanced hook for detecting mobile devices
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Hook for detecting tablet devices
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Hook for detecting desktop devices
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Enhanced hook for detecting touch devices with more comprehensive checks
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - legacy support
      navigator.msMaxTouchPoints > 0
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - legacy support
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouch;
}

/**
 * Hook for detecting device orientation
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Enhanced hook for getting comprehensive window size information with debouncing
 */
export function useWindowSize(debounceMs = 100): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        innerWidth: 0,
        innerHeight: 0,
        outerWidth: 0,
        outerHeight: 0,
      };
    }
    
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let timeoutId: NodeJS.Timeout;

    const updateWindowSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
        });
      }, debounceMs);
    };

    window.addEventListener('resize', updateWindowSize);
    window.addEventListener('orientationchange', updateWindowSize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateWindowSize);
      window.removeEventListener('orientationchange', updateWindowSize);
    };
  }, [debounceMs]);

  return windowSize;
}

/**
 * Hook for getting viewport dimensions (legacy compatibility)
 */
export function useViewport() {
  const windowSize = useWindowSize();
  return {
    width: windowSize.width,
    height: windowSize.height
  };
}

/**
 * Hook for detecting if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Hook for detecting high contrast preference
 */
export function usePrefersHighContrast(): boolean {
  return useMediaQuery('(prefers-contrast: high)');
}

/**
 * Hook for detecting dark mode preference from system
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Enhanced hook for responsive values based on breakpoints with fallback strategies
 */
export function useResponsiveValue<T>(
  values: ResponsiveValue<T>,
  fallbackStrategy: 'mobile-first' | 'desktop-first' = 'mobile-first'
): T | undefined {
  const breakpoint = useBreakpoint();

  // If values is not an object, return it directly
  if (typeof values !== 'object' || values === null) {
    return values as T;
  }

  const breakpointValues = values as Partial<Record<Breakpoint, T>>;
  
  // Mobile-first: start from current and go down
  // Desktop-first: start from current and go up
  const breakpointOrder: Breakpoint[] = fallbackStrategy === 'mobile-first' 
    ? ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    : ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  
  const currentIndex = breakpointOrder.indexOf(breakpoint.current);
  
  if (fallbackStrategy === 'mobile-first') {
    // Check from current breakpoint down to xs
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (bp in breakpointValues && breakpointValues[bp] !== undefined) {
        return breakpointValues[bp];
      }
    }
  } else {
    // Check from current breakpoint up to 2xl
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (bp in breakpointValues && breakpointValues[bp] !== undefined) {
        return breakpointValues[bp];
      }
    }
  }

  return undefined;
}

/**
 * Enhanced hook for comprehensive device information
 */
export function useDeviceInfo(): DeviceInfo {
  const breakpoint = useBreakpoint();
  const orientation = useOrientation();
  const isTouch = useIsTouch();
  
  const [pixelRatio, setPixelRatio] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.devicePixelRatio || 1;
    }
    return 1;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updatePixelRatio = () => {
      setPixelRatio(window.devicePixelRatio || 1);
    };

    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mediaQuery.addEventListener('change', updatePixelRatio);
    
    return () => {
      mediaQuery.removeEventListener('change', updatePixelRatio);
    };
  }, []);

  return {
    isMobile: breakpoint.isMobile,
    isTablet: breakpoint.isTablet,
    isDesktop: breakpoint.isDesktop,
    isTouch,
    orientation,
    pixelRatio,
  };
}

/**
 * Hook for detecting if device is in fullscreen mode
 */
export function useIsFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const updateFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  return isFullscreen;
}

/**
 * Hook for creating responsive class strings with clsx-style merging
 */
export function useResponsiveClasses<T extends string>(
  baseClasses: T,
  responsiveClasses: Partial<Record<Breakpoint, T>>
): string {
  const breakpoint = useBreakpoint();
  
  const classes = [baseClasses];
  
  // Add classes for current breakpoint and smaller
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint.current);
  
  for (let i = 0; i <= currentIndex; i++) {
    const bp = breakpointOrder[i];
    if (bp in responsiveClasses && responsiveClasses[bp]) {
      classes.push(responsiveClasses[bp]!);
    }
  }
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Hook for conditional responsive rendering
 */
export function useResponsiveRender() {
  const breakpoint = useBreakpoint();
  
  return {
    showOnMobile: (component: React.ReactNode) => breakpoint.isMobile ? component : null,
    showOnTablet: (component: React.ReactNode) => breakpoint.isTablet ? component : null,
    showOnDesktop: (component: React.ReactNode) => breakpoint.isDesktop ? component : null,
    showAbove: (bp: Breakpoint, component: React.ReactNode) => 
      breakpoint.isAbove(bp) ? component : null,
    showBelow: (bp: Breakpoint, component: React.ReactNode) => 
      breakpoint.isBelow(bp) ? component : null,
    showAtLeast: (bp: Breakpoint, component: React.ReactNode) => 
      breakpoint.isAtLeast(bp) ? component : null,
  };
}

/**
 * Hook for responsive grid calculations
 */
export function useResponsiveGrid(config: {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}) {
  const columns = useResponsiveValue(config) || 1;
  const breakpoint = useBreakpoint();
  
  return {
    columns,
    gridClass: `grid-cols-${columns}`,
    isCompact: breakpoint.isMobile,
    spacing: breakpoint.isMobile ? 2 : breakpoint.isTablet ? 4 : 6,
  };
}