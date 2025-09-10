import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for managing focus within a component or area
 */
export function useFocusManagement() {
  const containerRef = useRef<HTMLElement>(null);

  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElement = getFocusableElements(containerRef.current)[0];
    focusableElement?.focus();
  }, []);

  const focusLast = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElements = getFocusableElements(containerRef.current);
    focusableElements[focusableElements.length - 1]?.focus();
  }, []);

  const focusNext = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElements = getFocusableElements(containerRef.current);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }, []);

  const focusPrevious = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElements = getFocusableElements(containerRef.current);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }, []);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  };
}

/**
 * Hook for creating a focus trap (useful for modals, dialogs)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the trap
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !containerRef.current) return;

      const focusableElements = getFocusableElements(containerRef.current);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing ARIA live regions for screen readers
 */
export function useAriaLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
      
      // Clear the message after a short delay to allow for re-announcements
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
}

/**
 * Hook for managing skip links for keyboard navigation
 */
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show skip links on first Tab press
      if (event.key === 'Tab' && skipLinksRef.current) {
        skipLinksRef.current.style.display = 'block';
      }
    };

    const handleClick = () => {
      // Hide skip links when clicking outside
      if (skipLinksRef.current) {
        skipLinksRef.current.style.display = 'none';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return skipLinksRef;
}

/**
 * Hook for managing focus indicators and high contrast mode
 */
export function useAccessibilityPreferences() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersLargeText, setPrefersLargeText] = useState(false);

  useEffect(() => {
    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(highContrastQuery.matches);
    highContrastQuery.addEventListener('change', (e) => setPrefersHighContrast(e.matches));

    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(reducedMotionQuery.matches);
    reducedMotionQuery.addEventListener('change', (e) => setPrefersReducedMotion(e.matches));

    // Check for large text preference (approximation)
    const largeTextQuery = window.matchMedia('(min-resolution: 1.5dppx)');
    setPrefersLargeText(largeTextQuery.matches);
    largeTextQuery.addEventListener('change', (e) => setPrefersLargeText(e.matches));

    return () => {
      highContrastQuery.removeEventListener('change', (e) => setPrefersHighContrast(e.matches));
      reducedMotionQuery.removeEventListener('change', (e) => setPrefersReducedMotion(e.matches));
      largeTextQuery.removeEventListener('change', (e) => setPrefersLargeText(e.matches));
    };
  }, []);

  return {
    prefersHighContrast,
    prefersReducedMotion,
    prefersLargeText
  };
}

/**
 * Hook for keyboard navigation in lists/grids
 */
export function useKeyboardNavigation(options: {
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  onSelect?: (index: number) => void;
} = {}) {
  const { orientation = 'vertical', wrap = true, onSelect } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemsRef = useRef<HTMLElement[]>([]);

  const registerItem = useCallback((element: HTMLElement | null, index: number) => {
    if (element) {
      itemsRef.current[index] = element;
    }
  }, []);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const items = itemsRef.current.filter(Boolean);
    if (items.length === 0) return;

    let newIndex = focusedIndex;

    if ((direction === 'up' && orientation !== 'horizontal') || 
        (direction === 'left' && orientation !== 'vertical')) {
      newIndex = focusedIndex - 1;
      if (newIndex < 0) {
        newIndex = wrap ? items.length - 1 : 0;
      }
    } else if ((direction === 'down' && orientation !== 'horizontal') || 
               (direction === 'right' && orientation !== 'vertical')) {
      newIndex = focusedIndex + 1;
      if (newIndex >= items.length) {
        newIndex = wrap ? 0 : items.length - 1;
      }
    }

    setFocusedIndex(newIndex);
    items[newIndex]?.focus();
  }, [focusedIndex, orientation, wrap]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        moveFocus('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveFocus('right');
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        itemsRef.current[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        const lastIndex = itemsRef.current.length - 1;
        setFocusedIndex(lastIndex);
        itemsRef.current[lastIndex]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(focusedIndex);
        break;
    }
  }, [moveFocus, focusedIndex, onSelect]);

  return {
    focusedIndex,
    setFocusedIndex,
    registerItem,
    handleKeyDown
  };
}

/**
 * Helper function to get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)).filter(
    (element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hidden &&
        window.getComputedStyle(htmlElement).visibility !== 'hidden'
      );
    }
  ) as HTMLElement[];
}

/**
 * Hook for managing roving tabindex pattern
 */
export function useRovingTabIndex(activeIndex: number = 0) {
  const getTabIndex = useCallback((index: number) => {
    return index === activeIndex ? 0 : -1;
  }, [activeIndex]);

  const getAriaSelected = useCallback((index: number) => {
    return index === activeIndex;
  }, [activeIndex]);

  return {
    getTabIndex,
    getAriaSelected
  };
}

/**
 * Hook for managing ARIA expanded state
 */
export function useAriaExpanded(initialExpanded: boolean = false) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    setIsExpanded,
    toggle,
    expand,
    collapse,
    'aria-expanded': isExpanded
  };
}