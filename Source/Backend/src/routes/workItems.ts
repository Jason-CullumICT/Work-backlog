import { Router, Request, Response, NextFunction } from 'express';
import { workItemService, ValidationError } from '../services/workItemService';
import { changeHistoryService } from '../services/changeHistoryService';
import { workflowService } from '../services/workflowService';
import { WorkItemFilters, WorkItemStatus } from '../models/types';

const router = Router();

/**
 * POST /api/work-items — Create a new work item (always status=backlog).
 * Verifies: FR-WF-001
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await workItemService.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/work-items — List with query param filters, returns {data: T[]}.
 * Verifies: FR-WF-001
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: WorkItemFilters = {};
    if (req.query.status) filters.status = req.query.status as WorkItemFilters['status'];
    if (req.query.type) filters.type = req.query.type as WorkItemFilters['type'];
    if (req.query.queue) filters.queue = req.query.queue as string;
    if (req.query.priority) filters.priority = req.query.priority as WorkItemFilters['priority'];
    if (req.query.source) filters.source = req.query.source as WorkItemFilters['source'];

    const items = await workItemService.list(filters);
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/work-items/:id — Single item with change history.
 * Verifies: FR-WF-001
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await workItemService.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/work-items/:id — Update, records change history.
 * Verifies: FR-WF-001, FR-WF-002
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await workItemService.update(req.params.id, req.body);
    if (!item) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/work-items/:id — 204 No Content.
 * Verifies: FR-WF-001
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await workItemService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/work-items/:id/history — Change history.
 * Verifies: FR-WF-002
 */
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify item exists
    const item = await workItemService.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Work item not found' });
      return;
    }

    const history = await changeHistoryService.getByWorkItemId(req.params.id);
    res.json({ data: history });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/work-items/:id/transition — Transition work item status.
 * Verifies: FR-WF-003
 */
router.post('/:id/transition', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { target, changedBy } = req.body;
    if (!target) {
      res.status(400).json({ error: 'Target status is required' });
      return;
    }
    const item = await workflowService.transition(
      req.params.id,
      target as WorkItemStatus,
      changedBy || 'system'
    );
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/work-items/:id/propose — Create proposal and move to proposed.
 * Verifies: FR-WF-004
 */
router.post('/:id/propose', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requirements, prototypeUrl, createdBy } = req.body;
    const proposal = await workflowService.propose(
      req.params.id,
      requirements,
      prototypeUrl,
      createdBy || 'system'
    );
    res.status(201).json(proposal);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/work-items/:id/review — Submit review decision.
 * Verifies: FR-WF-005
 */
router.post('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision, feedback, reviewedBy } = req.body;
    const review = await workflowService.review(
      req.params.id,
      decision,
      feedback,
      reviewedBy || 'system'
    );
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

export default router;
