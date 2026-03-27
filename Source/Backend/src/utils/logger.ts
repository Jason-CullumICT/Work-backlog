// Verifies: FR-WF-013 — Structured JSON logger (never console.log)
// Verifies: FR-WF-013 — LOG_LEVEL env var controls verbosity

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

function getConfiguredLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (Object.values(LogLevel).includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }
  return LogLevel.INFO;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const minLevel = getConfiguredLevel();
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...( context ? { context } : {}),
  };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit(LogLevel.DEBUG, msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit(LogLevel.INFO, msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit(LogLevel.WARN, msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit(LogLevel.ERROR, msg, ctx),
};
