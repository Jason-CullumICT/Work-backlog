import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Structured JSON logging middleware.
 * Logs every request with method, url, status, and duration.
 * Verifies: FR-WF-015 — structured logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      userAgent: req.get('user-agent'),
    }, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
}
