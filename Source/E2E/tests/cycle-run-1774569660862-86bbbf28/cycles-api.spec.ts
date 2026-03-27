// Verifies: FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004 — E2E tests for Cycles API
import { test, expect } from '@playwright/test';

test.describe('Feature: Cycles API', () => {
  test('should create a cycle via POST /api/cycles', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/cycles', {
      data: {
        workItemId: 'e2e-wi-001',
        team: 'TheATeam',
        branch: 'cycle/e2e-create-test',
      },
    });

    expect(response.status()).toBe(201);
    const cycle = await response.json();
    expect(cycle.id).toBeTruthy();
    expect(cycle.workItemId).toBe('e2e-wi-001');
    expect(cycle.team).toBe('TheATeam');
    expect(cycle.status).toBe('started');
    expect(cycle.branch).toBe('cycle/e2e-create-test');
    expect(cycle.phases).toHaveLength(1);
    expect(cycle.phases[0].name).toBe('started');
  });

  test('should reject cycle creation with missing fields', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/cycles', {
      data: { workItemId: 'e2e-wi-002' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('should update cycle phase via PATCH /api/cycles/:id', async ({ page }) => {
    // Create a cycle first
    const createResponse = await page.request.post('http://localhost:3001/api/cycles', {
      data: {
        workItemId: 'e2e-wi-003',
        team: 'TheFixer',
        branch: 'cycle/e2e-update-test',
      },
    });
    const cycle = await createResponse.json();

    // Update to implementation phase
    const updateResponse = await page.request.patch(`http://localhost:3001/api/cycles/${cycle.id}`, {
      data: { status: 'implementation' },
    });

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.status).toBe('implementation');
    expect(updated.phases).toHaveLength(2);
  });

  test('should complete a cycle and set result', async ({ page }) => {
    const createResponse = await page.request.post('http://localhost:3001/api/cycles', {
      data: {
        workItemId: 'e2e-wi-004',
        team: 'TheATeam',
        branch: 'cycle/e2e-complete-test',
      },
    });
    const cycle = await createResponse.json();

    const updateResponse = await page.request.patch(`http://localhost:3001/api/cycles/${cycle.id}`, {
      data: { status: 'completed' },
    });

    const completed = await updateResponse.json();
    expect(completed.status).toBe('completed');
    expect(completed.result).toBe('passed');
    expect(completed.completedAt).toBeTruthy();
  });

  test('should fail a cycle with error message', async ({ page }) => {
    const createResponse = await page.request.post('http://localhost:3001/api/cycles', {
      data: {
        workItemId: 'e2e-wi-005',
        team: 'TheFixer',
        branch: 'cycle/e2e-fail-test',
      },
    });
    const cycle = await createResponse.json();

    const updateResponse = await page.request.patch(`http://localhost:3001/api/cycles/${cycle.id}`, {
      data: { status: 'failed', error: 'Tests failed' },
    });

    const failed = await updateResponse.json();
    expect(failed.status).toBe('failed');
    expect(failed.result).toBe('failed');
    expect(failed.error).toBe('Tests failed');
  });

  test('should list cycles via GET /api/cycles', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/cycles');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.page).toBeDefined();
    expect(body.limit).toBeDefined();
    expect(body.total).toBeDefined();
    expect(body.totalPages).toBeDefined();
  });

  test('should get cycle by ID via GET /api/cycles/:id', async ({ page }) => {
    const createResponse = await page.request.post('http://localhost:3001/api/cycles', {
      data: {
        workItemId: 'e2e-wi-006',
        team: 'TheATeam',
        branch: 'cycle/e2e-getbyid-test',
      },
    });
    const cycle = await createResponse.json();

    const getResponse = await page.request.get(`http://localhost:3001/api/cycles/${cycle.id}`);
    expect(getResponse.status()).toBe(200);
    const fetched = await getResponse.json();
    expect(fetched.id).toBe(cycle.id);
  });

  test('should return 404 for non-existent cycle', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/cycles/nonexistent-id');
    expect(response.status()).toBe(404);
  });
});
