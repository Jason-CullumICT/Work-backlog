import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Verifies: FR-WF-001 — Work Item CRUD with enforced backlog creation
describe('Work Items CRUD', () => {
  // Verifies: FR-WF-001 — POST creates item with status=backlog
  describe('POST /api/work-items', () => {
    it('should create a work item with status=backlog', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .send({ title: 'Test item', description: 'A test', type: 'feature', priority: 'high' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test item');
      expect(res.body.status).toBe('backlog');
      expect(res.body.type).toBe('feature');
      expect(res.body.priority).toBe('high');
      expect(res.body.source).toBe('browser');
    });

    // Verifies: FR-WF-001 — enforced backlog creation even if status is provided
    it('should enforce status=backlog even if status is provided in body', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .send({ title: 'Test', status: 'approved' })
        .expect(201);

      expect(res.body.status).toBe('backlog');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .send({ description: 'no title' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if title is empty string', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .send({ title: '  ' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .send({ title: 'Test', type: 'invalid' })
        .expect(400);

      expect(res.body.error).toContain('Invalid type');
    });

    it('should set default values for optional fields', async () => {
      const res = await request(app)
        .post('/api/work-items')
        .send({ title: 'Minimal item' })
        .expect(201);

      expect(res.body.type).toBe('task');
      expect(res.body.priority).toBe('medium');
      expect(res.body.source).toBe('browser');
      expect(res.body.queue).toBeNull();
    });
  });

  // Verifies: FR-WF-001 — GET returns filtered list as {data: T[]}
  describe('GET /api/work-items', () => {
    it('should return empty data array when no items', async () => {
      const res = await request(app)
        .get('/api/work-items')
        .expect(200);

      expect(res.body).toEqual({ data: [] });
    });

    it('should return all items in {data: T[]} wrapper', async () => {
      await request(app).post('/api/work-items').send({ title: 'Item 1' });
      await request(app).post('/api/work-items').send({ title: 'Item 2' });

      const res = await request(app)
        .get('/api/work-items')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    // Verifies: FR-WF-001 — list filtering
    it('should filter by status', async () => {
      await request(app).post('/api/work-items').send({ title: 'Item 1' });

      const res = await request(app)
        .get('/api/work-items?status=backlog')
        .expect(200);

      expect(res.body.data).toHaveLength(1);

      const res2 = await request(app)
        .get('/api/work-items?status=approved')
        .expect(200);

      expect(res2.body.data).toHaveLength(0);
    });

    it('should filter by type', async () => {
      await request(app).post('/api/work-items').send({ title: 'Bug', type: 'bug' });
      await request(app).post('/api/work-items').send({ title: 'Feature', type: 'feature' });

      const res = await request(app)
        .get('/api/work-items?type=bug')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('bug');
    });

    it('should filter by priority', async () => {
      await request(app).post('/api/work-items').send({ title: 'High', priority: 'high' });
      await request(app).post('/api/work-items').send({ title: 'Low', priority: 'low' });

      const res = await request(app)
        .get('/api/work-items?priority=high')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].priority).toBe('high');
    });

    it('should filter by queue', async () => {
      await request(app).post('/api/work-items').send({ title: 'Q1', queue: 'team-a' });
      await request(app).post('/api/work-items').send({ title: 'Q2', queue: 'team-b' });

      const res = await request(app)
        .get('/api/work-items?queue=team-a')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].queue).toBe('team-a');
    });

    it('should filter by source', async () => {
      await request(app).post('/api/work-items').send({ title: 'ZD', source: 'zendesk' });
      await request(app).post('/api/work-items').send({ title: 'Browser', source: 'browser' });

      const res = await request(app)
        .get('/api/work-items?source=zendesk')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].source).toBe('zendesk');
    });
  });

  // Verifies: FR-WF-001 — GET /:id returns item with history
  describe('GET /api/work-items/:id', () => {
    it('should return item with changeHistory', async () => {
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'Item' });

      const res = await request(app)
        .get(`/api/work-items/${created.body.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.changeHistory).toBeDefined();
      expect(Array.isArray(res.body.changeHistory)).toBe(true);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .get('/api/work-items/non-existent-id')
        .expect(404);

      expect(res.body.error).toBeDefined();
    });
  });

  // Verifies: FR-WF-001, FR-WF-002 — PATCH updates fields and records change history
  describe('PATCH /api/work-items/:id', () => {
    it('should update fields and return updated item', async () => {
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'Original' });

      const res = await request(app)
        .patch(`/api/work-items/${created.body.id}`)
        .send({ title: 'Updated', priority: 'critical', changed_by: 'test-user' })
        .expect(200);

      expect(res.body.title).toBe('Updated');
      expect(res.body.priority).toBe('critical');
    });

    // Verifies: FR-WF-002 — change history auto-recording
    it('should record change history for each changed field', async () => {
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'Original', priority: 'low' });

      await request(app)
        .patch(`/api/work-items/${created.body.id}`)
        .send({ title: 'New Title', priority: 'high', changed_by: 'tester' });

      const historyRes = await request(app)
        .get(`/api/work-items/${created.body.id}/history`)
        .expect(200);

      expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2);

      const fields = historyRes.body.data.map((h: { field: string }) => h.field);
      expect(fields).toContain('title');
      expect(fields).toContain('priority');

      const titleChange = historyRes.body.data.find(
        (h: { field: string }) => h.field === 'title'
      );
      expect(titleChange.old_value).toBe('Original');
      expect(titleChange.new_value).toBe('New Title');
      expect(titleChange.changed_by).toBe('tester');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .patch('/api/work-items/non-existent-id')
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for empty title', async () => {
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'Original' });

      await request(app)
        .patch(`/api/work-items/${created.body.id}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  // Verifies: FR-WF-001 — DELETE returns 204
  describe('DELETE /api/work-items/:id', () => {
    it('should delete and return 204', async () => {
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'To Delete' });

      await request(app)
        .delete(`/api/work-items/${created.body.id}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/api/work-items/${created.body.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent item', async () => {
      await request(app)
        .delete('/api/work-items/non-existent-id')
        .expect(404);
    });
  });

  // Verifies: FR-WF-002 — GET /:id/history returns {data: ChangeEntry[]}
  describe('GET /api/work-items/:id/history', () => {
    it('should return change history as {data: ChangeEntry[]}', async () => {
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'Item' });

      // Make some changes
      await request(app)
        .patch(`/api/work-items/${created.body.id}`)
        .send({ title: 'Changed', changed_by: 'user1' });

      const res = await request(app)
        .get(`/api/work-items/${created.body.id}/history`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const entry = res.body.data[0];
      expect(entry.field).toBe('title');
      expect(entry.old_value).toBe('Item');
      expect(entry.new_value).toBe('Changed');
      expect(entry.changed_by).toBe('user1');
      expect(entry.changed_at).toBeDefined();
    });

    it('should return 404 for non-existent item', async () => {
      await request(app)
        .get('/api/work-items/non-existent-id/history')
        .expect(404);
    });
  });
});

// Verifies: FR-WF-015 — Observability middleware
describe('Observability', () => {
  it('GET /metrics should return Prometheus-compatible metrics', async () => {
    const res = await request(app)
      .get('/metrics')
      .expect(200);

    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('GET /health should return ok', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
  });
});
