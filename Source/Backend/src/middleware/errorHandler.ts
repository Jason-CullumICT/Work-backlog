import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../services/workItemService';
import { NotFoundError } from '../services/workflowService';
import { logger } from '../config/logger';

/**
 * Global error handler middleware.
 * Returns {error: "message"} format per architecture rules.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
