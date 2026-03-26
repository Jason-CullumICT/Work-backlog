// Verifies: FR-WF-008 — Intake webhook endpoints
import { Router, Request, Response } from 'express';
import { WorkItemSource, WorkItemType, WorkItemPriority } from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { itemsCreatedCounter } from '../metrics';
import logger from '../logger';

const router = Router();

// Verifies: FR-WF-008 — POST /api/intake/zendesk — Zendesk webhook receiver
router.post('/zendesk', (req: Request, res: Response) => {
  const body = req.body;

  if (!body.title || !body.description) {
    res.status(400).json({ error: 'title and description are required' });
    return;
  }

  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Bug,
    priority: body.priority || WorkItemPriority.Medium,
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

  const item = store.createWorkItem({
    title: body.title,
    description: body.description,
    type: body.type || WorkItemType.Issue,
    priority: body.priority || WorkItemPriority.Medium,
    source: WorkItemSource.Automated,
  });

  itemsCreatedCounter.inc({ source: WorkItemSource.Automated, type: item.type });
  logger.info({ msg: 'Work item created via automated intake', workItemId: item.id, docId: item.docId, source: 'automated' });

  res.status(201).json(item);
});

export default router;
