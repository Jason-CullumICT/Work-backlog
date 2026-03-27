// Verifies: FR-CB-011 — Active Cycles dashboard endpoint tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore as resetCycleStore } from '../../src/store/cycleStore';
import { CycleStatus } from '../../../Shared/types/workflow';

beforeEach(() => {
  resetCycleStore();
});

const validCycleBody = {
  workItemId: 'wi-123',
  team: 'TheATeam',
  branch: 'cycle/run-123',
};

describe('GET /api/dashboard/active-cycles', () => {
  // Verifies: FR-CB-011 — Returns active (non-terminal) cycles
  it('returns active cycles', async () => {
    await request(app).post('/api/cycles').send(validCycleBody);
    await request(app).post('/api/cycles').send({ ...validCycleBody, team: 'TheFixer' });

    const res = await request(app).get('/api/dashboard/active-cycles');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  // Verifies: FR-CB-011 — Excludes completed cycles
  it('excludes completed cycles', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: CycleStatus.Completed });

    await request(app).post('/api/cycles').send(validCycleBody);

    const res = await request(app).get('/api/dashboard/active-cycles');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe(CycleStatus.Started);
  });

  // Verifies: FR-CB-011 — Excludes failed cycles
  it('excludes failed cycles', async () => {
    const created = await request(app).post('/api/cycles').send(validCycleBody);
    await request(app)
      .patch(`/api/cycles/${created.body.id}`)
      .send({ status: CycleStatus.Failed, error: 'Tests failed' });

    const res = await request(app).get('/api/dashboard/active-cycles');
    expect(res.body.data).toHaveLength(0);
  });

  // Verifies: FR-CB-011, FR-CB-017 — Returns {data: T[]} wrapper
  it('returns empty data array when no active cycles', async () => {
    const res = await request(app).get('/api/dashboard/active-cycles');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
