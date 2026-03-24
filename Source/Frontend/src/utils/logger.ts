type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LOG_LEVEL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOG_LEVEL) || 'info';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[LOG_LEVEL as LogLevel] || levels[level] >= levels.info;
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

  if (isDev) {
    const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'info';
    // eslint-disable-next-line no-console
    console[method](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.data ?? '');
  } else {
    // Structured JSON logging for production
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      // eslint-disable-next-line no-console
      console.error(output);
    } else {
      // eslint-disable-next-line no-console
      console.info(output);
    }
  }
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    emit({ level: 'debug', message, timestamp: new Date().toISOString(), data });
  },
  info(message: string, data?: Record<string, unknown>) {
    emit({ level: 'info', message, timestamp: new Date().toISOString(), data });
  },
  warn(message: string, data?: Record<string, unknown>) {
    emit({ level: 'warn', message, timestamp: new Date().toISOString(), data });
  },
  error(message: string, data?: Record<string, unknown>) {
    emit({ level: 'error', message, timestamp: new Date().toISOString(), data });
  },
};
