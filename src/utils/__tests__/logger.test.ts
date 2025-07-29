import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel, log, useLogger } from '../logger';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

Object.defineProperty(global, 'console', {
  value: mockConsole,
});

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('[]');
    logger.clearLogs();
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe('Basic logging', () => {
    it('should log debug messages', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Debug message', { test: true }, 'TEST');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].data).toEqual({ test: true });
      expect(logs[0].source).toBe('TEST');
    });

    it('should log info messages', () => {
      logger.info('Info message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Info message');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].message).toBe('Warning message');
    });

    it('should log error messages', () => {
      logger.error('Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Error message');
    });
  });

  describe('Log level filtering', () => {
    it('should respect log level settings', () => {
      logger.setLogLevel(LogLevel.WARN);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2); // Only warn and error
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('should get current log level', () => {
      logger.setLogLevel(LogLevel.INFO);
      expect(logger.getLogLevel()).toBe(LogLevel.INFO);
    });
  });

  describe('Specialized logging methods', () => {
    it('should log user actions', () => {
      logger.logUserAction('button_click', { buttonId: 'save' });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('User action: button_click');
      expect(logs[0].data).toEqual({ buttonId: 'save' });
      expect(logs[0].source).toBe('USER_ACTION');
    });

    it('should log performance metrics', () => {
      logger.logPerformance('render_time', 150, 'ms');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Performance: render_time');
      expect(logs[0].data).toEqual({ value: 150, unit: 'ms' });
      expect(logs[0].source).toBe('PERFORMANCE');
    });

    it('should log successful API calls', () => {
      logger.logApiCall('GET', '/api/tasks', 200, 150);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('API call: GET /api/tasks');
      expect(logs[0].data).toEqual({
        method: 'GET',
        url: '/api/tasks',
        status: 200,
        duration: 150,
      });
    });

    it('should log failed API calls as errors', () => {
      logger.logApiCall('POST', '/api/tasks', 500, 300);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('API call failed: POST /api/tasks');
    });
  });

  describe('Log retrieval', () => {
    beforeEach(() => {
      logger.debug('Debug log');
      logger.info('Info log');
      logger.warn('Warning log');
      logger.error('Error log');
    });

    it('should get logs by level', () => {
      const errorLogs = logger.getLogsByLevel(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error log');
    });

    it('should get logs by source', () => {
      logger.info('Test message', null, 'TEST_SOURCE');
      const sourceLogs = logger.getLogsBySource('TEST_SOURCE');
      expect(sourceLogs).toHaveLength(1);
      expect(sourceLogs[0].message).toBe('Test message');
    });

    it('should get recent logs', () => {
      const recentLogs = logger.getRecentLogs(2);
      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].message).toBe('Warning log');
      expect(recentLogs[1].message).toBe('Error log');
    });
  });

  describe('Storage management', () => {
    it('should save logs to localStorage periodically', () => {
      // Add 10 logs to trigger save
      for (let i = 0; i < 10; i++) {
        logger.info(`Log ${i}`);
      }

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'gtd-logs',
        expect.any(String)
      );
    });

    it('should load logs from localStorage on initialization', () => {
      const existingLogs = [
        {
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          message: 'Existing log',
          sessionId: 'test-session',
        },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingLogs));

      // Create new logger instance to test loading
      const testLogger = new (logger.constructor as any)();
      const logs = testLogger.getLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Existing log');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      logger.flush();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save logs to storage:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should maintain maximum log limit', () => {
      // Add more than max logs
      for (let i = 0; i < 1100; i++) {
        logger.info(`Log ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Export functionality', () => {
    it('should export logs as JSON', () => {
      logger.info('Test log');
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Test log');
    });

    it('should clear all logs', () => {
      logger.info('Test log');
      expect(logger.getLogs()).toHaveLength(1);

      logger.clearLogs();
      expect(logger.getLogs()).toHaveLength(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('gtd-logs');
    });
  });

  describe('Console output in development', () => {
    it('should output to console in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('Convenience functions', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('should provide convenience log functions', () => {
    log.debug('Debug');
    log.info('Info');
    log.warn('Warning');
    log.error('Error');
    log.userAction('click');
    log.performance('metric', 100);
    log.apiCall('GET', '/test', 200, 50);

    const logs = logger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe('useLogger hook', () => {
  it('should provide logger methods', () => {
    const hook = useLogger();

    expect(typeof hook.debug).toBe('function');
    expect(typeof hook.info).toBe('function');
    expect(typeof hook.warn).toBe('function');
    expect(typeof hook.error).toBe('function');
    expect(typeof hook.logUserAction).toBe('function');
    expect(typeof hook.logPerformance).toBe('function');
    expect(typeof hook.logApiCall).toBe('function');
    expect(typeof hook.getLogs).toBe('function');
    expect(typeof hook.clearLogs).toBe('function');
    expect(typeof hook.exportLogs).toBe('function');
  });
});
