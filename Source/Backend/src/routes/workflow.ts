// Verifies: FR-WF-006 — Workflow action endpoints (route/assess/approve/reject/dispatch)

import { Router, Request, Response } from 'express';
import {
  WorkItemStatus,
  WorkItemRoute,
  RouteWorkItemRequest,
  ApproveWorkItemRequest,
  RejectWorkItemRequest,
  DispatchWorkItemRequest,
  VALID_STATUS_TRANSITIONS,
} from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { routeWorkItem } from '../services/router';
import { assessWorkItem } from '../services/assessment';
import { assignTeam } from '../services/router';
import { buildChangeEntry } from '../models/WorkItem';
import { itemsDispatchedCounter } from '../metrics';
import logger from '../logger';

const router = Router();

// Verifies: FR-WF-006 — Helper: validate status transition
function isValidTransition(from: WorkItemStatus, to: WorkItemStatus): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// Verifies: FR-WF-006 — POST /api/work-items/:id/route
router.post('/:id/route', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as RouteWorkItemRequest;

    const item = store.findById(id);
    if (!item) {
      res.status(404).json({ error: `Work item ${id} not found` });
      return;
    }

    if (item.status !== WorkItemStatus.Backlog) {
      res.status(400).json({
        error: `Cannot route work item in status '${item.status}'. Must be in 'backlog' status.`,
      });
      return;
    }

    const updated = routeWorkItem(id, body?.overrideRoute);
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Route action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });
  }
});

// Verifies: FR-WF-006 — POST /api/work-items/:id/assess
router.post('/:id/assess', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = store.findById(id);
    if (!item) {
      res.status(404).json({ error: `Work item ${id} not found` });
      return;
    }

    if (item.status !== WorkItemStatus.Proposed && item.status !== WorkItemStatus.Reviewing) {
      res.status(400).json({
        error: `Cannot assess work item in status '${item.status}'. Must be in 'proposed' or 'reviewing' status.`,
      });
      return;
    }

    const updated = assessWorkItem(id);
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Assess action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });
  }
});

// Verifies: FR-WF-006 — POST /api/work-items/:id/approve (manual approve override)
router.post('/:id/approve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as ApproveWorkItemRequest;

    const item = store.findById(id);
    if (!item) {
      res.status(404).json({ error: `Work item ${id} not found` });
      return;
    }

    // Verifies: FR-WF-006 — Enforce valid status transitions
    if (!isValidTransition(item.status, WorkItemStatus.Approved)) {
      res.status(400).json({
        error: `Cannot approve work item in status '${item.status}'. Valid source statuses: proposed, reviewing, routing.`,
      });
      return;
    }

    const statusEntry = buildChangeEntry(
      'status', item.status, WorkItemStatus.Approved, 'manual-override',
      body?.reason || 'Manually approved',
    );
    item.changeHistory.push(statusEntry);

    const updated = store.updateWorkItem(id, {
      status: WorkItemStatus.Approved,
      changeHistory: item.changeHistory,
    });

    if (!updated) {
      res.status(500).json({ error: 'Failed to update work item' });
      return;
    }

    logger.info({
      msg: 'Work item manually approved',
      workItemId: id,
      docId: updated.docId,
      reason: body?.reason,
    });

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Approve action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });
  }
});

// Verifies: FR-WF-006 — POST /api/work-items/:id/reject (reject with feedback)
router.post('/:id/reject', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as RejectWorkItemRequest;

    if (!body?.reason) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const item = store.findById(id);
    if (!item) {
      res.status(404).json({ error: `Work item ${id} not found` });
      return;
    }

    // Verifies: FR-WF-006 — Enforce valid status transitions
    if (!isValidTransition(item.status, WorkItemStatus.Rejected)) {
      res.status(400).json({
        error: `Cannot reject work item in status '${item.status}'. Valid source statuses: proposed, reviewing.`,
      });
      return;
    }

    const statusEntry = buildChangeEntry(
      'status', item.status, WorkItemStatus.Rejected, 'manual-override',
      body.reason,
    );
    item.changeHistory.push(statusEntry);

    const updated = store.updateWorkItem(id, {
      status: WorkItemStatus.Rejected,
      changeHistory: item.changeHistory,
    });

    if (!updated) {
      res.status(500).json({ error: 'Failed to update work item' });
      return;
    }

    logger.info({
      msg: 'Work item rejected',
      workItemId: id,
      docId: updated.docId,
      reason: body.reason,
    });

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Reject action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });
  }
});

// Verifies: FR-WF-006 — POST /api/work-items/:id/dispatch (dispatch approved → in-progress)
router.post('/:id/dispatch', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as DispatchWorkItemRequest;

    const item = store.findById(id);
    if (!item) {
      res.status(404).json({ error: `Work item ${id} not found` });
      return;
    }

    if (item.status !== WorkItemStatus.Approved) {
      res.status(400).json({
        error: `Cannot dispatch work item in status '${item.status}'. Must be in 'approved' status.`,
      });
      return;
    }

    // Verifies: FR-WF-006 — Team assignment: use body team or auto-assign
    const team = body?.team || assignTeam(item);

    // Validate team name
    if (team !== 'TheATeam' && team !== 'TheFixer') {
      res.status(400).json({
        error: `Invalid team '${team}'. Must be 'TheATeam' or 'TheFixer'.`,
      });
      return;
    }

    const statusEntry = buildChangeEntry(
      'status', item.status, WorkItemStatus.InProgress, 'dispatcher',
      `Dispatched to ${team}`,
    );
    const teamEntry = buildChangeEntry(
      'assignedTeam', item.assignedTeam, team, 'dispatcher',
      `Assigned to ${team} for implementation`,
    );
    item.changeHistory.push(statusEntry);
    item.changeHistory.push(teamEntry);

    const updated = store.updateWorkItem(id, {
      status: WorkItemStatus.InProgress,
      assignedTeam: team,
      changeHistory: item.changeHistory,
    });

    if (!updated) {
      res.status(500).json({ error: 'Failed to update work item' });
      return;
    }

    // Verifies: FR-WF-013 — Prometheus metric
    itemsDispatchedCounter.inc({ team });

    logger.info({
      msg: 'Work item dispatched',
      workItemId: id,
      docId: updated.docId,
      team,
    });

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ msg: 'Dispatch action failed', error: message, workItemId: req.params.id });
    res.status(500).json({ error: message });
  }
});

export default router;
