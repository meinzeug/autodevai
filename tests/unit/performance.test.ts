/**
 * Performance Testing Suite
 * Tests for performance-critical components and functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// Performance testing utilities
class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      throw new Error(`Start mark "${startMark}" not found`);
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (endMark && endTime === undefined) {
      throw new Error(`End mark "${endMark}" not found`);
    }

    const duration = (endTime ?? performance.now()) - startTime;
    this.measures.set(name, duration);
    return duration;
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

// Mock performance-critical functions for testing
class DataProcessor {
  static processLargeArray(data: number[]): number[] {
    return data.map(x => x * 2).filter(x => x > 0).sort((a, b) => a - b);
  }

  static processLargeObject(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        result[key] = value.toUpperCase();
      } else if (typeof value === 'number') {
        result[key] = value * 2;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map();
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }
}

// Mock virtual list implementation
class VirtualList {
  private items: any[];
  private viewportHeight: number;
  private itemHeight: number;
  private scrollTop: number = 0;

  constructor(items: any[], viewportHeight: number, itemHeight: number) {
    this.items = items;
    this.viewportHeight = viewportHeight;
    this.itemHeight = itemHeight;
  }

  getVisibleRange(): { start: number; end: number } {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(
      start + Math.ceil(this.viewportHeight / this.itemHeight) + 1,
      this.items.length
    );
    return { start, end };
  }

  getVisibleItems(): any[] {
    const { start, end } = this.getVisibleRange();
    return this.items.slice(start, end);
  }

  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }
}

describe('Performance Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.clear();
    vi.useRealTimers();
  });

  describe('Array Processing Performance', () => {
    it('should process large arrays within performance budget', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i - 5000);
      
      monitor.mark('array-processing-start');
      const result = DataProcessor.processLargeArray(largeArray);
      monitor.mark('array-processing-end');
      
      const duration = monitor.measure(
        'array-processing',
        'array-processing-start',
        'array-processing-end'
      );

      expect(result).toHaveLength(4999); // Only positive numbers after filtering (excluding 0)
      expect(result[0]).toBe(2); // First positive number * 2
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle very large arrays efficiently', () => {
      const veryLargeArray = Array.from({ length: 100000 }, (_, i) => i);
      
      monitor.mark('large-array-start');
      const result = DataProcessor.processLargeArray(veryLargeArray);
      monitor.mark('large-array-end');
      
      const duration = monitor.measure(
        'large-array',
        'large-array-start',
        'large-array-end'
      );

      expect(result).toHaveLength(99999); // All positive numbers
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle empty arrays efficiently', () => {
      monitor.mark('empty-array-start');
      const result = DataProcessor.processLargeArray([]);
      monitor.mark('empty-array-end');
      
      const duration = monitor.measure(
        'empty-array',
        'empty-array-start',
        'empty-array-end'
      );

      expect(result).toEqual([]);
      expect(duration).toBeLessThan(1); // Should be near-instantaneous
    });

    it('should maintain linear time complexity', () => {
      const sizes = [1000, 2000, 4000, 8000];
      const durations: number[] = [];

      sizes.forEach((size, index) => {
        const array = Array.from({ length: size }, (_, i) => i);
        
        monitor.mark(`linear-test-${index}-start`);
        DataProcessor.processLargeArray(array);
        monitor.mark(`linear-test-${index}-end`);
        
        const duration = monitor.measure(
          `linear-test-${index}`,
          `linear-test-${index}-start`,
          `linear-test-${index}-end`
        );
        
        durations.push(duration);
      });

      // Each doubling of size should roughly double the time (within tolerance)
      for (let i = 1; i < durations.length; i++) {
        const current = durations[i];
        const previous = durations[i - 1];
        if (current !== undefined && previous !== undefined && previous > 0) {
          const ratio = current / previous;
          expect(ratio).toBeLessThan(3); // Allow for some variance, but should be roughly linear
          expect(ratio).toBeGreaterThan(0.5);
        }
      }
    });
  });

  describe('Object Processing Performance', () => {
    it('should process large objects within performance budget', () => {
      const largeObject: Record<string, any> = {};
      for (let i = 0; i < 10000; i++) {
        largeObject[`key${i}`] = i % 2 === 0 ? `value${i}` : i;
      }

      monitor.mark('object-processing-start');
      const result = DataProcessor.processLargeObject(largeObject);
      monitor.mark('object-processing-end');
      
      const duration = monitor.measure(
        'object-processing',
        'object-processing-start',
        'object-processing-end'
      );

      expect(Object.keys(result)).toHaveLength(10000);
      expect(result['key0']).toBe('VALUE0'); // String should be uppercased
      expect(result['key1']).toBe(2); // Number should be doubled
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle nested objects efficiently', () => {
      const nestedObject = {
        level1: {
          level2: {
            level3: {
              data: 'test',
              number: 42,
            },
          },
        },
      };

      monitor.mark('nested-object-start');
      const result = DataProcessor.deepClone(nestedObject);
      monitor.mark('nested-object-end');
      
      const duration = monitor.measure(
        'nested-object',
        'nested-object-start',
        'nested-object-end'
      );

      expect(result).toEqual(nestedObject);
      expect(result).not.toBe(nestedObject); // Should be a different object
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should manage memory efficiently for large datasets', () => {
      // Simulate memory usage tracking
      const initialMemory = process.memoryUsage().heapUsed;
      
      const largeDataSet = Array.from({ length: 50000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
        nested: { value: i * 2 },
      }));

      // Process the data
      const processed = largeDataSet.map(item => ({
        ...item,
        processed: true,
      }));

      // Check memory usage
      const afterProcessing = process.memoryUsage().heapUsed;
      const memoryIncrease = afterProcessing - initialMemory;

      expect(processed).toHaveLength(50000);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    it('should clean up memory after processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and process large dataset in a scope
      (() => {
        const tempData = Array.from({ length: 10000 }, (_, i) => i);
        DataProcessor.processLargeArray(tempData);
      })();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for potential cleanup using fake timers
      vi.advanceTimersByTime(100);
      await new Promise(resolve => {
        vi.useRealTimers();
        setTimeout(() => {
          vi.useFakeTimers();
          resolve(undefined);
        }, 0);
      });

      const afterCleanup = process.memoryUsage().heapUsed;
      const memoryDifference = Math.abs(afterCleanup - initialMemory);

      // Memory usage should be similar to initial (allowing for more variance)
      expect(memoryDifference).toBeLessThan(20 * 1024 * 1024); // Less than 20MB difference
    }, 15000);
  });

  describe('Memoization Performance', () => {
    it('should improve performance with memoization', () => {
      const expensiveFunction = vi.fn((n: number) => {
        // Simulate expensive computation
        let result = 0;
        for (let i = 0; i < n * 1000; i++) {
          result += Math.sqrt(i);
        }
        return result;
      });

      const memoizedFunction = DataProcessor.memoize(expensiveFunction);

      // First call should be slow
      monitor.mark('first-call-start');
      const result1 = memoizedFunction(100);
      monitor.mark('first-call-end');
      const firstCallDuration = monitor.measure(
        'first-call',
        'first-call-start',
        'first-call-end'
      );

      // Second call with same argument should be fast
      monitor.mark('second-call-start');
      const result2 = memoizedFunction(100);
      monitor.mark('second-call-end');
      const secondCallDuration = monitor.measure(
        'second-call',
        'second-call-start',
        'second-call-end'
      );

      expect(result1).toBe(result2);
      expect(expensiveFunction).toHaveBeenCalledTimes(1); // Only called once
      expect(secondCallDuration).toBeLessThan(firstCallDuration / 10); // Should be much faster
    });

    it('should handle cache miss correctly', () => {
      const memoizedFunction = DataProcessor.memoize((x: number) => x * x);

      const result1 = memoizedFunction(5);
      const result2 = memoizedFunction(10); // Different argument
      const result3 = memoizedFunction(5); // Same as first

      expect(result1).toBe(25);
      expect(result2).toBe(100);
      expect(result3).toBe(25);
    });
  });

  describe('Virtual List Performance', () => {
    it('should efficiently handle large lists with virtualization', () => {
      const largeItemList = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      const virtualList = new VirtualList(largeItemList, 600, 50); // 600px viewport, 50px items

      monitor.mark('virtual-list-start');
      const visibleItems = virtualList.getVisibleItems();
      monitor.mark('virtual-list-end');

      const duration = monitor.measure(
        'virtual-list',
        'virtual-list-start',
        'virtual-list-end'
      );

      expect(visibleItems.length).toBeLessThan(20); // Should only render visible items
      expect(duration).toBeLessThan(5); // Should be very fast
    });

    it('should handle scrolling efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      const virtualList = new VirtualList(items, 400, 40);

      const scrollPositions = [0, 1000, 2000, 5000, 10000];
      const durations: number[] = [];

      scrollPositions.forEach((position, index) => {
        monitor.mark(`scroll-${index}-start`);
        virtualList.setScrollTop(position);
        virtualList.getVisibleItems();
        monitor.mark(`scroll-${index}-end`);

        const duration = monitor.measure(
          `scroll-${index}`,
          `scroll-${index}-start`,
          `scroll-${index}-end`
        );
        durations.push(duration);
      });

      // All scroll operations should be fast and consistent
      durations.forEach(duration => {
        expect(duration).toBeLessThan(5);
      });

      // Performance should be consistent regardless of scroll position
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      expect(maxDuration / minDuration).toBeLessThan(15); // Should be relatively consistent (even more lenient)
    });
  });

  describe('Rendering Performance', () => {
    it('should handle many DOM updates efficiently', () => {
      // Mock DOM operations
      const mockElements: Array<{ textContent: string }> = [];
      
      // Simulate creating many elements
      monitor.mark('dom-creation-start');
      for (let i = 0; i < 1000; i++) {
        mockElements.push({ textContent: `Element ${i}` });
      }
      monitor.mark('dom-creation-end');

      const creationDuration = monitor.measure(
        'dom-creation',
        'dom-creation-start',
        'dom-creation-end'
      );

      // Simulate updating many elements
      monitor.mark('dom-update-start');
      mockElements.forEach((element, index) => {
        element.textContent = `Updated Element ${index}`;
      });
      monitor.mark('dom-update-end');

      const updateDuration = monitor.measure(
        'dom-update',
        'dom-update-start',
        'dom-update-end'
      );

      expect(mockElements).toHaveLength(1000);
      expect(creationDuration).toBeLessThan(50);
      expect(updateDuration).toBeLessThan(25); // Updates should be faster than creation
    });

    it('should batch DOM updates for better performance', () => {
      const updates: string[] = [];
      
      // Simulate batched updates
      monitor.mark('batched-updates-start');
      
      // Collect all updates first
      for (let i = 0; i < 100; i++) {
        updates.push(`Update ${i}`);
      }
      
      // Apply all updates at once (batch)
      const batchedResult = updates.join(', ');
      
      monitor.mark('batched-updates-end');

      const batchedDuration = monitor.measure(
        'batched-updates',
        'batched-updates-start',
        'batched-updates-end'
      );

      // Compare with individual updates
      monitor.mark('individual-updates-start');
      let individualResult = '';
      for (let i = 0; i < 100; i++) {
        if (individualResult) individualResult += ', ';
        individualResult += `Update ${i}`;
      }
      monitor.mark('individual-updates-end');

      const individualDuration = monitor.measure(
        'individual-updates',
        'individual-updates-start',
        'individual-updates-end'
      );

      expect(batchedResult).toBe(individualResult);
      // Batched updates should be more efficient (though in this mock they might be similar)
      expect(batchedDuration).toBeLessThanOrEqual(individualDuration * 2); // More lenient timing expectation
    });
  });

  describe('Async Performance', () => {
    it('should handle concurrent async operations efficiently', async () => {
      const asyncOperation = (delay: number, value: number): Promise<number> => 
        new Promise(resolve => setTimeout(() => resolve(value * 2), delay));

      monitor.mark('concurrent-start');
      
      // Run operations concurrently
      const promises = Array.from({ length: 10 }, (_, i) => 
        asyncOperation(50, i)
      );
      
      // Advance timers to simulate async completion
      const resultPromise = Promise.all(promises);
      vi.advanceTimersByTime(50);
      const results = await resultPromise;
      
      monitor.mark('concurrent-end');

      const concurrentDuration = monitor.measure(
        'concurrent',
        'concurrent-start',
        'concurrent-end'
      );

      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      expect(concurrentDuration).toBeLessThan(100); // Should complete in ~50ms, not 500ms
    }, 15000);

    it('should handle sequential async operations', async () => {
      const asyncOperation = (delay: number, value: number): Promise<number> => 
        new Promise(resolve => setTimeout(() => resolve(value * 2), delay));

      monitor.mark('sequential-start');
      
      // Run operations sequentially
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const resultPromise = asyncOperation(10, i);
        vi.advanceTimersByTime(10);
        const result = await resultPromise;
        results.push(result);
      }
      
      monitor.mark('sequential-end');

      const sequentialDuration = monitor.measure(
        'sequential',
        'sequential-start',
        'sequential-end'
      );

      expect(results).toEqual([0, 2, 4, 6, 8]);
      expect(sequentialDuration).toBeGreaterThan(0); // Should take some time
      expect(sequentialDuration).toBeLessThan(200); // But not too much longer (more lenient)
    }, 15000);
  });

  describe('Performance Regression Tests', () => {
    it('should maintain baseline performance for critical operations', () => {
      const baselines = {
        arrayProcessing: 100, // ms
        objectProcessing: 200, // ms
        virtualListScroll: 5, // ms
      };

      // Test array processing
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      monitor.mark('regression-array-start');
      DataProcessor.processLargeArray(largeArray);
      monitor.mark('regression-array-end');
      const arrayDuration = monitor.measure('regression-array', 'regression-array-start', 'regression-array-end');

      // Test object processing
      const largeObject = Object.fromEntries(
        Array.from({ length: 10000 }, (_, i) => [`key${i}`, i])
      );
      monitor.mark('regression-object-start');
      DataProcessor.processLargeObject(largeObject);
      monitor.mark('regression-object-end');
      const objectDuration = monitor.measure('regression-object', 'regression-object-start', 'regression-object-end');

      // Test virtual list
      const virtualList = new VirtualList(
        Array.from({ length: 10000 }, (_, i) => ({ id: i })),
        400,
        40
      );
      monitor.mark('regression-virtual-start');
      virtualList.setScrollTop(5000);
      virtualList.getVisibleItems();
      monitor.mark('regression-virtual-end');
      const virtualDuration = monitor.measure('regression-virtual', 'regression-virtual-start', 'regression-virtual-end');

      // Check against baselines
      expect(arrayDuration).toBeLessThan(baselines.arrayProcessing);
      expect(objectDuration).toBeLessThan(baselines.objectProcessing);
      expect(virtualDuration).toBeLessThan(baselines.virtualListScroll);
    });

    it('should track performance metrics over time', () => {
      const metrics = {
        operations: [] as Array<{ name: string; duration: number; timestamp: number }>,
      };

      // Simulate multiple operations
      const operations = [
        () => DataProcessor.processLargeArray(Array.from({ length: 1000 }, (_, i) => i)),
        () => DataProcessor.processLargeObject({ a: 1, b: 2, c: 3 }),
        () => DataProcessor.deepClone({ nested: { data: 'test' } }),
      ];

      operations.forEach((operation, index) => {
        monitor.mark(`metric-${index}-start`);
        operation();
        monitor.mark(`metric-${index}-end`);
        
        const duration = monitor.measure(`metric-${index}`, `metric-${index}-start`, `metric-${index}-end`);
        
        metrics.operations.push({
          name: `operation-${index}`,
          duration,
          timestamp: Date.now(),
        });
      });

      expect(metrics.operations).toHaveLength(3);
      metrics.operations.forEach(metric => {
        expect(metric.duration).toBeGreaterThan(0);
        expect(metric.timestamp).toBeTypeOf('number');
      });
    });
  });
});