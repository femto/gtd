/**
 * Centralized logging system for the GTD application
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private sessionId: string;

  constructor() {
    this.logLevel =
      process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    this.sessionId = this.generateSessionId();

    // Initialize from localStorage
    this.loadLogsFromStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private loadLogsFromStorage(): void {
    try {
      const storedLogs = localStorage.getItem('gtd-logs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  private saveLogsToStorage(): void {
    try {
      // Keep only recent logs in storage
      const recentLogs = this.logs.slice(-100);
      localStorage.setItem('gtd-logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    source?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source,
      sessionId: this.sessionId,
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }

    // Save to storage periodically
    if (this.logs.length % 10 === 0) {
      this.saveLogsToStorage();
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName =
      Object.keys(LogLevel).find(
        (key) => LogLevel[key as keyof typeof LogLevel] === entry.level
      ) || 'UNKNOWN';
    const prefix = `[${entry.timestamp}] [${levelName}]`;
    const message = entry.source
      ? `${prefix} [${entry.source}] ${entry.message}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any, source?: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.addLog(this.createLogEntry(LogLevel.DEBUG, message, data, source));
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: any, source?: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.addLog(this.createLogEntry(LogLevel.INFO, message, data, source));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any, source?: string): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.addLog(this.createLogEntry(LogLevel.WARN, message, data, source));
    }
  }

  /**
   * Log error message
   */
  error(message: string, data?: any, source?: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.addLog(this.createLogEntry(LogLevel.ERROR, message, data, source));
    }
  }

  /**
   * Log user action for analytics
   */
  logUserAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, data, 'USER_ACTION');
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.info(`Performance: ${metric}`, { value, unit }, 'PERFORMANCE');
  }

  /**
   * Log API call
   */
  logApiCall(
    method: string,
    url: string,
    status?: number,
    duration?: number
  ): void {
    const data = { method, url, status, duration };
    if (status && status >= 400) {
      this.error(`API call failed: ${method} ${url}`, data, 'API');
    } else {
      this.info(`API call: ${method} ${url}`, data, 'API');
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get logs by source
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter((log) => log.source === source);
  }

  /**
   * Get recent logs (last n entries)
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('gtd-logs');
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Force save logs to storage
   */
  flush(): void {
    this.saveLogsToStorage();
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience functions
export const log = {
  debug: (message: string, data?: any, source?: string) =>
    logger.debug(message, data, source),
  info: (message: string, data?: any, source?: string) =>
    logger.info(message, data, source),
  warn: (message: string, data?: any, source?: string) =>
    logger.warn(message, data, source),
  error: (message: string, data?: any, source?: string) =>
    logger.error(message, data, source),
  userAction: (action: string, data?: any) =>
    logger.logUserAction(action, data),
  performance: (metric: string, value: number, unit?: string) =>
    logger.logPerformance(metric, value, unit),
  apiCall: (method: string, url: string, status?: number, duration?: number) =>
    logger.logApiCall(method, url, status, duration),
};

// React hook for logging
export const useLogger = () => {
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    logUserAction: logger.logUserAction.bind(logger),
    logPerformance: logger.logPerformance.bind(logger),
    logApiCall: logger.logApiCall.bind(logger),
    getLogs: logger.getLogs.bind(logger),
    clearLogs: logger.clearLogs.bind(logger),
    exportLogs: logger.exportLogs.bind(logger),
  };
};
