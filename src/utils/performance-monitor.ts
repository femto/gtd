/**
 * Performance monitoring utility for GTD application
 * Collects and tracks various performance metrics
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift

  // Custom metrics
  renderTime?: number;
  searchTime?: number;
  dataLoadTime?: number;
  memoryUsage?: number;

  // User interaction metrics
  taskCompletionTime?: number;
  navigationTime?: number;
}

export interface PerformanceEntry {
  timestamp: number;
  metrics: PerformanceMetrics;
  userAgent: string;
  url: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers(): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Observe Core Web Vitals
    this.observeWebVitals();

    // Observe navigation timing
    this.observeNavigationTiming();

    // Observe resource timing
    this.observeResourceTiming();
  }

  private observeWebVitals(): void {
    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(
          (entry) => entry.name === 'first-contentful-paint'
        );
        if (fcpEntry) {
          this.metrics.fcp = fcpEntry.startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private observeNavigationTiming(): void {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation && navigation.loadEventEnd > 0) {
        this.metrics.navigationTime =
          navigation.loadEventEnd - navigation.fetchStart;
      }
    }
  }

  private observeResourceTiming(): void {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Track slow resources
          if (entry.duration > 1000) {
            console.warn(
              `Slow resource detected: ${entry.name} took ${entry.duration}ms`
            );
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }
  }

  /**
   * Measure render time for a component or operation
   */
  measureRenderTime<T>(operation: () => T, label?: string): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.metrics.renderTime = duration;

    if (label) {
      console.log(`${label} render time: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Measure async operation time
   */
  async measureAsyncOperation<T>(
    operation: () => Promise<T>,
    label?: string
  ): Promise<T> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (label?.includes('search')) {
      this.metrics.searchTime = duration;
    } else if (label?.includes('load')) {
      this.metrics.dataLoadTime = duration;
    }

    if (label) {
      console.log(`${label} took: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      return this.metrics.memoryUsage;
    }
    return 0;
  }

  /**
   * Track task completion time
   */
  trackTaskCompletion(startTime: number): void {
    const completionTime = performance.now() - startTime;
    this.metrics.taskCompletionTime = completionTime;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.getMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * Create performance entry for logging
   */
  createPerformanceEntry(): PerformanceEntry {
    return {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  /**
   * Log performance metrics to console (development)
   */
  logMetrics(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.table(this.getMetrics());
      console.groupEnd();
    }
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  checkPerformanceThresholds(): {
    isGood: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const metrics = this.getMetrics();

    // Core Web Vitals thresholds
    if (metrics.fcp && metrics.fcp > 1800) {
      warnings.push(
        `FCP is slow: ${metrics.fcp.toFixed(0)}ms (should be < 1800ms)`
      );
    }

    if (metrics.lcp && metrics.lcp > 2500) {
      warnings.push(
        `LCP is slow: ${metrics.lcp.toFixed(0)}ms (should be < 2500ms)`
      );
    }

    if (metrics.fid && metrics.fid > 100) {
      warnings.push(
        `FID is slow: ${metrics.fid.toFixed(0)}ms (should be < 100ms)`
      );
    }

    if (metrics.cls && metrics.cls > 0.1) {
      warnings.push(`CLS is high: ${metrics.cls.toFixed(3)} (should be < 0.1)`);
    }

    // Custom thresholds
    if (metrics.searchTime && metrics.searchTime > 500) {
      warnings.push(`Search is slow: ${metrics.searchTime.toFixed(0)}ms`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 100) {
      warnings.push(`High memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
    }

    return {
      isGood: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cleanup();
    } else {
      this.initializeObservers();
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    measureRenderTime:
      performanceMonitor.measureRenderTime.bind(performanceMonitor),
    measureAsyncOperation:
      performanceMonitor.measureAsyncOperation.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    trackTaskCompletion:
      performanceMonitor.trackTaskCompletion.bind(performanceMonitor),
    logMetrics: performanceMonitor.logMetrics.bind(performanceMonitor),
    checkThresholds:
      performanceMonitor.checkPerformanceThresholds.bind(performanceMonitor),
  };
};
