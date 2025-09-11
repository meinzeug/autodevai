/**
 * Utils Test Suite
 * Comprehensive tests for utility functions
 * Step 300: Utils Test - Unit tests for utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import { cn } from '@utils/cn';

describe('Utils Tests', () => {
  describe('cn (Class Name) Utility', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
    });

    it('should handle null and undefined inputs', () => {
      expect(cn('base', null, undefined, 'end')).toBe('base end');
    });

    it('should handle array inputs', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
    });

    it('should handle object inputs with boolean values', () => {
      expect(cn({
        'class1': true,
        'class2': false,
        'class3': true
      })).toBe('class1 class3');
    });

    it('should merge conflicting Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-3')).toBe('py-1 px-3');
    });

    it('should handle complex mixed inputs', () => {
      expect(cn(
        'base-class',
        ['array-class-1', 'array-class-2'],
        { 'conditional-true': true, 'conditional-false': false },
        null,
        undefined,
        'final-class'
      )).toBe('base-class array-class-1 array-class-2 conditional-true final-class');
    });

    it('should handle whitespace and empty strings', () => {
      expect(cn('  ', '', '  class  ', '  ')).toBe('class');
    });

    it('should merge responsive classes', () => {
      expect(cn('text-sm', 'md:text-base', 'lg:text-lg')).toBe('text-sm md:text-base lg:text-lg');
    });
  });

  describe('Hive Coordination Utils', () => {
    // These will be implemented when hive-coordination utils are available
    it.skip('should coordinate hive mind operations', () => {
      // Implementation pending
    });

    it.skip('should handle neural bridge communications', () => {
      // Implementation pending
    });
  });

  describe('Menu Integration Utils', () => {
    // These will be implemented when menu-integration utils are available
    it.skip('should integrate menu systems', () => {
      // Implementation pending
    });

    it.skip('should handle menu state management', () => {
      // Implementation pending
    });
  });

  describe('Error Handling Utils', () => {
    it('should create error with message', () => {
      const error = new Error('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('Error');
    });

    it('should handle error stack traces', () => {
      const error = new Error('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('Type Guards', () => {
    it('should check if value is string', () => {
      const isString = (value: unknown): value is string => typeof value === 'string';
      
      expect(isString('hello')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
    });

    it('should check if value is number', () => {
      const isNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value);
      
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(123.45)).toBe(true);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(null)).toBe(false);
    });

    it('should check if value is object', () => {
      const isObject = (value: unknown): value is object => 
        typeof value === 'object' && value !== null && !Array.isArray(value);
      
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });

    it('should check if value is array', () => {
      const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
      
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(['a', 'b', 'c'])).toBe(true);
      expect(isArray({})).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('Array Utils', () => {
    it('should remove duplicates from array', () => {
      const removeDuplicates = <T>(arr: T[]): T[] => [...new Set(arr)];
      
      expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(removeDuplicates([])).toEqual([]);
    });

    it('should chunk array into smaller arrays', () => {
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };
      
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
      expect(chunk([], 2)).toEqual([]);
    });

    it('should flatten nested arrays', () => {
      const flatten = <T>(arr: (T | T[])[]): T[] => arr.flat() as T[];
      
      expect(flatten([1, [2, 3], 4, [5, 6]])).toEqual([1, 2, 3, 4, 5, 6]);
      expect(flatten(['a', ['b', 'c'], 'd'])).toEqual(['a', 'b', 'c', 'd']);
      expect(flatten([])).toEqual([]);
    });
  });

  describe('Object Utils', () => {
    it('should deep clone objects', () => {
      const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
      
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('should pick specific properties from object', () => {
      const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
        const result = {} as Pick<T, K>;
        keys.forEach(key => {
          if (key in obj) {
            result[key] = obj[key];
          }
        });
        return result;
      };
      
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should omit specific properties from object', () => {
      const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
        const result = { ...obj };
        keys.forEach(key => {
          delete result[key];
        });
        return result;
      };
      
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      expect(omit(obj, ['b', 'd'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('String Utils', () => {
    it('should capitalize first letter', () => {
      const capitalize = (str: string): string => 
        str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
      expect(capitalize('tEST')).toBe('Test');
      expect(capitalize('')).toBe('');
    });

    it('should convert to camelCase', () => {
      const toCamelCase = (str: string): string =>
        str.replace(/[_-](.)/g, (_, char) => char.toUpperCase());
      
      expect(toCamelCase('hello_world')).toBe('helloWorld');
      expect(toCamelCase('test-case')).toBe('testCase');
      expect(toCamelCase('already-camel_case')).toBe('alreadyCamelCase');
    });

    it('should convert to kebab-case', () => {
      const toKebabCase = (str: string): string =>
        str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      
      expect(toKebabCase('helloWorld')).toBe('hello-world');
      expect(toKebabCase('TestCase')).toBe('-test-case');
      expect(toKebabCase('alreadyKebab')).toBe('already-kebab');
    });

    it('should truncate string with ellipsis', () => {
      const truncate = (str: string, maxLength: number): string =>
        str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
      
      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Short', 10)).toBe('Short');
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('Date Utils', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      expect(date.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should check if date is today', () => {
      const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
      };
      
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      expect(isToday(today)).toBe(true);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should calculate days between dates', () => {
      const daysBetween = (date1: Date, date2: Date): number => {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };
      
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-05');
      
      expect(daysBetween(date1, date2)).toBe(4);
    });
  });

  describe('Number Utils', () => {
    it('should format number as currency', () => {
      const formatCurrency = (amount: number, currency = 'USD'): string =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(amount);
      
      expect(formatCurrency(123.45)).toBe('$123.45');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format number as percentage', () => {
      const formatPercentage = (value: number, decimals = 2): string =>
        `${(value * 100).toFixed(decimals)}%`;
      
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(0.5, 0)).toBe('50%');
    });

    it('should clamp number within range', () => {
      const clamp = (value: number, min: number, max: number): number =>
        Math.min(Math.max(value, min), max);
      
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should generate random number within range', () => {
      const randomBetween = (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min;
      
      const result = randomBetween(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });
  });

  describe('Async Utils', () => {
    it('should delay execution', async () => {
      const delay = (ms: number): Promise<void> =>
        new Promise(resolve => setTimeout(resolve, ms));
      
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(95);
    });

    it('should retry failed operations', async () => {
      const retry = async <T>(
        operation: () => Promise<T>,
        maxAttempts: number
      ): Promise<T> => {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error as Error;
            if (attempt === maxAttempts) {
              throw lastError;
            }
          }
        }
        
        throw lastError!;
      };
      
      let attempts = 0;
      const mockOperation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Operation failed');
        }
        return 'Success';
      });
      
      const result = await retry(mockOperation, 3);
      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });

    it('should implement timeout for promises', async () => {
      const withTimeout = <T>(
        promise: Promise<T>,
        timeoutMs: number
      ): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          ),
        ]);
      };
      
      const slowOperation = new Promise(resolve => setTimeout(resolve, 200));
      
      await expect(withTimeout(slowOperation, 100)).rejects.toThrow('Timeout');
    });
  });

  describe('Performance Utils', () => {
    it('should debounce function calls', () => {
      vi.useFakeTimers();
      
      const debounce = <T extends (...args: unknown[]) => unknown>(
        func: T,
        waitMs: number
      ): ((...args: Parameters<T>) => void) => {
        let timeoutId: NodeJS.Timeout;
        
        return (...args: Parameters<T>) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func(...args), waitMs);
        };
      };
      
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');
      
      expect(mockFn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledOnce();
      expect(mockFn).toHaveBeenCalledWith('call3');
      
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      vi.useFakeTimers();
      
      const throttle = <T extends (...args: unknown[]) => unknown>(
        func: T,
        limitMs: number
      ): ((...args: Parameters<T>) => void) => {
        let inThrottle: boolean;
        
        return (...args: Parameters<T>) => {
          if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limitMs);
          }
        };
      };
      
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');
      
      expect(mockFn).toHaveBeenCalledOnce();
      expect(mockFn).toHaveBeenCalledWith('call1');
      
      vi.advanceTimersByTime(100);
      
      throttledFn('call4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('call4');
      
      vi.useRealTimers();
    });

    it('should memoize function results', () => {
      const memoize = <T extends (...args: unknown[]) => unknown>(func: T): T => {
        const cache = new Map<string, ReturnType<T>>();
        
        return ((...args: Parameters<T>): ReturnType<T> => {
          const key = JSON.stringify(args);
          
          if (cache.has(key)) {
            return cache.get(key)!;
          }
          
          const result = func(...args) as ReturnType<T>;
          cache.set(key, result);
          return result;
        }) as T;
      };
      
      const expensiveFunction = vi.fn((x: number) => x * x);
      const memoizedFunction = memoize(expensiveFunction as (...args: unknown[]) => unknown);
      
      expect(memoizedFunction(5)).toBe(25);
      expect(memoizedFunction(5)).toBe(25);
      expect(memoizedFunction(10)).toBe(100);
      
      expect(expensiveFunction).toHaveBeenCalledTimes(2);
    });
  });
});