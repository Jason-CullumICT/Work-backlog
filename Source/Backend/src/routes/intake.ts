// Verifies: FR-WF-008 — Intake webhook endpoints
import { Router, Request, Response } from 'express';
import { WorkItemSource, WorkItemType, WorkItemPriority } from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { itemsCreatedCounter } from '../metrics';
import logger from '../logger';

const router = Router();

// Verifies: FR-WF-008 — Validate optional enum fields from webhook payloads
function validateOptionalType(type: unknown): WorkItemType | undefined {
  if (type && !Object.values(WorkItemType).includes(type as WorkItemType)) {
    return undefined;
  }
  return type as WorkItemType | undefined;
}

function validateOptionalPriority(priority: unknown): WorkItemPriority | undefined {
  if (priority && !Object.values(WorkItemPriority).includes(priority as WorkItemPriority)) {
    return undefined;
  }
  return priority as WorkItemPriority | undefined;
}

// Verifies: FR-WF-008 — POST /api/intake/zendesk — Zendesk webhook receiver
router.post('/zendesk', (req: Request, res: Response) => {
  const body = req.body;

  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }

  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type value' });
    return;
  }

  if (body.priority && !Object.values(WorkItemPriority).includes(body.priority)) {
    res.status(400).json({ error: 'Invalid priority value' });
    return;
  }

  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: validateOptionalType(body.type) || WorkItemType.Bug,
    priority: validateOptionalPriority(body.priority) || WorkItemPriority.Medium,
    source: WorkItemSource.Zendesk,
  });

  itemsCreatedCounter.inc({ source: WorkItemSource.Zendesk, type: item.type });
  logger.info({ msg: 'Work item created via Zendesk webhook', workItemId: item.id, docId: item.docId, source: 'zendesk' });

  res.status(201).json(item);
});

// Verifies: FR-WF-008 — POST /api/intake/automated — System event receiver
router.post('/automated', (req: Request, res: Response) => {
  const body = req.body;

  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }

  if (body.type && !Object.values(WorkItemType).includes(body.type)) {
    res.status(400).json({ error: 'Invalid type value' });
    return;
  }

  if (body.priority && !Object.values(WorkItemPriority).includes(body.priority)) {
    res.status(400).json({ error: 'Invalid priority value' });
    return;
  }

  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: validateOptionalType(body.type) || WorkItemType.Issue,
    priority: validateOptionalPriority(body.priority) || WorkItemPriority.Medium,
    source: WorkItemSource.Automated,
  });

  itemsCreatedCounter.inc({ source: WorkItemSource.Automated, type: item.type });
  logger.info({ msg: 'Work item created via automated intake', workItemId: item.id, docId: item.docId, source: 'automated' });

  res.status(201).json(item);
});

export default router;
