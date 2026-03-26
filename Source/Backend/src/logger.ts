// Verifies: FR-WF-013 — Re-export structured logger as default for route/service imports
// Backend-coder-2's workflow routes import `logger` as default from this module.
// Wraps utils/logger to provide a compatible default export.

import { logger as structuredLogger } from './utils/logger';

interface LoggerCompat {
  debug: (msgOrObj: string | Record<string, unknown>, ctx?: Record<string, unknown>) => void;
  info: (msgOrObj: string | Record<string, unknown>, ctx?: Record<string, unknown>) => void;
  warn: (msgOrObj: string | Record<string, unknown>, ctx?: Record<string, unknown>) => void;
  error: (msgOrObj: string | Record<string, unknown>, ctx?: Record<string, unknown>) => void;
}

function normalize(
  fn: (msg: string, ctx?: Record<string, unknown>) => void,
): (msgOrObj: string | Record<string, unknown>, ctx?: Record<string, unknown>) => void {
  return (msgOrObj, ctx?) => {
    if (typeof msgOrObj === 'string') {
      fn(msgOrObj, ctx);
    } else {
      const { msg, ...rest } = msgOrObj as Record<string, unknown>;
      fn((msg as string) || 'log', rest);
    }
  };
}

const logger: LoggerCompat = {
  debug: normalize(structuredLogger.debug),
  info: normalize(structuredLogger.info),
  warn: normalize(structuredLogger.warn),
  error: normalize(structuredLogger.error),
};

export default logger;
