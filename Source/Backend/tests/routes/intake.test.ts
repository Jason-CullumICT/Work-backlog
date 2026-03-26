// Verifies: FR-WF-008 — Intake webhook route tests
import request from 'supertest';
import app from '../../src/app';
import { resetStore } from '../../src/store/workItemStore';
import {
  WorkItemSource,
  WorkItemType,
  WorkItemPriority,
} from '../../../Shared/types/workflow';

beforeEach(() => {
  resetStore();
});

describe('POST /api/intake/zendesk', () => {
  // Verifies: FR-WF-008 — Zendesk webhook
  it('creates a work item with source=zendesk', async () => {
    const res = await request(app)
      .post('/api/intake/zendesk')
      .send({ title: 'Zendesk ticket', description: 'From zendesk' });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe(WorkItemSource.Zendesk);
    expect(res.body.type).toBe(WorkItemType.Bug);
    expect(res.body.priority).toBe(WorkItemPriority.Medium);
  });

  it('uses provided type and priority', async () => {
    const res = await request(app)
      .post('/api/intake/zendesk')
      .send({
        title: 'Custom ticket',
        description: 'Custom',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Critical,
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe(WorkItemType.Feature);
    expect(res.body.priority).toBe(WorkItemPriority.Critical);
  });

  it('returns 400 if title is missing', async () => {
    const res = await request(app)
      .post('/api/intake/zendesk')
      .send({ description: 'No title' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/intake/automated', () => {
  // Verifies: FR-WF-008 — Automated event receiver
  it('creates a work item with source=automated', async () => {
    const res = await request(app)
      .post('/api/intake/automated')
      .send({ title: 'CI failure', description: 'Build failed' });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe(WorkItemSource.Automated);
    expect(res.body.type).toBe(WorkItemType.Issue);
  });

  it('returns 400 if description is missing', async () => {
    const res = await request(app)
      .post('/api/intake/automated')
      .send({ title: 'No desc' });
    expect(res.status).toBe(400);
  });
});
