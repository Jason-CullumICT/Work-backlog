import { Router, Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';

const router = Router();

/**
 * GET /api/dashboard/summary — Status counts, total, throughput.
 * Verifies: FR-WF-008
 */
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await dashboardService.getSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/board — Items grouped by status as columns.
 * Verifies: FR-WF-009
 */
router.get('/board', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await dashboardService.getBoard();
    res.json({ data: board });
  } catch (err) {
    next(err);
  }
});

export default router;
