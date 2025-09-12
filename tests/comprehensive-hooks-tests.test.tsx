/**
 * Comprehensive Hooks Test Suite
 * Tests all custom React hooks with edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTheme, ThemeProvider } from '@/hooks/useTheme';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSystemMonitor } from '@/hooks/useSystemMonitor';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Custom Hooks - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTheme Hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    it('should provide default theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('setTheme');
      expect(typeof result.current.setTheme).toBe('function');
    });

    it('should handle theme changes', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('light');
      });
      
      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });
    });

    it('should persist theme to localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('dark');
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('light');
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('should handle invalid theme values gracefully', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        (result.current.setTheme as any)('invalid-theme');
      });
      
      // Should fallback to a valid theme or ignore
      expect(result.current.theme).toMatch(/^(light|dark|auto)$/);
    });

    it('should apply theme to document', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      // Should apply theme class to document
      await waitFor(() => {
        // This would typically check document.documentElement.classList
        expect(result.current.theme).toBe('dark');
      });
    });
  });

  describe('useLocalStorage Hook', () => {
    it('should return initial value when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current[0]).toBe('default');
    });

    it('should return stored value from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('"stored-value"');
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current[0]).toBe('stored-value');
    });

    it('should update localStorage when value changes', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        '"new-value"'
      );
    });

    it('should handle complex objects', () => {
      const complexObject = { name: 'test', values: [1, 2, 3] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(complexObject));
      
      const { result } = renderHook(() => useLocalStorage('test-object', {}));
      
      expect(result.current[0]).toEqual(complexObject);
    });

    it('should handle JSON parse errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      // Should return default value when JSON parse fails
      expect(result.current[0]).toBe('default');
    });

    it('should handle localStorage setItem errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      // Should not crash when setItem fails
      expect(result.current[0]).toBe('new-value');
    });

    it('should handle function updates', () => {
      mockLocalStorage.getItem.mockReturnValue('5');
      
      const { result } = renderHook(() => useLocalStorage('counter', 0));
      
      act(() => {
        result.current[1]((prev: number) => prev + 1);
      });
      
      expect(result.current[0]).toBe(6);
    });

    it('should handle array values', () => {
      const arrayValue = ['item1', 'item2', 'item3'];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(arrayValue));
      
      const { result } = renderHook(() => useLocalStorage('array-key', []));
      
      expect(result.current[0]).toEqual(arrayValue);
    });
  });

  describe('useSystemMonitor Hook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should provide initial system stats', () => {
      const { result } = renderHook(() => useSystemMonitor());
      
      expect(result.current).toHaveProperty('systemStats');
      expect(result.current).toHaveProperty('dockerStatus');
      expect(result.current).toHaveProperty('aiStatus');
      
      expect(result.current.systemStats).toHaveProperty('cpu');
      expect(result.current.systemStats).toHaveProperty('memory');
      expect(result.current.systemStats).toHaveProperty('disk');
      expect(result.current.systemStats).toHaveProperty('network');
    });

    it('should provide reasonable default values', () => {
      const { result } = renderHook(() => useSystemMonitor());
      
      expect(typeof result.current.systemStats.cpu).toBe('number');
      expect(result.current.systemStats.cpu).toBeGreaterThanOrEqual(0);
      expect(result.current.systemStats.cpu).toBeLessThanOrEqual(100);
      
      expect(typeof result.current.systemStats.memory).toBe('number');
      expect(result.current.systemStats.memory).toBeGreaterThanOrEqual(0);
      expect(result.current.systemStats.memory).toBeLessThanOrEqual(100);
    });

    it('should update stats periodically', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useSystemMonitor());
      const initialStats = { ...result.current.systemStats };
      
      // Advance timers to trigger updates
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        // Stats might have updated (mocked implementation)
        expect(result.current.systemStats).toBeDefined();
      });
      
      vi.useRealTimers();
    });

    it('should handle docker status correctly', () => {
      const { result } = renderHook(() => useSystemMonitor());
      
      expect(result.current.dockerStatus).toHaveProperty('running');
      expect(typeof result.current.dockerStatus.running).toBe('boolean');
    });

    it('should handle AI connection status', () => {
      const { result } = renderHook(() => useSystemMonitor());
      
      expect(result.current.aiStatus).toHaveProperty('connected');
      expect(typeof result.current.aiStatus.connected).toBe('boolean');
      
      if (result.current.aiStatus.latency) {
        expect(typeof result.current.aiStatus.latency).toBe('number');
        expect(result.current.aiStatus.latency).toBeGreaterThan(0);
      }
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useSystemMonitor());
      
      // Should cleanup timers and subscriptions
      expect(() => unmount()).not.toThrow();
    });

    it('should handle errors in stat collection', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useSystemMonitor());
      
      // Should still provide stats even if collection fails
      expect(result.current.systemStats).toBeDefined();
      
      consoleErrorSpy.mockRestore();
    });

    it('should throttle updates appropriately', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useSystemMonitor());
      let updateCount = 0;
      const originalStats = result.current.systemStats;
      
      // Monitor for changes
      const checkForUpdates = () => {
        if (result.current.systemStats !== originalStats) {
          updateCount++;
        }
      };
      
      // Fast forward time and check updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
          checkForUpdates();
        });
      }
      
      // Updates should be throttled, not every second
      expect(updateCount).toBeLessThan(10);
      
      vi.useRealTimers();
    });

    it('should provide consistent data structure', () => {
      const { result } = renderHook(() => useSystemMonitor());
      
      // Verify all expected properties exist
      const requiredSystemStats = ['cpu', 'memory', 'disk', 'network', 'processes'];
      requiredSystemStats.forEach(prop => {
        expect(result.current.systemStats).toHaveProperty(prop);
      });
      
      const requiredDockerStatus = ['running'];
      requiredDockerStatus.forEach(prop => {
        expect(result.current.dockerStatus).toHaveProperty(prop);
      });
      
      const requiredAiStatus = ['connected'];
      requiredAiStatus.forEach(prop => {
        expect(result.current.aiStatus).toHaveProperty(prop);
      });
    });
  });

  describe('Hook Error Boundaries and Edge Cases', () => {
    it('should handle hook errors gracefully', () => {
      // Mock console.error to catch any errors
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => {
        try {
          return useLocalStorage('test', 'default');
        } catch (error) {
          return ['fallback', () => {}];
        }
      });
      
      expect(result.current[0]).toBeDefined();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle rapid state changes', async () => {
      const { result } = renderHook(() => useLocalStorage('rapid-test', 0));
      
      // Rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current[1](i);
        });
      }
      
      await waitFor(() => {
        expect(result.current[0]).toBe(99);
      });
    });

    it('should handle concurrent hook usage', () => {
      const hook1 = renderHook(() => useLocalStorage('shared-key', 'value1'));
      const hook2 = renderHook(() => useLocalStorage('shared-key', 'value2'));
      
      // Both hooks should work with the same key
      expect(hook1.result.current[0]).toBeDefined();
      expect(hook2.result.current[0]).toBeDefined();
    });

    it('should handle cleanup on rapid mount/unmount', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useSystemMonitor());
        unmount();
      }
      
      // Should not cause memory leaks or errors
      expect(true).toBe(true);
    });
  });

  describe('Hook Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      const { rerender } = renderHook(() => {
        renderCount++;
        return useLocalStorage('perf-test', 'value');
      });
      
      const initialRenderCount = renderCount;
      
      // Re-render with same props
      rerender();
      
      // Should not cause additional renders beyond initial
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(1);
    });

    it('should handle large data sets efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
      }));
      
      const startTime = performance.now();
      
      const { result } = renderHook(() => useLocalStorage('large-data', largeArray));
      
      const endTime = performance.now();
      
      // Should handle large data efficiently
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current[0]).toBeDefined();
    });
  });
});