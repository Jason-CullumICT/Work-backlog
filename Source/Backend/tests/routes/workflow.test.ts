// Verifies: FR-WF-006 — Tests for workflow action endpoints

import express from 'express';
import request from 'supertest';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemComplexity,
  WorkItemRoute,
} from '@shared/types/workflow';
import workflowRoutes from '../../src/routes/workflow';
import * as store from '../../src/store/workItemStore';

const app = express();
app.use(express.json());
app.use('/api/work-items', workflowRoutes);

function createTestItem(overrides: Record<string, unknown> = {}) {
  return store.createWorkItem({
    title: 'Test work item for routing',
    description: 'A sufficiently long and detailed description for all pod assessments to pass',
    type: WorkItemType.Feature,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    ...overrides,
  });
}

describe('Workflow Action Endpoints', () => {
  beforeEach(() => {
    store.resetStore();
  });

  describe('POST /api/work-items/:id/route', () => {
    // Verifies: FR-WF-006 — Route a backlog item
    it('should route a backlog item to proposed (full-review)', async () => {
      const item = createTestItem();
      const res = await request(app)
        .post(`/api/work-items/${item.id}/route`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Proposed);
      expect(res.body.route).toBe(WorkItemRoute.FullReview);
    });

    // Verifies: FR-WF-006 — Route with override
    it('should route with fast-track override', async () => {
      const item = createTestItem();
      const res = await request(app)
        .post(`/api/work-items/${item.id}/route`)
        .send({ overrideRoute: 'fast-track' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Approved);
      expect(res.body.route).toBe(WorkItemRoute.FastTrack);
    });

    // Verifies: FR-WF-006 — Fast-track bug
    it('should fast-track a trivial bug', async () => {
      const item = createTestItem({
        type: WorkItemType.Bug,
        title: 'Fix typo in header',
        description: 'Simple one-line fix for a typo in the main header component',
      });
      store.updateWorkItem(item.id, { complexity: WorkItemComplexity.Trivial });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/route`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Approved);
      expect(res.body.route).toBe(WorkItemRoute.FastTrack);
    });

    // Verifies: FR-WF-006 — 404 for non-existent item
    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/route')
        .send({});

      expect(res.status).toBe(404);
    });

    // Verifies: FR-WF-006 — 400 for invalid status
    it('should return 400 when routing an already-routed item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/route`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot route');
    });
  });

  describe('POST /api/work-items/:id/assess', () => {
    // Verifies: FR-WF-006 — Assess a proposed item
    it('should assess a proposed item successfully', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, {
        status: WorkItemStatus.Proposed,
        complexity: WorkItemComplexity.Medium,
      });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/assess`)
        .send({});

      expect(res.status).toBe(200);
      expect([WorkItemStatus.Approved, WorkItemStatus.Rejected]).toContain(res.body.status);
      expect(res.body.assessments.length).toBe(4);
    });

    // Verifies: FR-WF-006 — 400 for wrong status
    it('should return 400 when assessing a backlog item', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/assess`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot assess');
    });

    // Verifies: FR-WF-006 — 404 for non-existent
    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/assess')
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/work-items/:id/approve', () => {
    // Verifies: FR-WF-006 — Manual approve override
    it('should manually approve a proposed item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Proposed });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/approve`)
        .send({ reason: 'Approved by manager' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Approved);
    });

    // Verifies: FR-WF-006 — Approve from reviewing status
    it('should approve a reviewing item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Reviewing });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/approve`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Approved);
    });

    // Verifies: FR-WF-006 — 400 for invalid transition
    it('should return 400 when approving a backlog item', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/approve`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/approve')
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/work-items/:id/reject', () => {
    // Verifies: FR-WF-006 — Reject with feedback
    it('should reject a proposed item with reason', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Proposed });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/reject`)
        .send({ reason: 'Missing acceptance criteria' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Rejected);
    });

    // Verifies: FR-WF-006 — Reason is required
    it('should return 400 when no reason provided', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Proposed });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/reject`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('reason');
    });

    // Verifies: FR-WF-006 — 400 for invalid transition
    it('should return 400 when rejecting an approved item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/reject`)
        .send({ reason: 'Too late' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/reject')
        .send({ reason: 'Does not exist' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/work-items/:id/dispatch', () => {
    // Verifies: FR-WF-006 — Dispatch to team
    it('should dispatch an approved item to TheATeam', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dispatch`)
        .send({ team: 'TheATeam' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.InProgress);
      expect(res.body.assignedTeam).toBe('TheATeam');
    });

    // Verifies: FR-WF-006 — Dispatch to TheFixer
    it('should dispatch an approved item to TheFixer', async () => {
      const item = createTestItem({ type: WorkItemType.Bug });
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dispatch`)
        .send({ team: 'TheFixer' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.InProgress);
      expect(res.body.assignedTeam).toBe('TheFixer');
    });

    // Verifies: FR-WF-006 — Auto-assign team when not specified
    it('should auto-assign team for a feature', async () => {
      const item = createTestItem({ type: WorkItemType.Feature });
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dispatch`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.assignedTeam).toBe('TheATeam');
    });

    // Verifies: FR-WF-006 — Invalid team name
    it('should return 400 for invalid team name', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dispatch`)
        .send({ team: 'InvalidTeam' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid team');
    });

    // Verifies: FR-WF-006 — 400 for non-approved status
    it('should return 400 when dispatching a non-approved item', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dispatch`)
        .send({ team: 'TheATeam' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot dispatch');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/dispatch')
        .send({ team: 'TheATeam' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/work-items/:id/complete', () => {
    // Verifies: FR-WF-006 — Complete an in-progress item
    it('should complete an in-progress item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.InProgress, assignedTeam: 'TheATeam' });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/complete`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Completed);
    });

    // Verifies: FR-WF-006 — 400 for non in-progress status
    it('should return 400 when completing a non in-progress item', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/complete`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot complete');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/complete')
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/work-items/:id/fail', () => {
    // Verifies: FR-WF-006 — Fail an in-progress item
    it('should fail an in-progress item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.InProgress, assignedTeam: 'TheFixer' });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/fail`)
        .send({ reason: 'Tests failed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Failed);
    });

    // Verifies: FR-WF-006 — Fail without explicit reason uses default
    it('should fail with default reason when none provided', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.InProgress });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/fail`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Failed);
    });

    // Verifies: FR-WF-006 — 400 for non in-progress status
    it('should return 400 when failing a non in-progress item', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/fail`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot fail');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/fail')
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/work-items/:id/requeue', () => {
    // Verifies: FR-WF-006 — Requeue a rejected item back to backlog
    it('should requeue a rejected item to backlog', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Rejected });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/requeue`)
        .send({ reason: 'Updated requirements' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Backlog);
    });

    // Verifies: FR-WF-006 — Requeue a failed item back to backlog
    it('should requeue a failed item to backlog', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Failed });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/requeue`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.Backlog);
    });

    // Verifies: FR-WF-006 — Requeue clears route and assignedTeam
    it('should clear route and assignedTeam on requeue', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, {
        status: WorkItemStatus.Failed,
        route: WorkItemRoute.FastTrack,
        assignedTeam: 'TheFixer',
      });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/requeue`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.route).toBeUndefined();
      expect(res.body.assignedTeam).toBeUndefined();
    });

    // Verifies: FR-WF-006 — 400 for invalid status
    it('should return 400 when requeuing an in-progress item', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.InProgress });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/requeue`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot requeue');
    });

    // Verifies: FR-WF-006 — 400 for backlog item (already in backlog)
    it('should return 400 when requeuing a backlog item', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/requeue`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .post('/api/work-items/non-existent/requeue')
        .send({});

      expect(res.status).toBe(404);
    });
  });
});
