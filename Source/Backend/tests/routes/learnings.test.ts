// Verifies: FR-CB-008, FR-CB-009, FR-CB-010 — Learnings route tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore as resetLearningStore } from '../../src/store/learningStore';

beforeEach(() => {
  resetLearningStore();
});

const validLearning = {
  cycleId: 'cycle-001',
  team: 'TheATeam',
  role: 'backend-coder',
  content: 'Discovered that the store pattern uses in-memory Maps with UUID keys',
  category: 'architecture',
};

describe('POST /api/learnings', () => {
  // Verifies: FR-CB-008 — Create a single learning
  it('creates a learning with 201 status', async () => {
    const res = await request(app).post('/api/learnings').send(validLearning);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.cycleId).toBe('cycle-001');
    expect(res.body.team).toBe('TheATeam');
    expect(res.body.role).toBe('backend-coder');
    expect(res.body.content).toBe(validLearning.content);
    expect(res.body.category).toBe('architecture');
    expect(res.body.createdAt).toBeDefined();
  });

  // Verifies: FR-CB-008 — Optional category
  it('creates a learning without category', async () => {
    const { category, ...noCategory } = validLearning;
    const res = await request(app).post('/api/learnings').send(noCategory);
    expect(res.status).toBe(201);
    expect(res.body.category).toBeUndefined();
  });

  // Verifies: FR-CB-016 — Validation for missing fields
  it('returns 400 if cycleId is missing', async () => {
    const { cycleId, ...body } = validLearning;
    const res = await request(app).post('/api/learnings').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 400 if team is missing', async () => {
    const { team, ...body } = validLearning;
    const res = await request(app).post('/api/learnings').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 if role is missing', async () => {
    const { role, ...body } = validLearning;
    const res = await request(app).post('/api/learnings').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 if content is missing', async () => {
    const { content, ...body } = validLearning;
    const res = await request(app).post('/api/learnings').send(body);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/learnings/batch', () => {
  // Verifies: FR-CB-009 — Batch create learnings
  it('creates multiple learnings and returns {data: Learning[]}', async () => {
    const batch = {
      learnings: [
        validLearning,
        { ...validLearning, role: 'qa-review', content: 'QA discovered edge case in routing' },
        { ...validLearning, team: 'TheFixer', role: 'fixer', content: 'Quick fix pattern works well' },
      ],
    };
    const res = await request(app).post('/api/learnings/batch').send(batch);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].team).toBe('TheATeam');
    expect(res.body.data[1].role).toBe('qa-review');
    expect(res.body.data[2].team).toBe('TheFixer');
  });

  // Verifies: FR-CB-017 — Response follows {data: T[]} pattern
  it('response has data wrapper', async () => {
    const batch = { learnings: [validLearning] };
    const res = await request(app).post('/api/learnings/batch').send(batch);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 400 if learnings array is missing', async () => {
    const res = await request(app).post('/api/learnings/batch').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('learnings array');
  });

  it('returns 400 if learnings array is empty', async () => {
    const res = await request(app).post('/api/learnings/batch').send({ learnings: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 if an item in the batch is missing required fields', async () => {
    const batch = {
      learnings: [
        validLearning,
        { cycleId: 'cycle-001', team: 'TheATeam' }, // missing role and content
      ],
    };
    const res = await request(app).post('/api/learnings/batch').send(batch);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('learnings[1]');
  });
});

describe('GET /api/learnings', () => {
  // Verifies: FR-CB-010 — List learnings with pagination
  it('returns paginated list', async () => {
    await request(app).post('/api/learnings').send(validLearning);
    await request(app).post('/api/learnings').send({ ...validLearning, content: 'Second learning' });

    const res = await request(app).get('/api/learnings');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.totalPages).toBe(1);
  });

  // Verifies: FR-CB-010 — Filter by team
  it('filters by team', async () => {
    await request(app).post('/api/learnings').send(validLearning);
    await request(app).post('/api/learnings').send({ ...validLearning, team: 'TheFixer' });

    const res = await request(app).get('/api/learnings?team=TheATeam');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].team).toBe('TheATeam');
  });

  // Verifies: FR-CB-010 — Filter by role
  it('filters by role', async () => {
    await request(app).post('/api/learnings').send(validLearning);
    await request(app).post('/api/learnings').send({ ...validLearning, role: 'qa-review' });

    const res = await request(app).get('/api/learnings?role=backend-coder');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].role).toBe('backend-coder');
  });

  // Verifies: FR-CB-010 — Filter by cycleId
  it('filters by cycleId', async () => {
    await request(app).post('/api/learnings').send(validLearning);
    await request(app).post('/api/learnings').send({ ...validLearning, cycleId: 'cycle-002' });

    const res = await request(app).get('/api/learnings?cycleId=cycle-001');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].cycleId).toBe('cycle-001');
  });

  // Verifies: FR-CB-010 — Pagination
  it('supports pagination params', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/learnings').send({ ...validLearning, content: `Learning ${i}` });
    }

    const res = await request(app).get('/api/learnings?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
  });

  // Verifies: FR-CB-010 — Combined filters
  it('combines multiple filters', async () => {
    await request(app).post('/api/learnings').send(validLearning);
    await request(app).post('/api/learnings').send({ ...validLearning, team: 'TheFixer' });
    await request(app).post('/api/learnings').send({ ...validLearning, role: 'qa-review' });

    const res = await request(app).get('/api/learnings?team=TheATeam&role=backend-coder');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns empty data when no learnings match', async () => {
    const res = await request(app).get('/api/learnings?team=NonExistent');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});
