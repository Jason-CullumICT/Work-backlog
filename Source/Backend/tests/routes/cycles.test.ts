// Verifies: FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004 — Cycles route tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore as resetCycleStore } from '../../src/store/cycleStore';
import { resetStore as resetWorkItemStore, createWorkItem } from '../../src/store/workItemStore';
import {
  CycleStatus,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';
import * as workItemStore from '../../src/store/workItemStore';

beforeEach(() => {
  resetCycleStore();
  resetWorkItemStore();
});

const validCycleBody = {
  workItemId: 'wi-123',
  team: 'TheATeam',
  branch: 'cycle/run-123',
};

describe('POST /api/cycles', () => {
  // Verifies: FR-CB-001 — Create a cycle
  it('creates a cycle with status started', async () => {
    const res = await request(app).post('/api/cycles').send(validCycleBody);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(CycleStatus.Started);
    expect(res.body.workItemId).toBe('wi-123');
    expect(res.body.team).toBe('TheATeam');
    expect(res.body.branch).toBe('cycle/run-123');
    expect(res.body.phases).toHaveLength(1);
    expect(res.body.phases[0].name).toBe(CycleStatus.Started);
  });

  // Verifies: FR-CB-001 — Transitions WorkItem to in-progress on cycle creation
  it('transitions approved WorkItem to in-progress', async () => {
    const wi = createWorkItem({
      title: 'Test Feature',
      description: 'A test feature',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });
    // Manually set to approved for test
    workItemStore.updateWorkItem(wi.id, { status: WorkItemStatus.Approved });

    const res = await request(app).post('/api/cycles').send({
      ...validCycleBody,
      workItemId: wi.id,
    });
    expect(res.status).toBe(201);

    const updated = workItemStore.findById(wi.id);
    expect(updated?.status).toBe(WorkItemStatus.InProgress);
  });

  it('returns 400 if workItemId is missing', async () => {
    const res = await request(app).post('/api/cycles').send({ team: 'TheATeam', branch: 'x' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if team is missing', async () => {
    const res = await request(app).post('/api/cycles').send({ workItemId: 'x', branch: 'x' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if branch is missing', async () => {
    const res = await request(app).post('/api/cycles').send({ workItemId: 'x', team: 'TheATeam' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/cycles/:id', () => {
  // Verifies: FR-CB-002 — Update cycle phase
  it('updates cycle status and appends phase', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    const res = await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: CycleStatus.Implementation });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(CycleStatus.Implementation);
    expect(res.body.phases).toHaveLength(2);
    expect(res.body.phases[1].name).toBe(CycleStatus.Implementation);
    // First phase should be closed
    expect(res.body.phases[0].completedAt).toBeDefined();
  });

  // Verifies: FR-CB-002 — Completing a cycle sets completedAt and result
  it('sets completedAt and result=passed on completed', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    const res = await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: CycleStatus.Completed });

    expect(res.status).toBe(200);
    expect(res.body.completedAt).toBeDefined();
    expect(res.body.result).toBe('passed');
  });

  // Verifies: FR-CB-002 — Failing a cycle sets error and result
  it('sets error and result=failed on failed', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    const res = await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: CycleStatus.Failed, error: 'Tests failed' });

    expect(res.status).toBe(200);
    expect(res.body.completedAt).toBeDefined();
    expect(res.body.result).toBe('failed');
    expect(res.body.error).toBe('Tests failed');
  });

  it('returns 404 for non-existent cycle', async () => {
    const res = await request(app)
      .patch('/api/cycles/non-existent')
      .send({ status: CycleStatus.Implementation });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    const res = await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/cycles', () => {
  // Verifies: FR-CB-003 — List cycles with pagination
  it('returns paginated list', async () => {
    await request(app).post('/api/cycles').send(validCycleBody);
    await request(app).post('/api/cycles').send({ ...validCycleBody, team: 'TheFixer' });

    const res = await request(app).get('/api/cycles');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
  });

  // Verifies: FR-CB-003 — Filter by workItemId
  it('filters by workItemId', async () => {
    await request(app).post('/api/cycles').send(validCycleBody);
    await request(app).post('/api/cycles').send({ ...validCycleBody, workItemId: 'wi-456' });

    const res = await request(app).get('/api/cycles?workItemId=wi-456');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].workItemId).toBe('wi-456');
  });

  // Verifies: FR-CB-003 — Filter by status
  it('filters by status', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: CycleStatus.Completed });

    await request(app).post('/api/cycles').send(validCycleBody);

    const res = await request(app).get(`/api/cycles?status=${CycleStatus.Started}`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe(CycleStatus.Started);
  });

  // Verifies: FR-CB-003 — Pagination
  it('paginates correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/cycles').send(validCycleBody);
    }
    const res = await request(app).get('/api/cycles?page=1&limit=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.totalPages).toBe(3);
  });
});

describe('GET /api/cycles/:id', () => {
  // Verifies: FR-CB-004 — Get single cycle
  it('returns a cycle by id', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    const res = await request(app).get(`/api/cycles/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.phases).toHaveLength(1);
  });

  it('returns 404 for non-existent cycle', async () => {
    const res = await request(app).get('/api/cycles/non-existent');
    expect(res.status).toBe(404);
  });
});
