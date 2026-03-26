// Verifies: FR-WF-007 — Dashboard API endpoints
import { Router, Request, Response } from 'express';
import * as dashboardService from '../services/dashboard';
import logger from '../logger';

const router = Router();

// Verifies: FR-WF-007 — GET /api/dashboard/summary
router.get('/summary', (_req: Request, res: Response) => {
  const summary = dashboardService.getSummary();
  logger.debug({ msg: 'Dashboard summary requested' });
  res.json(summary);
});

// Verifies: FR-WF-007 — GET /api/dashboard/activity
router.get('/activity', (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const activity = dashboardService.getActivity(page, limit);
  logger.debug({ msg: 'Dashboard activity requested', page, limit });
  res.json(activity);
});

// Verifies: FR-WF-007 — GET /api/dashboard/queue
router.get('/queue', (_req: Request, res: Response) => {
  const queue = dashboardService.getQueue();
  logger.debug({ msg: 'Dashboard queue requested' });
  res.json(queue);
});

export default router;
