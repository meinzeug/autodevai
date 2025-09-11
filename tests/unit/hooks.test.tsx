/**
 * Hooks Test Suite
 * Comprehensive tests for custom React hooks
 * Step 302: Hook Test - Custom hooks testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalStorage, useSessionStorage, useLocalStorageAvailable } from '@hooks/useLocalStorage';

// Helper to create a test component for hook testing
function renderTestHook<T, P>(hook: (props: P) => T, initialProps?: P) {
  return renderHook(hook, {
    initialProps,
  });
}

describe('Custom Hooks Tests', () => {
  describe('useLocalStorage Hook', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
      
      // Reset all mocks
      vi.clearAllMocks();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should initialize with initial value when localStorage is empty', () => {
      const { result } = renderTestHook(() => useLocalStorage('test-key', 'initial'));
      
      expect(result.current[0]).toBe('initial');
    });

    it('should initialize with value from localStorage when available', () => {
      localStorage.setItem('test-key', JSON.stringify('stored-value'));
      
      const { result } = renderTestHook(() => useLocalStorage('test-key', 'initial'));
      
      expect(result.current[0]).toBe('stored-value');
    });

    it('should set value and update localStorage', () => {
      const { result } = renderTestHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      expect(localStorage.getItem('test-key')).toBe('"new-value"');
    });

    it('should handle function updates', () => {
      const { result } = renderTestHook(() => useLocalStorage('test-counter', 0));
      
      act(() => {
        result.current[1](prev => prev + 1);
      });
      
      expect(result.current[0]).toBe(1);
      expect(localStorage.getItem('test-counter')).toBe('1');
    });

    it('should remove value from localStorage and reset to initial', () => {
      const { result } = renderTestHook(() => useLocalStorage('test-key', 'initial'));
      
      // First set a value
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      
      // Then remove it
      act(() => {
        result.current[2](); // removeValue function
      });
      
      expect(result.current[0]).toBe('initial');
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should handle complex objects', () => {
      const initialObject = { name: 'John', age: 30 };
      const updatedObject = { name: 'Jane', age: 25 };
      
      const { result } = renderTestHook(() => useLocalStorage('test-object', initialObject));
      
      act(() => {
        result.current[1](updatedObject);
      });
      
      expect(result.current[0]).toEqual(updatedObject);
      expect(JSON.parse(localStorage.getItem('test-object')!)).toEqual(updatedObject);
    });

    it('should handle arrays', () => {
      const initialArray = [1, 2, 3];
      const updatedArray = [4, 5, 6];
      
      const { result } = renderTestHook(() => useLocalStorage('test-array', initialArray));
      
      act(() => {
        result.current[1](updatedArray);
      });
      
      expect(result.current[0]).toEqual(updatedArray);
      expect(JSON.parse(localStorage.getItem('test-array')!)).toEqual(updatedArray);
    });

    it('should handle JSON parsing errors gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('test-key', 'invalid-json');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { result } = renderTestHook(() => useLocalStorage('test-key', 'fallback'));
      
      expect(result.current[0]).toBe('fallback');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reading localStorage'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage write errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage to throw an error
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage full');
      });
      
      const { result } = renderTestHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      // Should still update state even if localStorage fails
      expect(result.current[0]).toBe('new-value');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error setting localStorage'),
        expect.any(Error)
      );
      
      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should sync between tabs via storage events', () => {
      const { result } = renderTestHook(() => useLocalStorage('test-sync', 'initial'));
      
      // Simulate storage event from another tab
      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'test-sync',
          newValue: JSON.stringify('synced-value'),
          oldValue: JSON.stringify('initial'),
          storageArea: localStorage,
        });
        window.dispatchEvent(storageEvent);
      });
      
      expect(result.current[0]).toBe('synced-value');
    });

    it('should dispatch custom events for same-tab sync', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');
      
      const { result } = renderTestHook(() => useLocalStorage('test-event', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-storage',
          detail: {
            key: 'test-event',
            newValue: 'new-value',
          },
        })
      );
      
      eventSpy.mockRestore();
    });

    it('should handle SSR environment gracefully', () => {
      // Mock window as undefined to simulate SSR
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      const { result } = renderTestHook(() => useLocalStorage('test-ssr', 'initial'));
      
      expect(result.current[0]).toBe('initial');
      
      // Restore window
      global.window = originalWindow;
    });

    it('should handle boolean values correctly', () => {
      const { result } = renderTestHook(() => useLocalStorage('test-boolean', false));
      
      act(() => {
        result.current[1](true);
      });
      
      expect(result.current[0]).toBe(true);
      expect(localStorage.getItem('test-boolean')).toBe('true');
    });

    it('should handle null and undefined values', () => {
      const { result } = renderTestHook(() => useLocalStorage<string | null>('test-null', null));
      
      act(() => {
        result.current[1]('not-null');
      });
      
      expect(result.current[0]).toBe('not-null');
      
      act(() => {
        result.current[1](null);
      });
      
      expect(result.current[0]).toBe(null);
      expect(localStorage.getItem('test-null')).toBe('null');
    });
  });

  describe('useSessionStorage Hook', () => {
    beforeEach(() => {
      sessionStorage.clear();
      vi.clearAllMocks();
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it('should initialize with initial value when sessionStorage is empty', () => {
      const { result } = renderTestHook(() => useSessionStorage('session-test', 'initial'));
      
      expect(result.current[0]).toBe('initial');
    });

    it('should initialize with value from sessionStorage when available', () => {
      sessionStorage.setItem('session-test', JSON.stringify('stored-value'));
      
      const { result } = renderTestHook(() => useSessionStorage('session-test', 'initial'));
      
      expect(result.current[0]).toBe('stored-value');
    });

    it('should set value and update sessionStorage', () => {
      const { result } = renderTestHook(() => useSessionStorage('session-test', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      expect(sessionStorage.getItem('session-test')).toBe('"new-value"');
    });

    it('should handle function updates', () => {
      const { result } = renderTestHook(() => useSessionStorage('session-counter', 0));
      
      act(() => {
        result.current[1](prev => prev + 1);
      });
      
      expect(result.current[0]).toBe(1);
      expect(sessionStorage.getItem('session-counter')).toBe('1');
    });

    it('should remove value from sessionStorage', () => {
      const { result } = renderTestHook(() => useSessionStorage('session-test', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      
      act(() => {
        result.current[2](); // removeValue
      });
      
      expect(result.current[0]).toBe('initial');
      expect(sessionStorage.getItem('session-test')).toBeNull();
    });

    it('should handle sessionStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('sessionStorage full');
      });
      
      const { result } = renderTestHook(() => useSessionStorage('session-error', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      expect(consoleSpy).toHaveBeenCalled();
      
      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('useLocalStorageAvailable Hook', () => {
    it('should return true when localStorage is available', async () => {
      const { result } = renderTestHook(() => useLocalStorageAvailable());
      
      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should return false when localStorage throws an error', async () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const { result } = renderTestHook(() => useLocalStorageAvailable());
      
      await waitFor(() => {
        expect(result.current).toBe(false);
      });
      
      setItemSpy.mockRestore();
    });

    it('should cleanup test items from localStorage', async () => {
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem');
      
      renderTestHook(() => useLocalStorageAvailable());
      
      await waitFor(() => {
        expect(removeItemSpy).toHaveBeenCalledWith('__localStorage_test__');
      });
      
      removeItemSpy.mockRestore();
    });
  });

  describe('Storage Hook Edge Cases', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it('should handle rapid successive updates', () => {
      const { result } = renderTestHook(() => useLocalStorage('rapid-updates', 0));
      
      act(() => {
        result.current[1](1);
        result.current[1](2);
        result.current[1](3);
        result.current[1](4);
        result.current[1](5);
      });
      
      expect(result.current[0]).toBe(5);
      expect(localStorage.getItem('rapid-updates')).toBe('5');
    });

    it('should handle circular references gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const { result } = renderTestHook(() => useLocalStorage('circular', {}));
      
      act(() => {
        result.current[1](circularObj);
      });
      
      // Should handle the error and log warning
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle very large objects', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `data-${i}`,
        nested: { value: i * 2 },
      }));
      
      const { result } = renderTestHook(() => useLocalStorage<any[]>('large-object', []));
      
      act(() => {
        result.current[1](largeArray);
      });
      
      expect(result.current[0]).toEqual(largeArray);
      expect(JSON.parse(localStorage.getItem('large-object')!)).toEqual(largeArray);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      
      const { result } = renderTestHook(() => useLocalStorage<Date | string | null>('date-test', null));
      
      act(() => {
        result.current[1](date);
      });
      
      // Date objects get serialized to ISO strings
      expect(result.current[0]).toBe(date.toISOString());
    });

    it('should handle multiple hooks with same key', () => {
      const { result: result1 } = renderTestHook(() => useLocalStorage('shared-key', 'initial'));
      const { result: result2 } = renderTestHook(() => useLocalStorage('shared-key', 'initial'));
      
      act(() => {
        result1.current[1]('updated-value');
      });
      
      expect(result1.current[0]).toBe('updated-value');
      // Second hook should also be updated due to event synchronization
      expect(result2.current[0]).toBe('updated-value');
    });

    it('should handle hook unmounting', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderTestHook(() => useLocalStorage('unmount-test', 'initial'));
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('local-storage', expect.any(Function));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('local-storage', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should handle empty string keys', () => {
      const { result } = renderTestHook(() => useLocalStorage('', 'empty-key-test'));
      
      act(() => {
        result.current[1]('updated');
      });
      
      expect(result.current[0]).toBe('updated');
      expect(localStorage.getItem('')).toBe('"updated"');
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'test-key-with-special-chars!@#$%^&*()';
      const { result } = renderTestHook(() => useLocalStorage(specialKey, 'initial'));
      
      act(() => {
        result.current[1]('special-value');
      });
      
      expect(result.current[0]).toBe('special-value');
      expect(localStorage.getItem(specialKey)).toBe('"special-value"');
    });

    it('should handle numeric keys', () => {
      const numericKey = '12345';
      const { result } = renderTestHook(() => useLocalStorage(numericKey, 'numeric-key'));
      
      act(() => {
        result.current[1]('numeric-value');
      });
      
      expect(result.current[0]).toBe('numeric-value');
      expect(localStorage.getItem(numericKey)).toBe('"numeric-value"');
    });
  });
});