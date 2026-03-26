// Verifies: FR-WF-007 — Dashboard route tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore } from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';

beforeEach(() => {
  resetStore();
});

const validBody = {
  title: 'Test',
  description: 'Desc',
  type: WorkItemType.Feature,
  priority: WorkItemPriority.Medium,
  source: WorkItemSource.Browser,
};

describe('GET /api/dashboard/summary', () => {
  // Verifies: FR-WF-007 — Summary endpoint
  it('returns status, team, and priority counts', async () => {
    await request(app).post('/api/work-items').send(validBody);
    await request(app).post('/api/work-items').send({ ...validBody, priority: WorkItemPriority.High });

    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.statusCounts).toBeDefined();
    expect(res.body.teamCounts).toBeDefined();
    expect(res.body.priorityCounts).toBeDefined();
    expect(res.body.statusCounts.backlog).toBe(2);
  });
});

describe('GET /api/dashboard/activity', () => {
  // Verifies: FR-WF-007 — Activity endpoint
  it('returns recent change history', async () => {
    await request(app).post('/api/work-items').send(validBody);

    const res = await request(app).get('/api/dashboard/activity');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].workItemDocId).toBeDefined();
  });

  it('supports pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/work-items').send(validBody);
    }
    const res = await request(app).get('/api/dashboard/activity?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/dashboard/queue', () => {
  // Verifies: FR-WF-007 — Queue endpoint
  it('returns items grouped by status', async () => {
    await request(app).post('/api/work-items').send(validBody);

    const res = await request(app).get('/api/dashboard/queue');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    const backlogGroup = res.body.data.find((g: { status: string }) => g.status === 'backlog');
    expect(backlogGroup.count).toBe(1);
  });
});
