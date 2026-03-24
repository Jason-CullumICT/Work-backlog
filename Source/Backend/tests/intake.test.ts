import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Verifies: FR-WF-007 — Intake webhooks with dedup
describe('Intake Webhooks', () => {
  // Verifies: FR-WF-007
  describe('POST /api/intake/zendesk', () => {
    // Verifies: FR-WF-007
    it('should create a work item from Zendesk webhook', async () => {
      const res = await request(app)
        .post('/api/intake/zendesk')
        .send({
          ticket_id: 'ZD-1001',
          subject: 'Cannot login',
          description: 'User reports login failure',
          priority: 'high',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Cannot login');
      expect(res.body.description).toBe('User reports login failure');
      expect(res.body.source).toBe('zendesk');
      expect(res.body.external_id).toBe('ZD-1001');
      expect(res.body.type).toBe('task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('backlog');
    });

    // Verifies: FR-WF-007
    it('should dedup and return existing item on duplicate ticket_id', async () => {
      const first = await request(app)
        .post('/api/intake/zendesk')
        .send({
          ticket_id: 'ZD-2002',
          subject: 'First submission',
          description: 'Original',
        })
        .expect(201);

      const second = await request(app)
        .post('/api/intake/zendesk')
        .send({
          ticket_id: 'ZD-2002',
          subject: 'Duplicate submission',
          description: 'Should not create new',
        })
        .expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.title).toBe('First submission');
    });

    it('should return 400 if ticket_id is missing', async () => {
      const res = await request(app)
        .post('/api/intake/zendesk')
        .send({ subject: 'No ticket id' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if subject is missing', async () => {
      const res = await request(app)
        .post('/api/intake/zendesk')
        .send({ ticket_id: 'ZD-999' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should map Zendesk urgent priority to critical', async () => {
      const res = await request(app)
        .post('/api/intake/zendesk')
        .send({
          ticket_id: 'ZD-URGENT',
          subject: 'Urgent ticket',
          priority: 'urgent',
        })
        .expect(201);

      expect(res.body.priority).toBe('critical');
    });
  });

  // Verifies: FR-WF-007
  describe('POST /api/intake/integration', () => {
    // Verifies: FR-WF-007
    it('should create a work item from integration webhook', async () => {
      const res = await request(app)
        .post('/api/intake/integration')
        .send({
          external_id: 'INT-500',
          title: 'Integration item',
          description: 'From external system',
          type: 'bug',
          priority: 'high',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Integration item');
      expect(res.body.source).toBe('integration');
      expect(res.body.external_id).toBe('INT-500');
      expect(res.body.type).toBe('bug');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('backlog');
    });

    // Verifies: FR-WF-007
    it('should dedup and return existing item on duplicate external_id', async () => {
      const first = await request(app)
        .post('/api/intake/integration')
        .send({
          external_id: 'INT-DUP',
          title: 'First integration',
        })
        .expect(201);

      const second = await request(app)
        .post('/api/intake/integration')
        .send({
          external_id: 'INT-DUP',
          title: 'Duplicate integration',
        })
        .expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.title).toBe('First integration');
    });

    it('should default source to integration', async () => {
      const res = await request(app)
        .post('/api/intake/integration')
        .send({
          external_id: 'INT-DEFAULT',
          title: 'Default source test',
        })
        .expect(201);

      expect(res.body.source).toBe('integration');
    });

    it('should return 400 if external_id is missing', async () => {
      const res = await request(app)
        .post('/api/intake/integration')
        .send({ title: 'No external id' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/intake/integration')
        .send({ external_id: 'INT-NO-TITLE' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });
});
