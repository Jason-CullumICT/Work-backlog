import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { getDb } from '../src/config/database';

// Verifies: FR-WF-008, FR-WF-009 — Dashboard summary and board APIs
describe('Dashboard API', () => {
  // Verifies: FR-WF-008
  describe('GET /api/dashboard/summary', () => {
    // Verifies: FR-WF-008
    it('should return counts per status with zero totals when empty', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.statusCounts).toBeDefined();
      expect(res.body.data.statusCounts.backlog).toBe(0);
      expect(res.body.data.statusCounts.proposed).toBe(0);
      expect(res.body.data.statusCounts.done).toBe(0);
      expect(res.body.data.totalItems).toBe(0);
      expect(res.body.data.throughput).toBe(0);
    });

    // Verifies: FR-WF-008
    it('should return correct counts per status', async () => {
      // Create items (all start as backlog)
      await request(app).post('/api/work-items').send({ title: 'Item 1' });
      await request(app).post('/api/work-items').send({ title: 'Item 2' });
      await request(app).post('/api/work-items').send({ title: 'Item 3' });

      const res = await request(app)
        .get('/api/dashboard/summary')
        .expect(200);

      expect(res.body.data.statusCounts.backlog).toBe(3);
      expect(res.body.data.totalItems).toBe(3);
      expect(res.body.data.throughput).toBe(0);
    });

    // Verifies: FR-WF-008
    it('should include throughput count for done items', async () => {
      // Create items and manually set one to done
      const created = await request(app)
        .post('/api/work-items')
        .send({ title: 'Done item' });
      await request(app).post('/api/work-items').send({ title: 'Backlog item' });

      // Directly update status to 'done' in DB for testing
      const db = getDb();
      await db('work_items').where({ id: created.body.id }).update({ status: 'done' });

      const res = await request(app)
        .get('/api/dashboard/summary')
        .expect(200);

      expect(res.body.data.statusCounts.done).toBe(1);
      expect(res.body.data.statusCounts.backlog).toBe(1);
      expect(res.body.data.totalItems).toBe(2);
      expect(res.body.data.throughput).toBe(1);
    });
  });

  // Verifies: FR-WF-009
  describe('GET /api/dashboard/board', () => {
    // Verifies: FR-WF-009
    it('should return columns grouped by status', async () => {
      const res = await request(app)
        .get('/api/dashboard/board')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.columns).toBeDefined();
      expect(Array.isArray(res.body.data.columns)).toBe(true);

      const statuses = res.body.data.columns.map((c: { status: string }) => c.status);
      expect(statuses).toContain('backlog');
      expect(statuses).toContain('proposed');
      expect(statuses).toContain('under_review');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('in_dev');
      expect(statuses).toContain('done');
    });

    // Verifies: FR-WF-009
    it('should contain correct items in each column', async () => {
      // Create items
      const item1 = await request(app)
        .post('/api/work-items')
        .send({ title: 'Backlog item' });
      const item2 = await request(app)
        .post('/api/work-items')
        .send({ title: 'Done item' });

      // Move item2 to done status directly
      const db = getDb();
      await db('work_items').where({ id: item2.body.id }).update({ status: 'done' });

      const res = await request(app)
        .get('/api/dashboard/board')
        .expect(200);

      const backlogColumn = res.body.data.columns.find(
        (c: { status: string }) => c.status === 'backlog'
      );
      const doneColumn = res.body.data.columns.find(
        (c: { status: string }) => c.status === 'done'
      );

      expect(backlogColumn.items).toHaveLength(1);
      expect(backlogColumn.items[0].id).toBe(item1.body.id);
      expect(backlogColumn.items[0].title).toBe('Backlog item');

      expect(doneColumn.items).toHaveLength(1);
      expect(doneColumn.items[0].id).toBe(item2.body.id);
      expect(doneColumn.items[0].title).toBe('Done item');
    });

    it('should return empty arrays for statuses with no items', async () => {
      const res = await request(app)
        .get('/api/dashboard/board')
        .expect(200);

      for (const col of res.body.data.columns) {
        expect(Array.isArray(col.items)).toBe(true);
        expect(col.items).toHaveLength(0);
      }
    });
  });
});
