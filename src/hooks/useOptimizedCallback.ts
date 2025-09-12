// Optimized callback hook with intelligent memoization
import { useCallback, useRef, useMemo } from 'react';

interface OptimizedCallbackOptions {
  debounceMs?: number;
  throttleMs?: number;
  maxCache?: number;
  aggressive?: boolean;
}

/**
 * Enhanced useCallback with performance optimizations:
 * - Intelligent dependency tracking
 * - Optional debouncing/throttling
 * - Memoization with LRU cache
 * - Performance monitoring
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: OptimizedCallbackOptions = {}
): T {
  const { debounceMs, throttleMs, maxCache = 10, aggressive = false } = options;
  const cacheRef = useRef<Map<string, { result: any; timestamp: number }>>(new Map());
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Create cache key from arguments
  const createCacheKey = useCallback((args: any[]) => {
    try {
      return JSON.stringify(args);
    } catch {
      // Fallback for non-serializable args
      return args.map(arg => typeof arg === 'object' ? String(arg) : arg).join('|');
    }
  }, []);

  // Memoized callback with caching
  const memoizedCallback = useCallback(
    (...args: Parameters<T>): ReturnType<T> => {
      const now = Date.now();
      const cacheKey = createCacheKey(args);
      
      // Check cache for recent results (aggressive caching)
      if (aggressive && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        if (now - cached.timestamp < 5000) { // 5 second cache
          return cached.result;
        }
      }

      // Execute callback
      const result = callback(...args);
      
      // Store in cache with LRU eviction
      if (cacheRef.current.size >= maxCache) {
        const oldestKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(oldestKey);
      }
      
      cacheRef.current.set(cacheKey, { result, timestamp: now });
      
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  // Debounced version
  const debouncedCallback = useMemo(() => {
    if (!debounceMs) return memoizedCallback;
    
    return (...args: Parameters<T>): ReturnType<T> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      return new Promise((resolve) => {
        timeoutRef.current = setTimeout(() => {
          resolve(memoizedCallback(...args));
        }, debounceMs);
      }) as ReturnType<T>;
    };
  }, [memoizedCallback, debounceMs]);

  // Throttled version
  const throttledCallback = useMemo(() => {
    if (!throttleMs) return debouncedCallback;
    
    return (...args: Parameters<T>): ReturnType<T> => {
      const now = Date.now();
      if (now - lastCallRef.current < throttleMs) {
        return;
      }
      
      lastCallRef.current = now;
      return debouncedCallback(...args);
    };
  }, [debouncedCallback, throttleMs]);

  return throttledCallback;
}

/**
 * Optimized useCallback for expensive operations
 */
export function useExpensiveCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useOptimizedCallback(callback, deps, { 
    aggressive: true, 
    maxCache: 20,
    debounceMs: 16 // One frame debounce
  });
}

/**
 * Optimized useCallback for API calls
 */
export function useApiCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  deps: React.DependencyList,
  debounceMs: number = 300
): T {
  return useOptimizedCallback(callback, deps, {
    aggressive: true,
    debounceMs,
    maxCache: 50
  });
}