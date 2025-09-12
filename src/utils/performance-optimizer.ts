/**
 * Performance Optimizer Utility
 * Provides runtime performance optimizations and monitoring
 */

interface OptimizationReport {
  component: string;
  optimizations: string[];
  metrics: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
    improvement: number;
  };
  recommendations: string[];
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize?: number;
  networkRequests?: number;
  cacheHitRate?: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private optimizationReports: Map<string, OptimizationReport> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private memoryMonitor: NodeJS.Timeout | null = null;
  
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Performance Observer for measuring render times
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint'] 
      });
    }

    // Memory monitoring
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring() {
    if (typeof window !== 'undefined') {
      this.memoryMonitor = setInterval(() => {
        this.collectMemoryMetrics();
      }, 30000); // Every 30 seconds
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry) {
    if (entry.entryType === 'measure') {
      console.debug(`[Performance] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
    }
  }

  private collectMemoryMetrics() {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        utilization: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      // Warn if memory usage is high
      if (memoryInfo.utilization > 80) {
        console.warn('[Performance] High memory usage detected:', memoryInfo);
      }
    }
  }

  // React Component Optimization
  optimizeReactComponent(componentName: string, renderFunction: () => any): () => any {
    return () => {
      const startTime = performance.now();
      const startMemory = this.getCurrentMemoryUsage();

      const result = renderFunction();

      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();

      this.recordComponentMetrics(componentName, {
        renderTime: endTime - startTime,
        memoryDelta: endMemory - startMemory,
      });

      return result;
    };
  }

  // Bundle Size Optimization
  async optimizeBundleLoading(chunkName: string): Promise<any> {
    const startTime = performance.now();
    
    try {
      // Dynamic import with performance tracking
      const module = await import(/* webpackChunkName: "[request]" */ chunkName);
      
      const loadTime = performance.now() - startTime;
      console.debug(`[Performance] Chunk ${chunkName} loaded in ${loadTime.toFixed(2)}ms`);
      
      return module;
    } catch (error) {
      console.error(`[Performance] Failed to load chunk ${chunkName}:`, error);
      throw error;
    }
  }

  // Network Request Optimization
  optimizeNetworkRequest<T>(requestFn: () => Promise<T>, cacheKey?: string): Promise<T> {
    const cache = this.getNetworkCache();
    
    if (cacheKey && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < 300000) { // 5 minutes
        console.debug(`[Performance] Cache hit for ${cacheKey}`);
        return Promise.resolve(cachedData.data);
      }
    }

    const startTime = performance.now();
    
    return requestFn().then(data => {
      const endTime = performance.now();
      console.debug(`[Performance] Network request completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      if (cacheKey) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      return data;
    });
  }

  // Memory Management
  optimizeMemoryUsage() {
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }

    // Clear old performance entries
    if (typeof performance !== 'undefined' && performance.clearMeasures) {
      performance.clearMeasures();
      performance.clearMarks();
    }

    // Clear network cache of old entries
    const cache = this.getNetworkCache();
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    for (const [key, value] of cache.entries()) {
      if (value.timestamp < fiveMinutesAgo) {
        cache.delete(key);
      }
    }
  }

  // Performance Analysis
  analyzePerformance(componentName: string): OptimizationReport {
    const existing = this.optimizationReports.get(componentName);
    
    if (!existing) {
      return {
        component: componentName,
        optimizations: [],
        metrics: {
          before: { renderTime: 0, memoryUsage: 0 },
          after: { renderTime: 0, memoryUsage: 0 },
          improvement: 0
        },
        recommendations: this.generateRecommendations(componentName)
      };
    }

    return existing;
  }

  // Generate optimization recommendations
  private generateRecommendations(componentName: string): string[] {
    const recommendations: string[] = [];

    // Basic recommendations based on component patterns
    if (componentName.includes('List') || componentName.includes('Table')) {
      recommendations.push('Consider implementing virtualization for large lists');
      recommendations.push('Use React.memo() for list items');
      recommendations.push('Implement pagination or infinite scroll');
    }

    if (componentName.includes('Form')) {
      recommendations.push('Debounce form validation');
      recommendations.push('Use controlled components sparingly');
      recommendations.push('Implement field-level validation');
    }

    if (componentName.includes('Modal') || componentName.includes('Dialog')) {
      recommendations.push('Use lazy loading for modal content');
      recommendations.push('Implement focus trapping');
      recommendations.push('Consider portal rendering');
    }

    // General recommendations
    recommendations.push('Use React.memo() for pure components');
    recommendations.push('Implement useMemo() for expensive calculations');
    recommendations.push('Use useCallback() for event handlers');
    recommendations.push('Consider code splitting for large components');

    return recommendations;
  }

  private recordComponentMetrics(componentName: string, metrics: any) {
    // Record metrics for analysis
    const existing = this.optimizationReports.get(componentName);
    
    if (existing) {
      existing.metrics.after = {
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryDelta || 0
      };
      existing.metrics.improvement = this.calculateImprovement(
        existing.metrics.before,
        existing.metrics.after
      );
    } else {
      this.optimizationReports.set(componentName, {
        component: componentName,
        optimizations: [],
        metrics: {
          before: { renderTime: metrics.renderTime, memoryUsage: metrics.memoryDelta || 0 },
          after: { renderTime: metrics.renderTime, memoryUsage: metrics.memoryDelta || 0 },
          improvement: 0
        },
        recommendations: this.generateRecommendations(componentName)
      });
    }
  }

  private calculateImprovement(before: PerformanceMetrics, after: PerformanceMetrics): number {
    const renderImprovement = before.renderTime > 0 
      ? ((before.renderTime - after.renderTime) / before.renderTime) * 100 
      : 0;
    
    const memoryImprovement = before.memoryUsage > 0
      ? ((before.memoryUsage - after.memoryUsage) / before.memoryUsage) * 100
      : 0;

    return (renderImprovement + memoryImprovement) / 2;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getNetworkCache(): Map<string, { data: any; timestamp: number }> {
    if (!globalThis.performanceOptimizerCache) {
      globalThis.performanceOptimizerCache = new Map();
    }
    return globalThis.performanceOptimizerCache;
  }

  // Cleanup
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    
    this.optimizationReports.clear();
  }

  // Get optimization summary
  getOptimizationSummary(): {
    totalComponents: number;
    averageImprovement: number;
    topRecommendations: string[];
    memoryUsage: any;
  } {
    const reports = Array.from(this.optimizationReports.values());
    
    const averageImprovement = reports.length > 0
      ? reports.reduce((sum, report) => sum + report.metrics.improvement, 0) / reports.length
      : 0;
    
    const allRecommendations = reports.flatMap(report => report.recommendations);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topRecommendations = Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([rec]) => rec);

    const memoryInfo = typeof performance !== 'undefined' && 'memory' in performance
      ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
          utilization: ((performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit) * 100
        }
      : null;

    return {
      totalComponents: reports.length,
      averageImprovement,
      topRecommendations,
      memoryUsage: memoryInfo
    };
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Utility functions for easy use
export function optimizeComponent(name: string, renderFn: () => any) {
  return performanceOptimizer.optimizeReactComponent(name, renderFn);
}

export function optimizeNetworkCall<T>(requestFn: () => Promise<T>, cacheKey?: string): Promise<T> {
  return performanceOptimizer.optimizeNetworkRequest(requestFn, cacheKey);
}

export function measurePerformance(name: string, fn: () => any) {
  performance.mark(`${name}-start`);
  const result = fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  return result;
}

export async function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  performance.mark(`${name}-start`);
  try {
    const result = await fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  } catch (error) {
    performance.mark(`${name}-error`);
    performance.measure(`${name}-error`, `${name}-start`, `${name}-error`);
    throw error;
  }
}

// React HOC for automatic performance optimization
export function withPerformanceOptimization<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const optimizedName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const OptimizedComponent = React.memo((props: P) => {
    const optimizedRender = React.useMemo(
      () => performanceOptimizer.optimizeReactComponent(optimizedName, () => React.createElement(WrappedComponent, props)),
      [props]
    );
    
    return optimizedRender();
  });
  
  OptimizedComponent.displayName = `Optimized(${optimizedName})`;
  return OptimizedComponent;
}

export default performanceOptimizer;