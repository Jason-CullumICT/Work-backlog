// Verifies: FR-CR-001, FR-CR-006, FR-CR-007 — Tests for retry endpoint

import express from 'express';
import request from 'supertest';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemRoute,
  PhaseStatus,
  AssessmentVerdict,
  PipelineRun,
} from '@shared/types/workflow';
import workflowRoutes from '../../src/routes/workflow';
import * as store from '../../src/store/workItemStore';

const app = express();
app.use(express.json());
app.use('/api/work-items', workflowRoutes);

function createTestItem(overrides: Record<string, unknown> = {}) {
  return store.createWorkItem({
    title: 'Test work item for retry',
    description: 'A sufficiently long and detailed description for pipeline retry tests',
    type: WorkItemType.Feature,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    ...overrides,
  });
}

function makeFailedItem(extraFields: Partial<Record<string, unknown>> = {}) {
  const item = createTestItem();
  // Transition to failed state via store update
  store.updateWorkItem(item.id, {
    status: WorkItemStatus.Failed,
    ...extraFields,
  });
  return store.findById(item.id)!;
}

describe('POST /api/work-items/:id/retry', () => {
  beforeEach(() => {
    store.resetStore();
  });

  // Verifies: FR-CR-001 — Basic retry of a failed item
  it('should retry a failed work item and transition to in-progress', async () => {
    const item = makeFailedItem();

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(WorkItemStatus.InProgress);
    expect(res.body.pipelineRun).toBeDefined();
    expect(res.body.pipelineRun.attempt).toBe(1);
    expect(res.body.pipelineRun.phases).toHaveLength(4);
  });

  // Verifies: FR-CR-001 — 404 for non-existent item
  it('should return 404 for non-existent work item', async () => {
    const res = await request(app)
      .post('/api/work-items/nonexistent-id/retry')
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });

  // Verifies: FR-CR-001 — 400 for non-failed item
  it('should return 400 when item is not in failed status', async () => {
    const item = createTestItem(); // status is backlog

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('failed');
  });

  // Verifies: FR-CR-001 — 400 for invalid resumeFrom
  it('should return 400 for invalid resumeFrom phase name', async () => {
    const item = makeFailedItem();

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({ resumeFrom: 'invalid-phase' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid resumeFrom');
  });

  // Verifies: FR-CR-001 — Valid resumeFrom accepted
  it('should accept a valid resumeFrom phase name', async () => {
    const item = makeFailedItem({
      route: WorkItemRoute.FastTrack,
      pipelineRun: {
        runId: 'prev-run',
        attempt: 1,
        phases: [
          { name: 'routing', status: PhaseStatus.Completed, startedAt: '2026-03-27T00:00:00Z', completedAt: '2026-03-27T00:01:00Z', output: {}, skipReason: null },
          { name: 'assessment', status: PhaseStatus.Completed, startedAt: '2026-03-27T00:01:00Z', completedAt: '2026-03-27T00:02:00Z', output: {}, skipReason: null },
          { name: 'dispatch', status: PhaseStatus.Failed, startedAt: '2026-03-27T00:02:00Z', completedAt: '2026-03-27T00:03:00Z', output: null, skipReason: null },
          { name: 'implementation', status: PhaseStatus.Pending, startedAt: null, completedAt: null, output: null, skipReason: null },
        ],
        resumedFrom: null,
        startedAt: '2026-03-27T00:00:00Z',
        completedAt: null,
        progressLog: [],
      } as PipelineRun,
      assessments: [{
        role: 'pod-lead',
        verdict: AssessmentVerdict.Approve,
        notes: 'ok',
        suggestedChanges: [],
        timestamp: new Date().toISOString(),
      }],
    });

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({ resumeFrom: 'dispatch' });

    expect(res.status).toBe(200);
    expect(res.body.pipelineRun.resumedFrom).toBe('dispatch');
    expect(res.body.pipelineRun.attempt).toBe(2);
    // Routing and assessment should be skipped
    expect(res.body.pipelineRun.phases[0].status).toBe(PhaseStatus.Skipped);
    expect(res.body.pipelineRun.phases[1].status).toBe(PhaseStatus.Skipped);
    // Dispatch and implementation should be pending
    expect(res.body.pipelineRun.phases[2].status).toBe(PhaseStatus.Pending);
    expect(res.body.pipelineRun.phases[3].status).toBe(PhaseStatus.Pending);
  });

  // Verifies: FR-CR-001 — Retry with reason
  it('should include retry reason in change history', async () => {
    const item = makeFailedItem();

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({ reason: 'Fixed the upstream issue' });

    expect(res.status).toBe(200);
    const retryEntry = res.body.changeHistory.find(
      (e: { field: string; reason?: string }) => e.field === 'status' && e.reason?.includes('Fixed the upstream issue')
    );
    expect(retryEntry).toBeDefined();
  });

  // Verifies: FR-CR-007 — Status transition from failed to in-progress
  it('should transition status from failed to in-progress', async () => {
    const item = makeFailedItem();

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(WorkItemStatus.InProgress);

    // Verify via store
    const stored = store.findById(item.id);
    expect(stored?.status).toBe(WorkItemStatus.InProgress);
  });

  // Verifies: FR-CR-002 — Pipeline run has correct structure
  it('should create pipelineRun with all required fields', async () => {
    const item = makeFailedItem();

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});

    const run = res.body.pipelineRun;
    expect(run.runId).toBeDefined();
    expect(typeof run.attempt).toBe('number');
    expect(Array.isArray(run.phases)).toBe(true);
    expect(run.startedAt).toBeDefined();
    expect(run.completedAt).toBeNull();
    expect(Array.isArray(run.progressLog)).toBe(true);
  });

  // Verifies: FR-CR-005 — Progress log populated
  it('should have at least one progress log entry', async () => {
    const item = makeFailedItem();

    const res = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});

    expect(res.body.pipelineRun.progressLog.length).toBeGreaterThanOrEqual(1);
  });

  // Verifies: FR-CR-001 — Multiple retries increment attempt
  it('should increment attempt on subsequent retries', async () => {
    const item = makeFailedItem();

    // First retry
    const res1 = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});
    expect(res1.body.pipelineRun.attempt).toBe(1);

    // Set back to failed for second retry
    store.updateWorkItem(item.id, { status: WorkItemStatus.Failed });

    const res2 = await request(app)
      .post(`/api/work-items/${item.id}/retry`)
      .send({});
    expect(res2.body.pipelineRun.attempt).toBe(2);
  });
});
