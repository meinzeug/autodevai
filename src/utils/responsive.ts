/**
 * Responsive Design Utilities for AutoDev-AI
 * 
 * Provides utility functions for handling responsive behavior,
 * breakpoint detection, and adaptive layouts.
 */

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export const defaultBreakpoints: BreakpointConfig = {
  mobile: 640,   // 0-639px
  tablet: 1024,  // 640-1023px  
  desktop: 1280, // 1024-1279px
  wide: 1536     // 1280px+
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';
export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

/**
 * Get the current device type based on window width
 */
export function getDeviceType(width: number, breakpoints: BreakpointConfig = defaultBreakpoints): DeviceType {
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.tablet) return 'tablet';
  if (width < breakpoints.desktop) return 'desktop';
  return 'wide';
}

/**
 * Get the layout mode (simplified device categorization)
 */
export function getLayoutMode(width: number, breakpoints: BreakpointConfig = defaultBreakpoints): LayoutMode {
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.desktop) return 'tablet';
  return 'desktop';
}

/**
 * Check if the current viewport matches a specific device type
 */
export function isDeviceType(type: DeviceType, width: number, breakpoints: BreakpointConfig = defaultBreakpoints): boolean {
  return getDeviceType(width, breakpoints) === type;
}

/**
 * Get responsive value based on current device type
 */
export function getResponsiveValue<T>(
  values: Partial<Record<DeviceType | LayoutMode, T>>,
  width: number,
  defaultValue: T,
  breakpoints: BreakpointConfig = defaultBreakpoints
): T {
  const deviceType = getDeviceType(width, breakpoints);
  const layoutMode = getLayoutMode(width, breakpoints);
  
  // Try device type first, then layout mode, then default
  return values[deviceType] ?? values[layoutMode] ?? defaultValue;
}

/**
 * Generate responsive CSS classes based on breakpoints
 */
export function generateResponsiveClasses(
  config: Partial<Record<LayoutMode, string>>,
  prefix: string = ''
): string {
  const classes: string[] = [];
  
  // Mobile first - no prefix
  if (config.mobile) {
    classes.push(`${prefix}${config.mobile}`);
  }
  
  // Tablet - sm: prefix
  if (config.tablet) {
    classes.push(`sm:${prefix}${config.tablet}`);
  }
  
  // Desktop - lg: prefix
  if (config.desktop) {
    classes.push(`lg:${prefix}${config.desktop}`);
  }
  
  return classes.join(' ');
}

/**
 * Container sizing utilities
 */
export interface ContainerConfig {
  mobile: string;
  tablet: string;
  desktop: string;
}

export const defaultContainerSizes: ContainerConfig = {
  mobile: 'px-3',      // 12px horizontal padding
  tablet: 'px-4',      // 16px horizontal padding
  desktop: 'px-6'      // 24px horizontal padding
};

/**
 * Get container classes for responsive padding
 */
export function getContainerClasses(sizes: Partial<ContainerConfig> = {}): string {
  const config = { ...defaultContainerSizes, ...sizes };
  return generateResponsiveClasses(config);
}

/**
 * Grid column utilities
 */
export interface GridConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

export const defaultGridCols: GridConfig = {
  mobile: 1,
  tablet: 2,
  desktop: 3
};

/**
 * Generate grid column classes
 */
export function getGridClasses(config: Partial<GridConfig> = {}): string {
  const gridConfig = { ...defaultGridCols, ...config };
  
  const getColClass = (cols: number) => `grid-cols-${cols}`;
  
  return generateResponsiveClasses({
    mobile: getColClass(gridConfig.mobile),
    tablet: getColClass(gridConfig.tablet),
    desktop: getColClass(gridConfig.desktop)
  });
}

/**
 * Spacing utilities
 */
export interface SpacingConfig {
  mobile: string;
  tablet: string;
  desktop: string;
}

export const defaultSpacing: SpacingConfig = {
  mobile: '3',  // 12px
  tablet: '4',  // 16px
  desktop: '6'  // 24px
};

/**
 * Get responsive spacing classes
 */
export function getSpacingClasses(
  type: 'gap' | 'space-y' | 'space-x' | 'p' | 'px' | 'py' | 'm' | 'mx' | 'my',
  config: Partial<SpacingConfig> = {}
): string {
  const spacingConfig = { ...defaultSpacing, ...config };
  
  return generateResponsiveClasses({
    mobile: `${type}-${spacingConfig.mobile}`,
    tablet: `${type}-${spacingConfig.tablet}`,
    desktop: `${type}-${spacingConfig.desktop}`
  });
}

/**
 * Typography utilities
 */
export interface TypographyConfig {
  mobile: string;
  tablet: string;
  desktop: string;
}

export const defaultTextSizes: TypographyConfig = {
  mobile: 'text-sm',
  tablet: 'text-base',
  desktop: 'text-lg'
};

export const defaultHeadingSizes: TypographyConfig = {
  mobile: 'text-lg',
  tablet: 'text-xl',
  desktop: 'text-2xl'
};

/**
 * Get responsive text size classes
 */
export function getTextClasses(config: Partial<TypographyConfig> = {}): string {
  const textConfig = { ...defaultTextSizes, ...config };
  return generateResponsiveClasses(textConfig);
}

/**
 * Get responsive heading classes
 */
export function getHeadingClasses(config: Partial<TypographyConfig> = {}): string {
  const headingConfig = { ...defaultHeadingSizes, ...config };
  return generateResponsiveClasses(headingConfig);
}

/**
 * Touch and interaction utilities
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get touch-appropriate classes
 */
export function getTouchClasses(width: number): string {
  const isMobileOrTablet = width < defaultBreakpoints.desktop;
  const isTouch = isTouchDevice();
  
  if (isMobileOrTablet || isTouch) {
    return 'touch-manipulation select-none'; // Optimize for touch
  }
  
  return ''; // Desktop mouse interaction
}

/**
 * Animation and transition utilities based on device capabilities
 */
export function getAnimationClasses(width: number, respectMotionPreferences: boolean = true): string {
  const classes: string[] = [];
  
  // Reduced animations on mobile for performance
  if (width < defaultBreakpoints.mobile) {
    classes.push('transition-all duration-200');
  } else {
    classes.push('transition-all duration-300');
  }
  
  // Add motion-safe prefix if respecting preferences
  if (respectMotionPreferences) {
    return classes.map(cls => `motion-safe:${cls}`).join(' ');
  }
  
  return classes.join(' ');
}

/**
 * Accessibility helpers for responsive design
 */
export function getA11yClasses(layoutMode: LayoutMode): string {
  const classes: string[] = [];
  
  // Larger focus outlines on touch devices
  if (layoutMode === 'mobile' || layoutMode === 'tablet') {
    classes.push('focus:ring-4 focus:ring-offset-2');
  } else {
    classes.push('focus:ring-2 focus:ring-offset-1');
  }
  
  return classes.join(' ');
}

/**
 * Component variant selector based on screen size
 */
export function getComponentVariant<T extends string>(
  variants: Partial<Record<LayoutMode, T>>,
  width: number,
  defaultVariant: T
): T {
  const layoutMode = getLayoutMode(width);
  return variants[layoutMode] ?? defaultVariant;
}

/**
 * Layout configuration helper
 */
export interface LayoutConfig {
  sidebar: {
    mobile: 'drawer' | 'overlay' | 'hidden';
    tablet: 'drawer' | 'overlay' | 'collapsible';
    desktop: 'fixed' | 'collapsible';
  };
  content: {
    mobile: { columns: number; gap: string };
    tablet: { columns: number; gap: string };
    desktop: { columns: number; gap: string };
  };
  header: {
    mobile: { height: string; showTitle: boolean };
    tablet: { height: string; showTitle: boolean };
    desktop: { height: string; showTitle: boolean };
  };
}

export const defaultLayoutConfig: LayoutConfig = {
  sidebar: {
    mobile: 'drawer',
    tablet: 'overlay',
    desktop: 'fixed'
  },
  content: {
    mobile: { columns: 1, gap: '4' },
    tablet: { columns: 2, gap: '6' },
    desktop: { columns: 3, gap: '8' }
  },
  header: {
    mobile: { height: '56px', showTitle: false },
    tablet: { height: '64px', showTitle: true },
    desktop: { height: '72px', showTitle: true }
  }
};

/**
 * Get layout configuration for current screen size
 */
export function getLayoutConfig(
  width: number,
  config: Partial<LayoutConfig> = {}
): LayoutConfig[LayoutMode] {
  const layoutMode = getLayoutMode(width);
  const fullConfig = { ...defaultLayoutConfig, ...config };
  return fullConfig[layoutMode];
}

// Export commonly used responsive utilities as a bundle
export const responsive = {
  getDeviceType,
  getLayoutMode,
  isDeviceType,
  getResponsiveValue,
  getContainerClasses,
  getGridClasses,
  getSpacingClasses,
  getTextClasses,
  getHeadingClasses,
  getTouchClasses,
  getAnimationClasses,
  getA11yClasses,
  getComponentVariant,
  getLayoutConfig,
  isTouchDevice
} as const;