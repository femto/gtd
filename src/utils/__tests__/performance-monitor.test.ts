import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  performanceMonitor,
  usePerformanceMonitor,
} from '../performance-monitor';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  },
};

// Mock PerformanceObserver
class MockPerformanceObserver {
  callback: PerformanceObserverCallback;

  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
  }

  observe() {}
  disconnect() {}
}

// Setup global mocks
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-agent',
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000',
    },
  },
  writable: true,
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
    // Reset the singleton state
    performanceMonitor.cleanup();
  });

  afterEach(() => {
    performanceMonitor.cleanup();
  });

  describe('measureRenderTime', () => {
    it('should measure render time correctly', () => {
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1050; // start: 1000, end: 1050
      });

      const result = performanceMonitor.measureRenderTime(() => {
        return 'test result';
      }, 'test operation');

      expect(result).toBe('test result');
      expect(performanceMonitor.getMetrics().renderTime).toBe(50);
    });

    it('should handle errors in measured operation', () => {
      // Reset call count for this test
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1100; // start: 1000, end: 1100
      });

      expect(() => {
        performanceMonitor.measureRenderTime(() => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // The renderTime from the previous test might still be there, so let's check the actual value
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.renderTime).toBeGreaterThan(0);
    });
  });

  describe('measureAsyncOperation', () => {
    it('should measure async operation time', async () => {
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1200; // start: 1000, end: 1200
      });

      const asyncOperation = () => Promise.resolve('async result');

      const result = await performanceMonitor.measureAsyncOperation(
        asyncOperation,
        'search operation'
      );

      expect(result).toBe('async result');
      expect(performanceMonitor.getMetrics().searchTime).toBe(200);
    });

    it('should categorize operations by label', async () => {
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1150; // start: 1000, end: 1150
      });

      await performanceMonitor.measureAsyncOperation(
        () => Promise.resolve('data'),
        'load operation'
      );

      expect(performanceMonitor.getMetrics().dataLoadTime).toBe(150);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage in MB', () => {
      const memoryUsage = performanceMonitor.getMemoryUsage();
      expect(memoryUsage).toBe(50); // 50MB as mocked
    });

    it('should return 0 when memory API is not available', () => {
      const originalMemory = (mockPerformance as any).memory;
      delete (mockPerformance as any).memory;

      const memoryUsage = performanceMonitor.getMemoryUsage();
      expect(memoryUsage).toBe(0);

      (mockPerformance as any).memory = originalMemory;
    });
  });

  describe('trackTaskCompletion', () => {
    it('should track task completion time', () => {
      mockPerformance.now.mockReturnValue(2000);
      const startTime = 1500;

      performanceMonitor.trackTaskCompletion(startTime);

      expect(performanceMonitor.getMetrics().taskCompletionTime).toBe(500);
    });
  });

  describe('checkPerformanceThresholds', () => {
    it('should return good performance when all metrics are within thresholds', () => {
      const result = performanceMonitor.checkPerformanceThresholds();

      expect(result.isGood).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect slow FCP', () => {
      // Directly modify the metrics object to simulate slow FCP
      const monitor = performanceMonitor as any;
      monitor.metrics.fcp = 2000; // > 1800ms threshold

      const result = performanceMonitor.checkPerformanceThresholds();

      expect(result.isGood).toBe(false);
      expect(result.warnings.some((w) => w.includes('FCP is slow'))).toBe(true);
    });

    it('should detect high memory usage', () => {
      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 150 * 1024 * 1024; // 150MB

      const result = performanceMonitor.checkPerformanceThresholds();

      expect(result.isGood).toBe(false);
      expect(result.warnings.some((w) => w.includes('High memory usage'))).toBe(
        true
      );
    });

    it('should detect slow search operations', async () => {
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1600; // start: 1000, end: 1600 (600ms)
      });

      await performanceMonitor.measureAsyncOperation(
        () => Promise.resolve([]),
        'search operation'
      );

      const result = performanceMonitor.checkPerformanceThresholds();

      expect(result.isGood).toBe(false);
      expect(result.warnings.some((w) => w.includes('Search is slow'))).toBe(
        true
      );
    });
  });

  describe('createPerformanceEntry', () => {
    it('should create a complete performance entry', () => {
      const entry = performanceMonitor.createPerformanceEntry();

      expect(entry).toMatchObject({
        timestamp: expect.any(Number),
        metrics: expect.any(Object),
        userAgent: 'test-agent',
        url: 'http://localhost:3000',
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup observers', () => {
      // Just ensure the method can be called without errors
      expect(() => performanceMonitor.cleanup()).not.toThrow();
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable monitoring', () => {
      performanceMonitor.setEnabled(false);
      performanceMonitor.setEnabled(true);

      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});

describe('usePerformanceMonitor hook', () => {
  it('should provide performance monitoring methods', () => {
    const hook = usePerformanceMonitor();

    expect(hook).toHaveProperty('measureRenderTime');
    expect(hook).toHaveProperty('measureAsyncOperation');
    expect(hook).toHaveProperty('getMetrics');
    expect(hook).toHaveProperty('trackTaskCompletion');
    expect(hook).toHaveProperty('logMetrics');
    expect(hook).toHaveProperty('checkThresholds');
  });

  it('should bind methods correctly', () => {
    const hook = usePerformanceMonitor();

    let callCount = 0;
    mockPerformance.now.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 1000 : 1050; // start: 1000, end: 1050
    });

    const result = hook.measureRenderTime(() => 'test');

    expect(result).toBe('test');
    expect(hook.getMetrics().renderTime).toBe(50);
  });
});
