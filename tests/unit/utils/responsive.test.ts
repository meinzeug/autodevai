/**
 * @fileoverview Comprehensive tests for responsive utilities
 * Tests all responsive design functions and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDeviceType,
  getLayoutMode,
  isDeviceType,
  getResponsiveValue,
  generateResponsiveClasses,
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
  isTouchDevice,
  responsive,
  defaultBreakpoints,
  defaultContainerSizes,
  defaultGridCols,
  defaultSpacing,
  defaultTextSizes,
  defaultHeadingSizes,
  defaultLayoutConfig,
  type DeviceType,
  type LayoutMode,
  type BreakpointConfig,
  type ContainerConfig,
  type GridConfig,
  type SpacingConfig,
  type TypographyConfig,
  type LayoutConfig
} from '../../../src/utils/responsive';

describe('Responsive Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeviceType', () => {
    it('should return mobile for width < mobile breakpoint', () => {
      expect(getDeviceType(320)).toBe('mobile');
      expect(getDeviceType(480)).toBe('mobile');
      expect(getDeviceType(639)).toBe('mobile');
    });

    it('should return tablet for width between mobile and tablet breakpoint', () => {
      expect(getDeviceType(640)).toBe('tablet');
      expect(getDeviceType(768)).toBe('tablet');
      expect(getDeviceType(1023)).toBe('tablet');
    });

    it('should return desktop for width between tablet and desktop breakpoint', () => {
      expect(getDeviceType(1024)).toBe('desktop');
      expect(getDeviceType(1200)).toBe('desktop');
      expect(getDeviceType(1279)).toBe('desktop');
    });

    it('should return wide for width >= wide breakpoint', () => {
      expect(getDeviceType(1280)).toBe('desktop');
      expect(getDeviceType(1536)).toBe('wide');
      expect(getDeviceType(1920)).toBe('wide');
    });

    it('should work with custom breakpoints', () => {
      const customBreakpoints: BreakpointConfig = {
        mobile: 480,
        tablet: 768,
        desktop: 1200,
        wide: 1920
      };

      expect(getDeviceType(400, customBreakpoints)).toBe('mobile');
      expect(getDeviceType(600, customBreakpoints)).toBe('tablet');
      expect(getDeviceType(1000, customBreakpoints)).toBe('desktop');
      expect(getDeviceType(2000, customBreakpoints)).toBe('wide');
    });

    it('should handle edge cases', () => {
      expect(getDeviceType(0)).toBe('mobile');
      expect(getDeviceType(-1)).toBe('mobile');
      expect(getDeviceType(Infinity)).toBe('wide');
    });
  });

  describe('getLayoutMode', () => {
    it('should return mobile for small screens', () => {
      expect(getLayoutMode(320)).toBe('mobile');
      expect(getLayoutMode(639)).toBe('mobile');
    });

    it('should return tablet for medium screens', () => {
      expect(getLayoutMode(640)).toBe('tablet');
      expect(getLayoutMode(1023)).toBe('tablet');
    });

    it('should return desktop for large screens', () => {
      expect(getLayoutMode(1024)).toBe('desktop');
      expect(getLayoutMode(1920)).toBe('desktop');
    });
  });

  describe('isDeviceType', () => {
    it('should correctly identify device types', () => {
      expect(isDeviceType('mobile', 320)).toBe(true);
      expect(isDeviceType('mobile', 1024)).toBe(false);
      
      expect(isDeviceType('tablet', 768)).toBe(true);
      expect(isDeviceType('tablet', 320)).toBe(false);
      
      expect(isDeviceType('desktop', 1200)).toBe(true);
      expect(isDeviceType('desktop', 640)).toBe(false);
      
      expect(isDeviceType('wide', 1920)).toBe(true);
      expect(isDeviceType('wide', 1200)).toBe(false);
    });
  });

  describe('getResponsiveValue', () => {
    const values = {
      mobile: 'small',
      tablet: 'medium',
      desktop: 'large',
      wide: 'extra-large'
    };

    it('should return correct value for each device type', () => {
      expect(getResponsiveValue(values, 320, 'default')).toBe('small');
      expect(getResponsiveValue(values, 768, 'default')).toBe('medium');
      expect(getResponsiveValue(values, 1200, 'default')).toBe('large');
      expect(getResponsiveValue(values, 1920, 'default')).toBe('extra-large');
    });

    it('should fallback to layout mode when device type not found', () => {
      const partialValues = { mobile: 'small', desktop: 'large' };
      expect(getResponsiveValue(partialValues, 768, 'default')).toBe('default');
    });

    it('should return default value when no match found', () => {
      expect(getResponsiveValue({}, 1024, 'fallback')).toBe('fallback');
    });

    it('should handle undefined values', () => {
      const valuesWithUndefined = { mobile: 'small', tablet: undefined, desktop: 'large' };
      expect(getResponsiveValue(valuesWithUndefined, 768, 'default')).toBe('default');
    });
  });

  describe('generateResponsiveClasses', () => {
    it('should generate correct responsive classes', () => {
      const config = {
        mobile: 'text-sm',
        tablet: 'text-base',
        desktop: 'text-lg'
      };

      const result = generateResponsiveClasses(config);
      expect(result).toBe('text-sm sm:text-base lg:text-lg');
    });

    it('should work with prefix', () => {
      const config = { mobile: 'red', desktop: 'blue' };
      const result = generateResponsiveClasses(config, 'bg-');
      expect(result).toBe('bg-red lg:bg-blue');
    });

    it('should handle empty config', () => {
      expect(generateResponsiveClasses({})).toBe('');
    });

    it('should skip undefined values', () => {
      const config = { mobile: 'small', tablet: undefined, desktop: 'large' };
      const result = generateResponsiveClasses(config);
      expect(result).toBe('small lg:large');
    });
  });

  describe('getContainerClasses', () => {
    it('should return default container classes', () => {
      const result = getContainerClasses();
      expect(result).toBe('px-3 sm:px-4 lg:px-6');
    });

    it('should merge custom sizes with defaults', () => {
      const customSizes = { tablet: 'px-8' };
      const result = getContainerClasses(customSizes);
      expect(result).toBe('px-3 sm:px-8 lg:px-6');
    });

    it('should handle complete custom config', () => {
      const customSizes = {
        mobile: 'px-2',
        tablet: 'px-5',
        desktop: 'px-8'
      };
      const result = getContainerClasses(customSizes);
      expect(result).toBe('px-2 sm:px-5 lg:px-8');
    });
  });

  describe('getGridClasses', () => {
    it('should return default grid classes', () => {
      const result = getGridClasses();
      expect(result).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    });

    it('should work with custom grid config', () => {
      const config = { mobile: 2, tablet: 4, desktop: 6 };
      const result = getGridClasses(config);
      expect(result).toBe('grid-cols-2 sm:grid-cols-4 lg:grid-cols-6');
    });

    it('should merge with defaults', () => {
      const config = { desktop: 4 };
      const result = getGridClasses(config);
      expect(result).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
    });
  });

  describe('getSpacingClasses', () => {
    it('should generate spacing classes for different types', () => {
      expect(getSpacingClasses('gap')).toBe('gap-3 sm:gap-4 lg:gap-6');
      expect(getSpacingClasses('p')).toBe('p-3 sm:p-4 lg:p-6');
      expect(getSpacingClasses('m')).toBe('m-3 sm:m-4 lg:m-6');
      expect(getSpacingClasses('space-y')).toBe('space-y-3 sm:space-y-4 lg:space-y-6');
    });

    it('should work with custom spacing config', () => {
      const config = { mobile: '2', tablet: '5', desktop: '8' };
      const result = getSpacingClasses('gap', config);
      expect(result).toBe('gap-2 sm:gap-5 lg:gap-8');
    });
  });

  describe('getTextClasses', () => {
    it('should return default text size classes', () => {
      const result = getTextClasses();
      expect(result).toBe('text-sm sm:text-base lg:text-lg');
    });

    it('should work with custom text config', () => {
      const config = { mobile: 'text-xs', desktop: 'text-xl' };
      const result = getTextClasses(config);
      expect(result).toBe('text-xs lg:text-xl');
    });
  });

  describe('getHeadingClasses', () => {
    it('should return default heading classes', () => {
      const result = getHeadingClasses();
      expect(result).toBe('text-lg sm:text-xl lg:text-2xl');
    });

    it('should work with custom heading config', () => {
      const config = { mobile: 'text-base', desktop: 'text-3xl' };
      const result = getHeadingClasses(config);
      expect(result).toBe('text-base lg:text-3xl');
    });
  });

  describe('isTouchDevice', () => {
    beforeEach(() => {
      // Reset window and navigator mocks
      Object.defineProperty(global, 'window', {
        value: global.window,
        writable: true
      });
      Object.defineProperty(global, 'navigator', {
        value: global.navigator,
        writable: true
      });
    });

    it('should return false in non-browser environment', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });
      expect(isTouchDevice()).toBe(false);
    });

    it('should detect touch support via ontouchstart', () => {
      Object.defineProperty(global.window, 'ontouchstart', {
        value: null,
        writable: true
      });
      expect(isTouchDevice()).toBe(true);
    });

    it('should detect touch support via maxTouchPoints', () => {
      delete global.window.ontouchstart;
      Object.defineProperty(global.navigator, 'maxTouchPoints', {
        value: 1,
        writable: true
      });
      expect(isTouchDevice()).toBe(true);
    });

    it('should return false when no touch support detected', () => {
      delete global.window.ontouchstart;
      Object.defineProperty(global.navigator, 'maxTouchPoints', {
        value: 0,
        writable: true
      });
      expect(isTouchDevice()).toBe(false);
    });
  });

  describe('getTouchClasses', () => {
    it('should return touch classes for mobile/tablet', () => {
      expect(getTouchClasses(320)).toBe('touch-manipulation select-none');
      expect(getTouchClasses(768)).toBe('touch-manipulation select-none');
    });

    it('should return empty string for desktop', () => {
      expect(getTouchClasses(1200)).toBe('');
    });
  });

  describe('getAnimationClasses', () => {
    it('should return shorter duration for mobile', () => {
      const result = getAnimationClasses(320);
      expect(result).toContain('duration-200');
    });

    it('should return longer duration for desktop', () => {
      const result = getAnimationClasses(1200);
      expect(result).toContain('duration-300');
    });

    it('should add motion-safe prefix when requested', () => {
      const result = getAnimationClasses(1200, true);
      expect(result).toContain('motion-safe:');
    });

    it('should not add motion-safe prefix when disabled', () => {
      const result = getAnimationClasses(1200, false);
      expect(result).not.toContain('motion-safe:');
    });
  });

  describe('getA11yClasses', () => {
    it('should return larger focus rings for mobile/tablet', () => {
      expect(getA11yClasses('mobile')).toBe('focus:ring-4 focus:ring-offset-2');
      expect(getA11yClasses('tablet')).toBe('focus:ring-4 focus:ring-offset-2');
    });

    it('should return smaller focus rings for desktop', () => {
      expect(getA11yClasses('desktop')).toBe('focus:ring-2 focus:ring-offset-1');
    });
  });

  describe('getComponentVariant', () => {
    const variants = {
      mobile: 'compact',
      tablet: 'normal',
      desktop: 'spacious'
    };

    it('should return correct variant for each layout mode', () => {
      expect(getComponentVariant(variants, 320, 'default')).toBe('compact');
      expect(getComponentVariant(variants, 768, 'default')).toBe('normal');
      expect(getComponentVariant(variants, 1200, 'default')).toBe('spacious');
    });

    it('should return default when variant not found', () => {
      const partialVariants = { desktop: 'spacious' };
      expect(getComponentVariant(partialVariants, 320, 'fallback')).toBe('fallback');
    });
  });

  describe('getLayoutConfig', () => {
    it('should return correct layout config for each screen size', () => {
      const mobileConfig = getLayoutConfig(320);
      expect(mobileConfig.sidebar).toBe('drawer');
      expect(mobileConfig.content.columns).toBe(1);

      const tabletConfig = getLayoutConfig(768);
      expect(tabletConfig.sidebar).toBe('overlay');
      expect(tabletConfig.content.columns).toBe(2);

      const desktopConfig = getLayoutConfig(1200);
      expect(desktopConfig.sidebar).toBe('fixed');
      expect(desktopConfig.content.columns).toBe(3);
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        sidebar: {
          mobile: 'hidden' as const,
          tablet: 'drawer' as const,
          desktop: 'collapsible' as const
        }
      };

      const result = getLayoutConfig(320, customConfig);
      expect(result.sidebar).toBe('hidden');
      expect(result.content.columns).toBe(1); // Should keep default
    });
  });

  describe('responsive utility bundle', () => {
    it('should export all utility functions', () => {
      expect(typeof responsive.getDeviceType).toBe('function');
      expect(typeof responsive.getLayoutMode).toBe('function');
      expect(typeof responsive.isDeviceType).toBe('function');
      expect(typeof responsive.getResponsiveValue).toBe('function');
      expect(typeof responsive.getContainerClasses).toBe('function');
      expect(typeof responsive.getGridClasses).toBe('function');
      expect(typeof responsive.getSpacingClasses).toBe('function');
      expect(typeof responsive.getTextClasses).toBe('function');
      expect(typeof responsive.getHeadingClasses).toBe('function');
      expect(typeof responsive.getTouchClasses).toBe('function');
      expect(typeof responsive.getAnimationClasses).toBe('function');
      expect(typeof responsive.getA11yClasses).toBe('function');
      expect(typeof responsive.getComponentVariant).toBe('function');
      expect(typeof responsive.getLayoutConfig).toBe('function');
      expect(typeof responsive.isTouchDevice).toBe('function');
    });

    it('should work with all bundled functions', () => {
      expect(responsive.getDeviceType(320)).toBe('mobile');
      expect(responsive.getLayoutMode(1200)).toBe('desktop');
      expect(responsive.isDeviceType('tablet', 768)).toBe(true);
    });
  });

  describe('default configurations', () => {
    it('should export correct default breakpoints', () => {
      expect(defaultBreakpoints).toEqual({
        mobile: 640,
        tablet: 1024,
        desktop: 1280,
        wide: 1536
      });
    });

    it('should export correct default container sizes', () => {
      expect(defaultContainerSizes).toEqual({
        mobile: 'px-3',
        tablet: 'px-4',
        desktop: 'px-6'
      });
    });

    it('should export correct default grid columns', () => {
      expect(defaultGridCols).toEqual({
        mobile: 1,
        tablet: 2,
        desktop: 3
      });
    });

    it('should export correct default spacing', () => {
      expect(defaultSpacing).toEqual({
        mobile: '3',
        tablet: '4',
        desktop: '6'
      });
    });

    it('should export correct default text sizes', () => {
      expect(defaultTextSizes).toEqual({
        mobile: 'text-sm',
        tablet: 'text-base',
        desktop: 'text-lg'
      });
    });

    it('should export correct default heading sizes', () => {
      expect(defaultHeadingSizes).toEqual({
        mobile: 'text-lg',
        tablet: 'text-xl',
        desktop: 'text-2xl'
      });
    });

    it('should export correct default layout config', () => {
      expect(defaultLayoutConfig.sidebar).toEqual({
        mobile: 'drawer',
        tablet: 'overlay',
        desktop: 'fixed'
      });

      expect(defaultLayoutConfig.content).toEqual({
        mobile: { columns: 1, gap: '4' },
        tablet: { columns: 2, gap: '6' },
        desktop: { columns: 3, gap: '8' }
      });

      expect(defaultLayoutConfig.header).toEqual({
        mobile: { height: '56px', showTitle: false },
        tablet: { height: '64px', showTitle: true },
        desktop: { height: '72px', showTitle: true }
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(getDeviceType(NaN)).toBe('mobile');
      expect(getLayoutMode(null as any)).toBe('mobile');
      expect(isDeviceType('mobile', undefined as any)).toBe(true);
    });

    it('should handle extreme values', () => {
      expect(getDeviceType(Number.MAX_SAFE_INTEGER)).toBe('wide');
      expect(getDeviceType(Number.MIN_SAFE_INTEGER)).toBe('mobile');
    });

    it('should handle empty or malformed configurations', () => {
      expect(generateResponsiveClasses(null as any)).toBe('');
      expect(getContainerClasses(null as any)).toBe('px-3 sm:px-4 lg:px-6');
      expect(getGridClasses(undefined as any)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    });
  });
});