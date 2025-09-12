// Performance monitoring utilities for AutoDev-AI
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  cls: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  timestamp: number;
}

export interface PerformanceConfig {
  reportWebVitals: boolean;
  reportInterval: number;
  maxReports: number;
  endpoint?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    timestamp: Date.now()
  };

  private config: PerformanceConfig = {
    reportWebVitals: true,
    reportInterval: 30000, // 30 seconds
    maxReports: 100,
    endpoint: undefined
  };

  private reports: PerformanceMetrics[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...config };
    this.init();
  }

  private init() {
    if (!this.config.reportWebVitals || typeof window === 'undefined') {
      return;
    }

    // Initialize web vitals collection
    this.initWebVitals();
    
    // Start periodic reporting
    if (this.config.reportInterval > 0) {
      this.startPeriodicReporting();
    }

    // Register service worker update listener
    this.registerServiceWorkerListener();
  }

  private initWebVitals() {
    // Core Web Vitals
    onCLS(this.handleMetric.bind(this, 'cls'));
    onFCP(this.handleMetric.bind(this, 'fcp'));
    onLCP(this.handleMetric.bind(this, 'lcp'));
    onTTFB(this.handleMetric.bind(this, 'ttfb'));
  }

  private handleMetric(name: keyof Omit<PerformanceMetrics, 'timestamp'>, metric: any) {
    this.metrics[name] = metric.value;
    this.metrics.timestamp = Date.now();

    // Log significant metrics
    console.debug(`[Performance] ${name.toUpperCase()}: ${metric.value}`);

    // Report immediately for critical metrics
    if (name === 'cls' && metric.value > 0.25) {
      console.warn(`[Performance] High CLS detected: ${metric.value}`);
    }
    if (name === 'fid' && metric.value > 300) {
      console.warn(`[Performance] High FID detected: ${metric.value}ms`);
    }
    if (name === 'lcp' && metric.value > 4000) {
      console.warn(`[Performance] High LCP detected: ${metric.value}ms`);
    }
  }

  private startPeriodicReporting() {
    this.intervalId = setInterval(() => {
      this.reportMetrics();
    }, this.config.reportInterval);
  }

  private reportMetrics() {
    const report: PerformanceMetrics = {
      ...this.metrics,
      timestamp: Date.now()
    };

    this.reports.push(report);

    // Maintain max reports limit
    if (this.reports.length > this.config.maxReports) {
      this.reports = this.reports.slice(-this.config.maxReports);
    }

    // Send to endpoint if configured
    if (this.config.endpoint) {
      this.sendToEndpoint(report);
    }

    // Emit custom event for application to listen
    window.dispatchEvent(new CustomEvent('performance-report', {
      detail: report
    }));
  }

  private async sendToEndpoint(report: PerformanceMetrics) {
    try {
      await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...report,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: report.timestamp
        })
      });
    } catch (error) {
      console.warn('[Performance] Failed to send metrics:', error);
    }
  }

  private registerServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.info('[Performance] Service Worker updated, reloading page');
        window.location.reload();
      });
    }
  }

  // Public API
  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getAllReports(): PerformanceMetrics[] {
    return [...this.reports];
  }

  public getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.reports.length === 0) return {};

    const totals = this.reports.reduce((acc, report) => {
      Object.keys(report).forEach(key => {
        if (key !== 'timestamp' && typeof report[key as keyof PerformanceMetrics] === 'number') {
          acc[key] = (acc[key] || 0) + (report[key as keyof PerformanceMetrics] as number);
        }
      });
      return acc;
    }, {} as Record<string, number>);

    const averages: Partial<PerformanceMetrics> = {};
    Object.keys(totals).forEach(key => {
      averages[key as keyof PerformanceMetrics] = totals[key] / this.reports.length;
    });

    return averages;
  }

  public reset() {
    this.metrics = {
      cls: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      timestamp: Date.now()
    };
    this.reports = [];
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Static method for quick performance mark
  public static mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  public static measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        console.debug(`[Performance] ${name}: ${measure.duration}ms`);
        return measure.duration;
      } catch (error) {
        console.warn(`[Performance] Failed to measure ${name}:`, error);
        return null;
      }
    }
    return null;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor({
  reportWebVitals: true,
  reportInterval: 60000, // 1 minute
  maxReports: 50
});

// Service Worker registration helper
export const registerServiceWorker = async () => {
  // Skip Service Worker in development mode
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.port === '5173' ||
                        window.location.port === '50010';
  
  if (isDevelopment) {
    console.log('[SW] Skipping service worker in development mode');
    return null;
  }
  
  if ('serviceWorker' in navigator) {
    try {
      console.log('[SW] Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service worker registered successfully:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('[SW] New service worker available');
              
              // Notify user of update
              window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { registration }
              }));
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Performance utilities
export const performanceUtils = {
  // Measure component render time
  measureRender: (componentName: string, renderFn: () => any) => {
    PerformanceMonitor.mark(`${componentName}-render-start`);
    const result = renderFn();
    PerformanceMonitor.mark(`${componentName}-render-end`);
    PerformanceMonitor.measure(
      `${componentName}-render`,
      `${componentName}-render-start`,
      `${componentName}-render-end`
    );
    return result;
  },

  // Measure async operations
  measureAsync: async (operationName: string, asyncFn: () => Promise<any>) => {
    PerformanceMonitor.mark(`${operationName}-start`);
    try {
      const result = await asyncFn();
      PerformanceMonitor.mark(`${operationName}-end`);
      PerformanceMonitor.measure(operationName, `${operationName}-start`, `${operationName}-end`);
      return result;
    } catch (error) {
      PerformanceMonitor.mark(`${operationName}-error`);
      PerformanceMonitor.measure(`${operationName}-error`, `${operationName}-start`, `${operationName}-error`);
      throw error;
    }
  },

  // Get current performance data
  getPerformanceData: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      navigation: {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        ttfb: navigation.responseStart - navigation.requestStart
      },
      paint: paint.reduce((acc, entry) => {
        acc[entry.name] = entry.startTime;
        return acc;
      }, {} as Record<string, number>),
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }
};

export default performanceMonitor;