// Verifies: FR-WF-013 — Structured JSON logger (never console.log)

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
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
