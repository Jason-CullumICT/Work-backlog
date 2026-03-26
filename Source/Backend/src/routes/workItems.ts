// Verifies: FR-WF-002 — Work Item CRUD API endpoints
import { Router, Request, Response } from 'express';
import {
  CreateWorkItemRequest,
  UpdateWorkItemRequest,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemComplexity,
} from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { trackUpdates } from '../services/changeHistory';
import { itemsCreatedCounter } from '../metrics';
import logger from '../logger';

const router = Router();

// Verifies: FR-WF-002 — POST /api/work-items — Create a new work item
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateWorkItemRequest;

  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }

  if (!body.type || !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Valid type is required (feature, bug, issue, improvement)' });
    return;
  }

  if (!body.priority || !Object.values(WorkItemPriority).includes(body.priority)) {
    res.status(400).json({ error: 'Valid priority is required (critical, high, medium, low)' });
    return;
  }

  if (!body.source || !Object.values(WorkItemSource).includes(body.source)) {
    res.status(400).json({ error: 'Valid source is required (browser, zendesk, manual, automated)' });
    return;
  }

  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type,
    priority: body.priority,
    source: body.source,
  });

  // Verifies: FR-WF-013 — Metric: items created
  itemsCreatedCounter.inc({ source: item.source, type: item.type });
  logger.info({ msg: 'Work item created', workItemId: item.id, docId: item.docId });

  res.status(201).json(item);
});

// Verifies: FR-WF-002 — GET /api/work-items — List with pagination and filtering
router.get('/', (req: Request, res: Response) => {
  const filters = {
    status: req.query.status as WorkItemStatus | undefined,
    type: req.query.type as WorkItemType | undefined,
    priority: req.query.priority as WorkItemPriority | undefined,
    source: req.query.source as WorkItemSource | undefined,
  };

  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };

  const result = store.findAll(filters, pagination);
  res.json(result);
});

// Verifies: FR-WF-002 — GET /api/work-items/:id — Single item with full history
router.get('/:id', (req: Request, res: Response) => {
  const item = store.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Work item not found' });
    return;
  }
  res.json(item);
});

// Verifies: FR-WF-002, FR-WF-003 — PATCH /api/work-items/:id — Update with change tracking
router.patch('/:id', (req: Request, res: Response) => {
  const item = store.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Work item not found' });
    return;
  }

  const body = req.body as UpdateWorkItemRequest;
  const allowedFields = ['title', 'description', 'type', 'priority', 'complexity'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if ((body as Record<string, unknown>)[field] !== undefined) {
      updates[field] = (body as Record<string, unknown>)[field];
    }
  }

  // Validate enum fields if provided
  if (updates.type && !Object.values(WorkItemType).includes(updates.type as WorkItemType)) {
    res.status(400).json({ error: 'Invalid type value' });
    return;
  }
  if (updates.priority && !Object.values(WorkItemPriority).includes(updates.priority as WorkItemPriority)) {
    res.status(400).json({ error: 'Invalid priority value' });
    return;
  }
  if (updates.complexity && !Object.values(WorkItemComplexity).includes(updates.complexity as WorkItemComplexity)) {
    res.status(400).json({ error: 'Invalid complexity value' });
    return;
  }

  // Verifies: FR-WF-003 — Track changes before applying
  trackUpdates(item, updates, 'user', 'Manual update');

  const updated = store.updateWorkItem(item.id, updates);
  logger.info({ msg: 'Work item updated', workItemId: item.id, docId: item.docId, updates: Object.keys(updates) });

  res.json(updated);
});

// Verifies: FR-WF-002 — DELETE /api/work-items/:id — Soft delete
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = store.softDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Work item not found' });
    return;
  }

  logger.info({ msg: 'Work item soft deleted', workItemId: req.params.id });
  res.status(204).send();
});

export default router;
