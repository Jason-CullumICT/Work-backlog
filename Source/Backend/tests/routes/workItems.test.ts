// Verifies: FR-WF-002, FR-WF-003 — Work Items CRUD route tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore } from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemStatus,
} from '../../../Shared/types/workflow';

beforeEach(() => {
  resetStore();
});

const validBody = {
  title: 'Test feature',
  description: 'A test feature description',
  type: WorkItemType.Feature,
  priority: WorkItemPriority.Medium,
  source: WorkItemSource.Browser,
};

describe('POST /api/work-items', () => {
  // Verifies: FR-WF-002 — Create work item
  it('creates a work item with status backlog', async () => {
    const res = await request(app).post('/api/work-items').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(WorkItemStatus.Backlog);
    expect(res.body.docId).toBe('WI-001');
    expect(res.body.title).toBe('Test feature');
  });

  it('returns 400 if title is missing', async () => {
    const res = await request(app).post('/api/work-items').send({ ...validBody, title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(app).post('/api/work-items').send({ ...validBody, type: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/work-items', () => {
  // Verifies: FR-WF-002 — List work items with pagination
  it('returns paginated list', async () => {
    await request(app).post('/api/work-items').send(validBody);
    await request(app).post('/api/work-items').send(validBody);

    const res = await request(app).get('/api/work-items');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
  });

  it('filters by type', async () => {
    await request(app).post('/api/work-items').send(validBody);
    await request(app).post('/api/work-items').send({ ...validBody, type: WorkItemType.Bug });

    const res = await request(app).get('/api/work-items?type=bug');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe(WorkItemType.Bug);
  });

  it('paginates correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/work-items').send(validBody);
    }
    const res = await request(app).get('/api/work-items?page=1&limit=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.totalPages).toBe(3);
  });
});

describe('GET /api/work-items/:id', () => {
  // Verifies: FR-WF-002 — Get single work item
  it('returns a work item with change history', async () => {
    const created = await request(app).post('/api/work-items').send(validBody);
    const res = await request(app).get(`/api/work-items/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.changeHistory).toHaveLength(1);
  });

  it('returns 404 for non-existent item', async () => {
    const res = await request(app).get('/api/work-items/non-existent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/work-items/:id', () => {
  // Verifies: FR-WF-002, FR-WF-003 — Update with change tracking
  it('updates fields and tracks changes', async () => {
    const created = await request(app).post('/api/work-items').send(validBody);
    const res = await request(app)
      .patch(`/api/work-items/${created.body.id}`)
      .send({ title: 'Updated title', priority: WorkItemPriority.High });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.priority).toBe(WorkItemPriority.High);
    // 1 creation entry + 2 update entries
    expect(res.body.changeHistory.length).toBeGreaterThanOrEqual(3);
  });

  it('returns 400 for invalid type value', async () => {
    const created = await request(app).post('/api/work-items').send(validBody);
    const res = await request(app)
      .patch(`/api/work-items/${created.body.id}`)
      .send({ type: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent item', async () => {
    const res = await request(app).patch('/api/work-items/fake').send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/work-items/:id', () => {
  // Verifies: FR-WF-002 — Soft delete
  it('soft deletes and returns 204', async () => {
    const created = await request(app).post('/api/work-items').send(validBody);
    const res = await request(app).delete(`/api/work-items/${created.body.id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/work-items/${created.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for non-existent item', async () => {
    const res = await request(app).delete('/api/work-items/fake');
    expect(res.status).toBe(404);
  });
});
