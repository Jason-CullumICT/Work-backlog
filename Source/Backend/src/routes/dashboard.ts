// Verifies: FR-WF-007, FR-CB-011 — Dashboard API endpoints
import { Router, Request, Response } from 'express';
import * as dashboardService from '../services/dashboard';
import * as cycleService from '../services/cycle';
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

// Verifies: FR-CB-011 — GET /api/dashboard/active-cycles
router.get('/active-cycles', (_req: Request, res: Response) => {
  const cycles = cycleService.getActiveCycles();
  logger.debug({ msg: 'Dashboard active cycles requested', count: cycles.length });
  res.json({ data: cycles });
});

export default router;
