// Verifies: FR-CB-008, FR-CB-009, FR-CB-010 — Learnings API routes
import { Router, Request, Response } from 'express';
import {
  CreateLearningRequest,
  BatchCreateLearningsRequest,
  LearningFilters,
} from '../../../Shared/types/workflow';
import * as learningService from '../services/learning';
import logger from '../logger';

const router = Router();

// Verifies: FR-CB-008 — POST /api/learnings — Create a single learning
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateLearningRequest;

  // Verifies: FR-CB-016 — Validate required fields
  if (!body.cycleId || !body.team || !body.role || !body.content) {
    logger.warn({ msg: 'Learning creation failed: missing required fields', body: { cycleId: !!body.cycleId, team: !!body.team, role: !!body.role, content: !!body.content } });
    res.status(400).json({ error: 'cycleId, team, role, and content are required' });
    return;
  }

  const learning = learningService.createLearning(body);
  // Verifies: FR-CB-016 — Structured logging for successful operation
  logger.info({ msg: 'Learning created', learningId: learning.id, action: 'create' });

  res.status(201).json(learning);
});

// Verifies: FR-CB-009 — POST /api/learnings/batch — Batch create learnings
router.post('/batch', (req: Request, res: Response) => {
  const body = req.body as BatchCreateLearningsRequest;

  if (!body.learnings || !Array.isArray(body.learnings) || body.learnings.length === 0) {
    logger.warn({ msg: 'Batch learning creation failed: invalid learnings array' });
    res.status(400).json({ error: 'learnings array is required and must not be empty' });
    return;
  }

  // Validate each learning in the batch
  for (let i = 0; i < body.learnings.length; i++) {
    const item = body.learnings[i];
    if (!item.cycleId || !item.team || !item.role || !item.content) {
      logger.warn({ msg: 'Batch learning creation failed: missing fields in item', index: i });
      res.status(400).json({ error: `learnings[${i}] is missing required fields (cycleId, team, role, content)` });
      return;
    }
  }

  // Verifies: FR-CB-017 — Return {data: T[]} wrapper for list responses
  const learnings = learningService.batchCreateLearnings(body.learnings);
  logger.info({ msg: 'Learnings batch created', count: learnings.length, action: 'batch_create' });

  res.status(201).json({ data: learnings });
});

// Verifies: FR-CB-010 — GET /api/learnings — List with pagination and filters
router.get('/', (req: Request, res: Response) => {
  const filters: LearningFilters = {
    cycleId: req.query.cycleId as string | undefined,
    team: req.query.team as string | undefined,
    role: req.query.role as string | undefined,
  };

  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };

  const result = learningService.listLearnings(filters, pagination);
  // Verifies: FR-CB-017 — Paginated response format
  res.json(result);
});

export default router;
