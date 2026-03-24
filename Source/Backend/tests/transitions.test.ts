import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { validateTransition, TRANSITION_MAP } from '../src/services/stateMachine';
import { WorkItemStatus } from '../src/models/types';

// Helper: create a work item and return its ID
async function createItem(title = 'Test item'): Promise<string> {
  const res = await request(app)
    .post('/api/work-items')
    .send({ title, type: 'feature', priority: 'medium' });
  return res.body.id;
}

// Helper: directly set a work item's status in the DB (bypasses state machine for test setup)
async function setStatus(id: string, status: string): Promise<void> {
  const { getDb } = await import('../src/config/database');
  await getDb()('work_items').where({ id }).update({ status });
}

// Verifies: FR-WF-003 — Pipeline state machine with valid transitions
describe('State Machine (unit)', () => {
  // Verifies: FR-WF-003
  it('should define all valid transitions', () => {
    expect(TRANSITION_MAP.backlog).toContain('proposed');
    expect(TRANSITION_MAP.backlog).toContain('under_review');
    expect(TRANSITION_MAP.proposed).toContain('under_review');
    expect(TRANSITION_MAP.under_review).toContain('approved');
    expect(TRANSITION_MAP.under_review).toContain('rejected');
    expect(TRANSITION_MAP.approved).toContain('in_dev');
    expect(TRANSITION_MAP.in_dev).toContain('done');
    expect(TRANSITION_MAP.rejected).toContain('backlog');
    expect(TRANSITION_MAP.done).toEqual([]);
  });

  // Verifies: FR-WF-003
  it('should validate allowed transitions', () => {
    const result = validateTransition('backlog', 'proposed');
    expect(result.valid).toBe(true);
  });

  // Verifies: FR-WF-003
  it('should reject invalid transitions', () => {
    const result = validateTransition('backlog', 'done');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Invalid transition');
    }
  });

  // Verifies: FR-WF-003
  it('should reject transitions from terminal state (done)', () => {
    const result = validateTransition('done', 'backlog');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('none (terminal state)');
    }
  });
});

// Verifies: FR-WF-003 — POST /api/work-items/:id/transition
describe('POST /api/work-items/:id/transition', () => {
  // Verifies: FR-WF-003
  it('should transition backlog -> proposed', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'proposed' })
      .expect(200);

    expect(res.body.status).toBe('proposed');
  });

  // Verifies: FR-WF-003
  it('should transition proposed -> under_review', async () => {
    const id = await createItem();
    await setStatus(id, 'proposed');

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'under_review' })
      .expect(200);

    expect(res.body.status).toBe('under_review');
  });

  // Verifies: FR-WF-003
  it('should transition under_review -> approved', async () => {
    const id = await createItem();
    await setStatus(id, 'under_review');

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'approved' })
      .expect(200);

    expect(res.body.status).toBe('approved');
  });

  // Verifies: FR-WF-003
  it('should transition under_review -> rejected', async () => {
    const id = await createItem();
    await setStatus(id, 'under_review');

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'rejected' })
      .expect(200);

    expect(res.body.status).toBe('rejected');
  });

  // Verifies: FR-WF-003
  it('should transition approved -> in_dev', async () => {
    const id = await createItem();
    await setStatus(id, 'approved');

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'in_dev' })
      .expect(200);

    expect(res.body.status).toBe('in_dev');
  });

  // Verifies: FR-WF-003
  it('should transition in_dev -> done', async () => {
    const id = await createItem();
    await setStatus(id, 'in_dev');

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'done' })
      .expect(200);

    expect(res.body.status).toBe('done');
  });

  // Verifies: FR-WF-003
  it('should reject invalid transitions with 400', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'done' })
      .expect(400);

    expect(res.body.error).toContain('Invalid transition');
  });

  // Verifies: FR-WF-003
  it('should reject transition without target', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({})
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  // Verifies: FR-WF-003
  it('should record status change in change_history', async () => {
    const id = await createItem();

    await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'proposed', changedBy: 'test-user' })
      .expect(200);

    const historyRes = await request(app)
      .get(`/api/work-items/${id}/history`)
      .expect(200);

    const statusChange = historyRes.body.data.find(
      (h: { field: string }) => h.field === 'status'
    );
    expect(statusChange).toBeDefined();
    expect(statusChange.old_value).toBe('backlog');
    expect(statusChange.new_value).toBe('proposed');
    expect(statusChange.changed_by).toBe('test-user');
  });

  // Verifies: FR-WF-003
  it('should return 404 for non-existent item', async () => {
    await request(app)
      .post('/api/work-items/non-existent-id/transition')
      .send({ target: 'proposed' })
      .expect(404);
  });

  // Verifies: FR-WF-003 — rejected -> backlog re-open
  it('should allow rejected -> backlog re-open', async () => {
    const id = await createItem();
    await setStatus(id, 'rejected');

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'backlog' })
      .expect(200);

    expect(res.body.status).toBe('backlog');
  });

  // Verifies: FR-WF-006 — fast-track backlog -> under_review
  it('should allow fast-track from backlog to under_review', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/transition`)
      .send({ target: 'under_review', changedBy: 'fast-tracker' })
      .expect(200);

    expect(res.body.status).toBe('under_review');
  });
});

// Verifies: FR-WF-004 — Proposal attachment
describe('POST /api/work-items/:id/propose', () => {
  // Verifies: FR-WF-004
  it('should create proposal and move item to proposed', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/propose`)
      .send({
        requirements: 'Must support X, Y, Z',
        prototypeUrl: 'https://example.com/proto',
        createdBy: 'proposer',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.work_item_id).toBe(id);
    expect(res.body.requirements).toBe('Must support X, Y, Z');
    expect(res.body.prototype_url).toBe('https://example.com/proto');
    expect(res.body.created_by).toBe('proposer');

    // Verify item status changed
    const itemRes = await request(app)
      .get(`/api/work-items/${id}`)
      .expect(200);

    expect(itemRes.body.status).toBe('proposed');
  });

  // Verifies: FR-WF-004
  it('should record status change in change_history', async () => {
    const id = await createItem();

    await request(app)
      .post(`/api/work-items/${id}/propose`)
      .send({ requirements: 'Some requirements', createdBy: 'proposer' })
      .expect(201);

    const historyRes = await request(app)
      .get(`/api/work-items/${id}/history`)
      .expect(200);

    const statusChange = historyRes.body.data.find(
      (h: { field: string }) => h.field === 'status'
    );
    expect(statusChange).toBeDefined();
    expect(statusChange.old_value).toBe('backlog');
    expect(statusChange.new_value).toBe('proposed');
  });

  // Verifies: FR-WF-004
  it('should reject if item is not in backlog status', async () => {
    const id = await createItem();
    await setStatus(id, 'in_dev');

    const res = await request(app)
      .post(`/api/work-items/${id}/propose`)
      .send({ requirements: 'Some requirements' })
      .expect(400);

    expect(res.body.error).toContain('must be in "backlog"');
  });

  // Verifies: FR-WF-004
  it('should reject if requirements are missing', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/propose`)
      .send({})
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  // Verifies: FR-WF-004
  it('should return 404 for non-existent item', async () => {
    await request(app)
      .post('/api/work-items/non-existent-id/propose')
      .send({ requirements: 'Some requirements' })
      .expect(404);
  });
});

// Verifies: FR-WF-005 — Review decision gate
describe('POST /api/work-items/:id/review', () => {
  // Verifies: FR-WF-005
  it('should approve and move item to approved', async () => {
    const id = await createItem();
    await setStatus(id, 'under_review');

    const res = await request(app)
      .post(`/api/work-items/${id}/review`)
      .send({
        decision: 'approved',
        feedback: 'Looks good',
        reviewedBy: 'reviewer1',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.work_item_id).toBe(id);
    expect(res.body.decision).toBe('approved');
    expect(res.body.feedback).toBe('Looks good');
    expect(res.body.reviewed_by).toBe('reviewer1');

    // Verify item status
    const itemRes = await request(app)
      .get(`/api/work-items/${id}`)
      .expect(200);

    expect(itemRes.body.status).toBe('approved');
  });

  // Verifies: FR-WF-005
  it('should reject and move item to rejected', async () => {
    const id = await createItem();
    await setStatus(id, 'under_review');

    const res = await request(app)
      .post(`/api/work-items/${id}/review`)
      .send({
        decision: 'rejected',
        feedback: 'Needs more work',
        reviewedBy: 'reviewer2',
      })
      .expect(201);

    expect(res.body.decision).toBe('rejected');

    // Verify item status
    const itemRes = await request(app)
      .get(`/api/work-items/${id}`)
      .expect(200);

    expect(itemRes.body.status).toBe('rejected');
  });

  // Verifies: FR-WF-005
  it('should record status change in change_history', async () => {
    const id = await createItem();
    await setStatus(id, 'under_review');

    await request(app)
      .post(`/api/work-items/${id}/review`)
      .send({ decision: 'approved', reviewedBy: 'reviewer' })
      .expect(201);

    const historyRes = await request(app)
      .get(`/api/work-items/${id}/history`)
      .expect(200);

    const statusChange = historyRes.body.data.find(
      (h: { field: string }) => h.field === 'status'
    );
    expect(statusChange).toBeDefined();
    expect(statusChange.old_value).toBe('under_review');
    expect(statusChange.new_value).toBe('approved');
  });

  // Verifies: FR-WF-005
  it('should reject if item is not in under_review status', async () => {
    const id = await createItem();

    const res = await request(app)
      .post(`/api/work-items/${id}/review`)
      .send({ decision: 'approved' })
      .expect(400);

    expect(res.body.error).toContain('must be in "under_review"');
  });

  // Verifies: FR-WF-005
  it('should reject if decision is invalid', async () => {
    const id = await createItem();
    await setStatus(id, 'under_review');

    const res = await request(app)
      .post(`/api/work-items/${id}/review`)
      .send({ decision: 'maybe' })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  // Verifies: FR-WF-005
  it('should return 404 for non-existent item', async () => {
    await request(app)
      .post('/api/work-items/non-existent-id/review')
      .send({ decision: 'approved' })
      .expect(404);
  });
});
