interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  component?: string;
  timestamp: string;
  metadata?: {
    url?: string;
    userAgent?: string;
    stackTrace?: string;
    [key: string]: unknown;
  };
}

class FrontendLogger {
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 50;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  initialize() {
    // Intercept console methods
    console.log = (...args) => {
      this.captureLog('INFO', args.map(String).join(' '));
      this.originalConsole.log(...args);
    };

    console.info = (...args) => {
      this.captureLog('INFO', args.map(String).join(' '));
      this.originalConsole.info(...args);
    };

    console.warn = (...args) => {
      this.captureLog('WARN', args.map(String).join(' '));
      this.originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.captureLog('ERROR', args.map(String).join(' '));
      this.originalConsole.error(...args);
    };

    // Intercept unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('ERROR', event.message, event.error?.stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('ERROR', `Unhandled Promise Rejection: ${event.reason}`);
    });

    // Start flush timer
    this.startFlushTimer();

    console.log('Frontend logger initialized');
  }

  private captureLog(level: LogEntry['level'], message: string, stack?: string) {
    const logEntry: LogEntry = {
      level,
      message,
      component: 'Frontend',
      timestamp: new Date().toISOString(),
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        stackTrace: stack
      }
    };

    this.logBuffer.push(logEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush() {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch('https://kodinohjaus.fi/api/logs/frontend/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events: logsToSend })
      });
    } catch (error) {
      // Failed to send logs - add them back to buffer (but don't recurse)
      this.originalConsole.error('Failed to send frontend logs:', error);
      // Don't add back to buffer to avoid infinite loop
    }
  }

  destroy() {
    // Restore original console methods
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;

    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining logs
    this.flush();
  }
}

let logger: FrontendLogger | null = null;

export function initializeFrontendLogger() {
  if (!logger) {
    logger = new FrontendLogger();
    logger.initialize();
  }
}

export function destroyFrontendLogger() {
  if (logger) {
    logger.destroy();
    logger = null;
  }
}