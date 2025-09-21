/**
 * Frontend Logger - lähettää selaimen lokit backend:iin
 */

interface LogMetadata {
  [key: string]: any;
  url?: string;
  userAgent?: string;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
}

interface LogEvent {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  component?: string;
  timestamp?: string;
  metadata?: LogMetadata;
}

class FrontendLogger {
  private logQueue: LogEvent[] = [];
  private batchTimeout: number | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 2000; // 2 seconds
  private isOnline = navigator.onLine;

  constructor() {
    this.setupEventListeners();
    this.interceptConsoleMethods();
    this.interceptWindowErrors();
  }

  private setupEventListeners(): void {
    // Network status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page unload - flush remaining logs
    window.addEventListener('beforeunload', () => {
      this.flushQueue(true);
    });
  }

  private interceptConsoleMethods(): void {
    const originalConsole = { ...console };

    console.log = (...args: any[]) => {
      this.log('INFO', args.join(' '), 'Console');
      originalConsole.log(...args);
    };

    console.warn = (...args: any[]) => {
      this.log('WARN', args.join(' '), 'Console');
      originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      this.log('ERROR', args.join(' '), 'Console', {
        stackTrace: new Error().stack
      });
      originalConsole.error(...args);
    };

    console.info = (...args: any[]) => {
      this.log('INFO', args.join(' '), 'Console');
      originalConsole.info(...args);
    };

    console.debug = (...args: any[]) => {
      this.log('DEBUG', args.join(' '), 'Console');
      originalConsole.debug(...args);
    };
  }

  private interceptWindowErrors(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.log('ERROR', `JavaScript Error: ${event.message}`, 'WindowError', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stackTrace: event.error?.stack,
        url: window.location.href
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('ERROR', `Unhandled Promise Rejection: ${event.reason}`, 'PromiseError', {
        reason: event.reason,
        stackTrace: event.reason?.stack,
        url: window.location.href
      });
    });
  }

  /**
   * Log a message
   */
  public log(level: LogEvent['level'], message: string, component?: string, metadata?: LogMetadata): void {
    const logEvent: LogEvent = {
      level,
      message,
      component: component || 'Frontend',
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId()
      }
    };

    this.queueLog(logEvent);
  }

  /**
   * Convenience methods
   */
  public info(message: string, component?: string, metadata?: LogMetadata): void {
    this.log('INFO', message, component, metadata);
  }

  public warn(message: string, component?: string, metadata?: LogMetadata): void {
    this.log('WARN', message, component, metadata);
  }

  public error(message: string, component?: string, metadata?: LogMetadata): void {
    this.log('ERROR', message, component, metadata);
  }

  public debug(message: string, component?: string, metadata?: LogMetadata): void {
    this.log('DEBUG', message, component, metadata);
  }

  private queueLog(logEvent: LogEvent): void {
    this.logQueue.push(logEvent);

    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    } else if (!this.batchTimeout) {
      this.batchTimeout = window.setTimeout(() => this.flushQueue(), this.BATCH_DELAY);
    }
  }

  private async flushQueue(sync = false): Promise<void> {
    if (this.logQueue.length === 0 || !this.isOnline) return;

    const events = [...this.logQueue];
    this.logQueue = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      if (sync && navigator.sendBeacon) {
        // Use sendBeacon for synchronous sends (page unload)
        navigator.sendBeacon('/api/logs/frontend/batch', JSON.stringify({ events }));
      } else {
        // Use fetch for normal async sends
        await fetch('/api/logs/frontend/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events })
        });
      }
    } catch (error) {
      console.warn('Failed to send logs to backend:', error);
      // Put logs back in queue to retry later
      this.logQueue.unshift(...events);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('frontend-logger-session-id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('frontend-logger-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Manual flush
   */
  public flush(): Promise<void> {
    return this.flushQueue();
  }
}

// Create global instance
const frontendLogger = new FrontendLogger();

// Export for manual use
export { frontendLogger, FrontendLogger };

// Make available globally
(window as { frontendLogger?: FrontendLogger }).frontendLogger = frontendLogger;

/**
 * Initialize frontend logger with error capturing
 */
export function initializeFrontendLogger(): void {
    console.log('[FrontendLogger] Initializing frontend logger...');
    
    // Override console methods
    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug
    };

    console.log = (message: unknown, ...args: unknown[]) => {
        originalConsole.log(message, ...args);
        frontendLogger.info(String(message), 'Console');
    };

    console.info = (message: unknown, ...args: unknown[]) => {
        originalConsole.info(message, ...args);
        frontendLogger.info(String(message), 'Console');
    };

    console.warn = (message: unknown, ...args: unknown[]) => {
        originalConsole.warn(message, ...args);
        frontendLogger.warn(String(message), 'Console');
    };

    console.error = (message: unknown, ...args: unknown[]) => {
        originalConsole.error(message, ...args);
        frontendLogger.error(String(message), 'Console');
    };

    console.debug = (message: unknown, ...args: unknown[]) => {
        originalConsole.debug(message, ...args);
        frontendLogger.debug(String(message), 'Console');
    };
    
    // Kaappaa virheet
    window.addEventListener('error', (event) => {
        frontendLogger.error(`Uncaught Error: ${event.error?.message || 'Unknown error'}`, 'Window', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
        });
    });
    
    // Kaappaa Promise rejectionit
    window.addEventListener('unhandledrejection', (event) => {
        frontendLogger.error(`Unhandled Promise Rejection: ${event.reason}`, 'Promise', {
            reason: event.reason
        });
    });
    
    console.log('[FrontendLogger] Frontend logger initialized successfully');
}