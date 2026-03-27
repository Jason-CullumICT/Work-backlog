// Verifies: FR-CB-005, FR-CB-006, FR-CB-007 — Features route tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore as resetFeatureStore } from '../../src/store/featureStore';
import { resetStore as resetWorkItemStore, createWorkItem } from '../../src/store/workItemStore';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';
import * as workItemStore from '../../src/store/workItemStore';

beforeEach(() => {
  resetFeatureStore();
  resetWorkItemStore();
});

const validFeatureBody = {
  workItemId: 'wi-123',
  cycleId: 'cycle-456',
  title: 'User authentication',
  description: 'Implemented JWT-based auth flow',
  branch: 'cycle/run-456',
  mergedAt: '2026-03-27T12:00:00.000Z',
};

describe('POST /api/features', () => {
  // Verifies: FR-CB-005 — Create a feature
  it('creates a feature with 201 status', async () => {
    const res = await request(app).post('/api/features').send(validFeatureBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.workItemId).toBe('wi-123');
    expect(res.body.cycleId).toBe('cycle-456');
    expect(res.body.title).toBe('User authentication');
    expect(res.body.description).toBe('Implemented JWT-based auth flow');
    expect(res.body.branch).toBe('cycle/run-456');
    expect(res.body.mergedAt).toBe('2026-03-27T12:00:00.000Z');
    expect(res.body.createdAt).toBeDefined();
  });

  // Verifies: FR-CB-005 — mergedAt is optional
  it('creates a feature without mergedAt', async () => {
    const { mergedAt, ...body } = validFeatureBody;
    const res = await request(app).post('/api/features').send(body);
    expect(res.status).toBe(201);
    expect(res.body.mergedAt).toBeUndefined();
  });

  // Verifies: FR-CB-005 — Transitions WorkItem to completed
  it('transitions in-progress WorkItem to completed', async () => {
    const wi = createWorkItem({
      title: 'Test Feature',
      description: 'A test feature description',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });
    // Set to in-progress
    workItemStore.updateWorkItem(wi.id, { status: WorkItemStatus.InProgress });

    const res = await request(app).post('/api/features').send({
      ...validFeatureBody,
      workItemId: wi.id,
    });
    expect(res.status).toBe(201);

    const updated = workItemStore.findById(wi.id);
    expect(updated?.status).toBe(WorkItemStatus.Completed);
  });

  // Verifies: FR-CB-016 — Validation for missing fields
  it('returns 400 if workItemId is missing', async () => {
    const { workItemId, ...body } = validFeatureBody;
    const res = await request(app).post('/api/features').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 400 if cycleId is missing', async () => {
    const { cycleId, ...body } = validFeatureBody;
    const res = await request(app).post('/api/features').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 if title is missing', async () => {
    const { title, ...body } = validFeatureBody;
    const res = await request(app).post('/api/features').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 if description is missing', async () => {
    const { description, ...body } = validFeatureBody;
    const res = await request(app).post('/api/features').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 if branch is missing', async () => {
    const { branch, ...body } = validFeatureBody;
    const res = await request(app).post('/api/features').send(body);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/features', () => {
  // Verifies: FR-CB-006 — List features with pagination
  it('returns paginated list', async () => {
    await request(app).post('/api/features').send(validFeatureBody);
    await request(app).post('/api/features').send({ ...validFeatureBody, title: 'Second feature' });

    const res = await request(app).get('/api/features');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.totalPages).toBe(1);
  });

  // Verifies: FR-CB-006 — Pagination
  it('paginates correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/features').send({ ...validFeatureBody, title: `Feature ${i}` });
    }
    const res = await request(app).get('/api/features?page=2&limit=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.page).toBe(2);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.total).toBe(5);
  });

  it('returns empty data when no features exist', async () => {
    const res = await request(app).get('/api/features');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/features/:id', () => {
  // Verifies: FR-CB-007 — Get single feature
  it('returns a feature by id', async () => {
    const created = await request(app).post('/api/features').send(validFeatureBody);
    const res = await request(app).get(`/api/features/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe('User authentication');
  });

  it('returns 404 for non-existent feature', async () => {
    const res = await request(app).get('/api/features/non-existent');
    expect(res.status).toBe(404);
  });
});
