// Verifies: FR-WF-013 — Error handling middleware with structured logging
import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
}
