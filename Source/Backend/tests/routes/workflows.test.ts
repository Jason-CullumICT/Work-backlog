// Verifies: FR-WFD-002, FR-WFD-003 — Workflow CRUD and flow graph route tests

import request from 'supertest';
import app from '../../src/app';
import { resetStore } from '../../src/store/workflowStore';
import { resetStore as resetWorkItemStore } from '../../src/store/workItemStore';
import {
  StageType,
  WorkItemRoute,
  WorkItemStatus,
  ConsensusRule,
} from '../../../Shared/types/workflow';

const validWorkflowBody = {
  name: 'Test Workflow',
  description: 'A test workflow for route testing',
  stages: [
    { name: 'Intake', type: StageType.Intake, order: 0, description: 'Input', statusMapping: WorkItemStatus.Backlog },
    { name: 'Queue', type: StageType.Queue, order: 1, description: 'Queue', statusMapping: WorkItemStatus.Backlog },
    { name: 'Router', type: StageType.Router, order: 2, description: 'Route', statusMapping: WorkItemStatus.Routing },
    { name: 'Assessment', type: StageType.Assessment, order: 3, description: 'Assess', statusMapping: WorkItemStatus.Reviewing },
    { name: 'Worklist', type: StageType.Worklist, order: 4, description: 'Approved', statusMapping: WorkItemStatus.Approved },
    { name: 'Dispatch', type: StageType.Dispatch, order: 5, description: 'Dispatch', statusMapping: WorkItemStatus.InProgress },
  ],
  routingRules: [
    {
      name: 'Fast-track bugs',
      path: WorkItemRoute.FastTrack,
      conditions: [{ field: 'type', operator: 'equals', value: 'bug' }],
      priority: 1,
    },
  ],
  assessmentConfig: {
    roles: [{ id: 'role-lead', name: 'Lead', description: 'Pod lead' }],
    consensusRule: ConsensusRule.AllApprove,
  },
  teamTargets: ['TheATeam'],
};

beforeEach(() => {
  resetStore();
  resetWorkItemStore();
});

describe('POST /api/workflows', () => {
  // Verifies: FR-WFD-002 — Create workflow
  it('creates a workflow and returns 201', async () => {
    const res = await request(app).post('/api/workflows').send(validWorkflowBody);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Workflow');
    expect(res.body.id).toBeDefined();
    expect(res.body.isActive).toBe(true);
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/api/workflows').send({ ...validWorkflowBody, name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for missing description', async () => {
    const res = await request(app).post('/api/workflows').send({ ...validWorkflowBody, description: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty team targets', async () => {
    const res = await request(app).post('/api/workflows').send({ ...validWorkflowBody, teamTargets: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty stages', async () => {
    const res = await request(app).post('/api/workflows').send({ ...validWorkflowBody, stages: [] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/workflows', () => {
  // Verifies: FR-WFD-002 — List workflows with {data: Workflow[]}
  it('returns empty data array initially', async () => {
    const res = await request(app).get('/api/workflows');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns created workflows', async () => {
    await request(app).post('/api/workflows').send(validWorkflowBody);
    await request(app).post('/api/workflows').send({ ...validWorkflowBody, name: 'Second' });
    const res = await request(app).get('/api/workflows');
    expect(res.body.data.length).toBe(2);
  });
});

describe('GET /api/workflows/:id', () => {
  // Verifies: FR-WFD-002 — Get single workflow
  it('returns workflow by ID', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).get(`/api/workflows/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Test Workflow');
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await request(app).get('/api/workflows/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/workflows/:id', () => {
  // Verifies: FR-WFD-002 — Update workflow
  it('updates workflow name', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).patch(`/api/workflows/${id}`).send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('updates workflow isActive', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).patch(`/api/workflows/${id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('returns 404 for non-existent workflow', async () => {
    const res = await request(app).patch('/api/workflows/nonexistent').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/workflows/:id', () => {
  // Verifies: FR-WFD-002 — Soft delete (cannot delete default)
  it('soft deletes a workflow and returns 204', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).delete(`/api/workflows/${id}`);
    expect(res.status).toBe(204);

    // Confirm it's gone
    const getRes = await request(app).get(`/api/workflows/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for non-existent workflow', async () => {
    const res = await request(app).delete('/api/workflows/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/workflows/:id/flow', () => {
  // Verifies: FR-WFD-003 — Flow graph endpoint
  it('returns nodes and edges for a workflow', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).get(`/api/workflows/${id}/flow`);
    expect(res.status).toBe(200);
    expect(res.body.nodes).toBeDefined();
    expect(res.body.edges).toBeDefined();
    expect(Array.isArray(res.body.nodes)).toBe(true);
    expect(Array.isArray(res.body.edges)).toBe(true);
  });

  it('returns nodes with position data', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).get(`/api/workflows/${id}/flow`);
    const node = res.body.nodes[0];
    expect(node.x).toBeDefined();
    expect(node.y).toBeDefined();
    expect(node.width).toBeDefined();
    expect(node.height).toBeDefined();
  });

  it('includes fast-track and full-review edges with labels', async () => {
    const createRes = await request(app).post('/api/workflows').send(validWorkflowBody);
    const id = createRes.body.id;
    const res = await request(app).get(`/api/workflows/${id}/flow`);
    const fastTrack = res.body.edges.find((e: { label?: string }) => e.label === 'fast-track');
    const fullReview = res.body.edges.find((e: { label?: string }) => e.label === 'full-review');
    expect(fastTrack).toBeDefined();
    expect(fastTrack.style).toBe('dashed');
    expect(fullReview).toBeDefined();
    expect(fullReview.style).toBe('solid');
  });

  it('returns 404 for non-existent workflow', async () => {
    const res = await request(app).get('/api/workflows/nonexistent/flow');
    expect(res.status).toBe(404);
  });
});
