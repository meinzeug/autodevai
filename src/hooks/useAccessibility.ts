import { useCallback, useEffect, useRef, useState } from 'react';

export interface AccessibilityConfig {
  announceChanges: boolean;
  enableKeyboardNavigation: boolean;
  highContrastMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  reducedMotion: boolean;
  screenReaderMode: boolean;
  focusIndicator: 'default' | 'high-contrast' | 'custom';
}

export interface NavigationItem {
  id: string;
  label: string;
  role?: string;
  disabled?: boolean;
}

const defaultConfig: AccessibilityConfig = {
  announceChanges: true,
  enableKeyboardNavigation: true,
  highContrastMode: false,
  fontSize: 'medium',
  reducedMotion: false,
  screenReaderMode: false,
  focusIndicator: 'default'
};

export function useAccessibility(config: Partial<AccessibilityConfig> = {}) {
  const [accessibilityConfig, setAccessibilityConfig] = useState<AccessibilityConfig>({
    ...defaultConfig,
    ...config
  });

  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const announceRef = useRef<HTMLDivElement>(null);

  // Detect screen reader
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = 
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.navigator.userAgent.includes('VoiceOver') ||
        // Check for screen reader specific CSS media queries
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia('(forced-colors: active)').matches;

      setIsScreenReaderActive(hasScreenReader);
    };

    detectScreenReader();
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'x-large': '20px'
    };
    root.style.fontSize = fontSizeMap[accessibilityConfig.fontSize];

    // High contrast mode
    if (accessibilityConfig.highContrastMode) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }

    // Reduced motion
    if (accessibilityConfig.reducedMotion) {
      root.classList.add('accessibility-reduced-motion');
    } else {
      root.classList.remove('accessibility-reduced-motion');
    }

    // Focus indicator
    root.setAttribute('data-focus-indicator', accessibilityConfig.focusIndicator);

    return () => {
      // Cleanup
      root.classList.remove('accessibility-high-contrast', 'accessibility-reduced-motion');
      root.removeAttribute('data-focus-indicator');
    };
  }, [accessibilityConfig]);

  // Screen reader announcement function
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!accessibilityConfig.announceChanges || !announceRef.current) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    announceRef.current.appendChild(announcement);

    // Remove announcement after it's been read
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }, [accessibilityConfig.announceChanges]);

  // Keyboard navigation utilities
  const useKeyboardNavigation = (
    items: NavigationItem[],
    onSelect?: (index: number) => void
  ) => {
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const itemsRef = useRef<(HTMLElement | null)[]>([]);

    const moveFocus = useCallback((direction: 'up' | 'down' | 'first' | 'last') => {
      if (!accessibilityConfig.enableKeyboardNavigation) return;

      const availableItems = items.filter((item, index) => 
        !item.disabled && itemsRef.current[index]
      );

      if (availableItems.length === 0) return;

      let newIndex = focusedIndex;

      switch (direction) {
        case 'up': {
          const currentIndex = items.findIndex((_, i) => i === focusedIndex);
          let prevIndex = currentIndex - 1;
          
          while (prevIndex >= 0 && (items[prevIndex].disabled || !itemsRef.current[prevIndex])) {
            prevIndex--;
          }
          
          if (prevIndex >= 0) {
            newIndex = prevIndex;
          } else {
            // Wrap to last available item
            let lastIndex = items.length - 1;
            while (lastIndex >= 0 && (items[lastIndex].disabled || !itemsRef.current[lastIndex])) {
              lastIndex--;
            }
            newIndex = lastIndex;
          }
          break;
        }
        
        case 'down': {
          const currentIndex = items.findIndex((_, i) => i === focusedIndex);
          let nextIndex = currentIndex + 1;
          
          while (nextIndex < items.length && (items[nextIndex].disabled || !itemsRef.current[nextIndex])) {
            nextIndex++;
          }
          
          if (nextIndex < items.length) {
            newIndex = nextIndex;
          } else {
            // Wrap to first available item
            let firstIndex = 0;
            while (firstIndex < items.length && (items[firstIndex].disabled || !itemsRef.current[firstIndex])) {
              firstIndex++;
            }
            newIndex = firstIndex;
          }
          break;
        }
        
        case 'first': {
          let firstIndex = 0;
          while (firstIndex < items.length && (items[firstIndex].disabled || !itemsRef.current[firstIndex])) {
            firstIndex++;
          }
          newIndex = firstIndex < items.length ? firstIndex : focusedIndex;
          break;
        }
        
        case 'last': {
          let lastIndex = items.length - 1;
          while (lastIndex >= 0 && (items[lastIndex].disabled || !itemsRef.current[lastIndex])) {
            lastIndex--;
          }
          newIndex = lastIndex >= 0 ? lastIndex : focusedIndex;
          break;
        }
      }

      if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < items.length) {
        setFocusedIndex(newIndex);
        itemsRef.current[newIndex]?.focus();
        announce(items[newIndex].label);
      }
    }, [items, focusedIndex, accessibilityConfig.enableKeyboardNavigation, announce]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (!accessibilityConfig.enableKeyboardNavigation) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          moveFocus('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveFocus('down');
          break;
        case 'Home':
          event.preventDefault();
          moveFocus('first');
          break;
        case 'End':
          event.preventDefault();
          moveFocus('last');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect?.(focusedIndex);
          break;
      }
    }, [moveFocus, focusedIndex, onSelect, accessibilityConfig.enableKeyboardNavigation]);

    return {
      focusedIndex,
      setFocusedIndex,
      itemsRef,
      handleKeyDown
    };
  };

  // Color contrast utilities
  const getContrastRatio = useCallback((color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;

      const [r, g, b] = rgb.map(val => {
        const normalized = parseInt(val) / 255;
        return normalized <= 0.03928 
          ? normalized / 12.92 
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  const checkColorCompliance = useCallback((foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = getContrastRatio(foreground, background);
    const minimumRatio = level === 'AAA' ? 7 : 4.5;
    return ratio >= minimumRatio;
  }, [getContrastRatio]);

  // Focus management
  const manageFocus = useCallback(() => {
    const trapFocus = (container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      container.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        container.removeEventListener('keydown', handleTabKey);
      };
    };

    const restoreFocus = (element: HTMLElement | null) => {
      if (element && typeof element.focus === 'function') {
        element.focus();
      }
    };

    return { trapFocus, restoreFocus };
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<AccessibilityConfig>) => {
    setAccessibilityConfig(prev => ({
      ...prev,
      ...newConfig
    }));
  }, []);

  // Get ARIA attributes helper
  const getAriaAttributes = useCallback((options: {
    role?: string;
    label?: string;
    describedBy?: string;
    expanded?: boolean;
    selected?: boolean;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    live?: 'polite' | 'assertive' | 'off';
  }) => {
    const attributes: Record<string, string | boolean> = {};

    if (options.role) attributes.role = options.role;
    if (options.label) attributes['aria-label'] = options.label;
    if (options.describedBy) attributes['aria-describedby'] = options.describedBy;
    if (options.expanded !== undefined) attributes['aria-expanded'] = options.expanded;
    if (options.selected !== undefined) attributes['aria-selected'] = options.selected;
    if (options.disabled !== undefined) attributes['aria-disabled'] = options.disabled;
    if (options.required !== undefined) attributes['aria-required'] = options.required;
    if (options.invalid !== undefined) attributes['aria-invalid'] = options.invalid;
    if (options.live) attributes['aria-live'] = options.live;

    return attributes;
  }, []);

  return {
    config: accessibilityConfig,
    updateConfig,
    isScreenReaderActive,
    announce,
    useKeyboardNavigation,
    checkColorCompliance,
    getContrastRatio,
    manageFocus,
    getAriaAttributes,
    announceRef
  };
}

export default useAccessibility;