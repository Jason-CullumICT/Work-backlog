// Verifies: FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004 — Cycles API routes
import { Router, Request, Response } from 'express';
import {
  CreateCycleRequest,
  UpdateCycleRequest,
  CycleStatus,
  CycleFilters,
} from '../../../Shared/types/workflow';
import * as cycleService from '../services/cycle';
import logger from '../logger';

const router = Router();

// Verifies: FR-CB-001 — POST /api/cycles — Create a new cycle
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateCycleRequest;

  // Verifies: FR-CB-016 — Validate required fields
  if (!body.workItemId || !body.team || !body.branch) {
    logger.warn({ msg: 'Cycle creation failed: missing required fields', body: { workItemId: !!body.workItemId, team: !!body.team, branch: !!body.branch } });
    res.status(400).json({ error: 'workItemId, team, and branch are required' });
    return;
  }

  const cycle = cycleService.createCycle(body);
  // Verifies: FR-CB-016 — Structured logging for successful operation
  logger.info({ msg: 'Cycle created', cycleId: cycle.id, action: 'create' });

  res.status(201).json(cycle);
});

// Verifies: FR-CB-002 — PATCH /api/cycles/:id — Update cycle phase
router.patch('/:id', (req: Request, res: Response) => {
  const body = req.body as UpdateCycleRequest;

  if (!body.status || !Object.values(CycleStatus).includes(body.status)) {
    logger.warn({ msg: 'Cycle update failed: invalid status', status: body.status });
    res.status(400).json({ error: 'Valid status is required' });
    return;
  }

  const cycle = cycleService.updateCyclePhase(req.params.id, body);
  if (!cycle) {
    res.status(404).json({ error: 'Cycle not found' });
    return;
  }

  logger.info({ msg: 'Cycle updated', cycleId: cycle.id, status: cycle.status, action: 'update' });
  res.json(cycle);
});

// Verifies: FR-CB-003 — GET /api/cycles — List with pagination and filters
router.get('/', (req: Request, res: Response) => {
  const filters: CycleFilters = {
    workItemId: req.query.workItemId as string | undefined,
    status: req.query.status as CycleStatus | undefined,
  };

  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };

  const result = cycleService.listCycles(filters, pagination);
  // Verifies: FR-CB-017 — Paginated response format
  res.json(result);
});

// Verifies: FR-CB-004 — GET /api/cycles/:id — Get single cycle
router.get('/:id', (req: Request, res: Response) => {
  const cycle = cycleService.getCycleById(req.params.id);
  if (!cycle) {
    res.status(404).json({ error: 'Cycle not found' });
    return;
  }
  res.json(cycle);
});

export default router;
