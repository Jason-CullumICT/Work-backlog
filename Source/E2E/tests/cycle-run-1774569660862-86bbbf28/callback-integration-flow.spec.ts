// Verifies: FR-CB-001, FR-CB-002, FR-CB-005, FR-CB-008, FR-CB-012, FR-CB-013, FR-CB-014
// E2E integration flow: Orchestrator callback lifecycle end-to-end

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

test.describe('Feature: Orchestrator-to-Portal Callback Integration', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('React Router')) {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('should render the Features page with correct structure', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
    // Verify table columns exist
    await expect(page.getByText('Title')).toBeVisible();
    await expect(page.getByText('Description')).toBeVisible();
    await expect(page.getByText('Branch')).toBeVisible();
    // Verify pagination controls
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    expect(consoleErrors).toHaveLength(0);
  });

  test('should render the Learnings page with filters', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    await expect(page.getByRole('heading', { name: 'Learnings' })).toBeVisible();
    // Verify filter dropdowns exist
    const teamFilter = page.locator('select').first();
    await expect(teamFilter).toBeVisible();
    // Verify team filter has expected options
    const options = await teamFilter.locator('option').allTextContents();
    expect(options).toContain('All Teams');
    expect(options).toContain('TheATeam');
    expect(options).toContain('TheFixer');
    expect(consoleErrors).toHaveLength(0);
  });

  test('should show Active Cycles section on Dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('active-cycles')).toBeVisible();
    await expect(page.getByText('Active Cycles')).toBeVisible();
    // Active Cycles should appear before Summary
    const cyclesSection = page.getByTestId('active-cycles');
    const summarySection = page.getByTestId('summary-cards');
    const cyclesBox = await cyclesSection.boundingBox();
    const summaryBox = await summarySection.boundingBox();
    if (cyclesBox && summaryBox) {
      expect(cyclesBox.y).toBeLessThan(summaryBox.y);
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test('should create a cycle via API and see it on dashboard', async ({ page, request }) => {
    // Create a cycle via callback API
    const createResponse = await request.post(`${API_BASE}/cycles`, {
      data: {
        workItemId: 'e2e-wi-001',
        team: 'TheATeam',
        branch: 'cycle/e2e-test-branch',
      },
    });
    expect(createResponse.status()).toBe(201);
    const cycle = await createResponse.json();
    expect(cycle.id).toBeTruthy();
    expect(cycle.status).toBe('started');
    expect(cycle.team).toBe('TheATeam');

    // Navigate to dashboard and verify active cycle appears
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('active-cycles')).toBeVisible();
    await expect(page.getByText('TheATeam')).toBeVisible();
    await expect(page.getByText('cycle/e2e-test-branch')).toBeVisible();
  });

  test('should update cycle phase via API', async ({ request }) => {
    // Create cycle
    const createRes = await request.post(`${API_BASE}/cycles`, {
      data: { workItemId: 'e2e-wi-002', team: 'TheFixer', branch: 'fix/e2e-phase' },
    });
    const cycle = await createRes.json();

    // Update to implementation phase
    const updateRes = await request.patch(`${API_BASE}/cycles/${cycle.id}`, {
      data: { status: 'implementation' },
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.status).toBe('implementation');
    expect(updated.phases.length).toBeGreaterThanOrEqual(2);
  });

  test('should create a feature via API and see it on Features page', async ({ page, request }) => {
    // Create a feature via callback API
    const createRes = await request.post(`${API_BASE}/features`, {
      data: {
        workItemId: 'e2e-wi-003',
        cycleId: 'e2e-cycle-003',
        title: 'E2E Test Feature',
        description: 'This feature was created by the E2E integration test to verify the callback flow',
        branch: 'feature/e2e-callback-test',
        mergedAt: new Date().toISOString(),
      },
    });
    expect(createRes.status()).toBe(201);
    const feature = await createRes.json();
    expect(feature.title).toBe('E2E Test Feature');

    // Navigate to features page and verify it appears
    await page.goto('http://localhost:5173/features');
    await expect(page.getByText('E2E Test Feature')).toBeVisible();
    await expect(page.getByText('feature/e2e-callback-test')).toBeVisible();
  });

  test('should create learnings via API and see them on Learnings page', async ({ page, request }) => {
    // Create a learning via callback API
    const createRes = await request.post(`${API_BASE}/learnings`, {
      data: {
        cycleId: 'e2e-cycle-004',
        team: 'TheATeam',
        role: 'backend-coder',
        content: 'E2E discovered: always validate input before processing',
        category: 'validation',
      },
    });
    expect(createRes.status()).toBe(201);

    // Navigate to learnings page and verify it appears
    await page.goto('http://localhost:5173/learnings');
    await expect(page.getByText('E2E discovered: always validate input before processing')).toBeVisible();
    await expect(page.getByText('TheATeam')).toBeVisible();
    await expect(page.getByText('backend-coder')).toBeVisible();
  });

  test('should batch create learnings via API', async ({ request }) => {
    const batchRes = await request.post(`${API_BASE}/learnings/batch`, {
      data: {
        learnings: [
          { cycleId: 'e2e-cycle-005', team: 'TheATeam', role: 'frontend-coder', content: 'Batch learning 1' },
          { cycleId: 'e2e-cycle-005', team: 'TheATeam', role: 'qa-review', content: 'Batch learning 2' },
        ],
      },
    });
    expect(batchRes.status()).toBe(201);
    const result = await batchRes.json();
    expect(result.data).toHaveLength(2);
  });

  test('should complete a cycle and create feature in full lifecycle', async ({ page, request }) => {
    // Step 1: Create cycle (run started)
    const cycleRes = await request.post(`${API_BASE}/cycles`, {
      data: { workItemId: 'e2e-wi-lifecycle', team: 'TheATeam', branch: 'feature/lifecycle-test' },
    });
    const cycle = await cycleRes.json();

    // Step 2: Update through phases
    await request.patch(`${API_BASE}/cycles/${cycle.id}`, { data: { status: 'requirements' } });
    await request.patch(`${API_BASE}/cycles/${cycle.id}`, { data: { status: 'api-contract' } });
    await request.patch(`${API_BASE}/cycles/${cycle.id}`, { data: { status: 'implementation' } });
    await request.patch(`${API_BASE}/cycles/${cycle.id}`, { data: { status: 'review' } });

    // Step 3: Complete cycle
    const completeRes = await request.patch(`${API_BASE}/cycles/${cycle.id}`, { data: { status: 'completed' } });
    const completedCycle = await completeRes.json();
    expect(completedCycle.status).toBe('completed');
    expect(completedCycle.result).toBe('passed');
    expect(completedCycle.completedAt).toBeTruthy();

    // Step 4: Create feature (run completed callback)
    const featureRes = await request.post(`${API_BASE}/features`, {
      data: {
        workItemId: 'e2e-wi-lifecycle',
        cycleId: cycle.id,
        title: 'Lifecycle Test Feature',
        description: 'Created after full cycle completion',
        branch: 'feature/lifecycle-test',
        mergedAt: new Date().toISOString(),
      },
    });
    expect(featureRes.status()).toBe(201);

    // Step 5: Create learnings (post-completion callback)
    const learningRes = await request.post(`${API_BASE}/learnings`, {
      data: { cycleId: cycle.id, team: 'TheATeam', role: 'backend-coder', content: 'Lifecycle learning' },
    });
    expect(learningRes.status()).toBe(201);

    // Step 6: Verify completed cycle no longer shows on dashboard active cycles
    await page.goto('http://localhost:5173/');
    // The completed cycle should NOT appear in active cycles
    const activeCyclesSection = page.getByTestId('active-cycles');
    await expect(activeCyclesSection).toBeVisible();
    // Lifecycle test branch should not be in active cycles (it's completed)
    const lifecycleBranch = activeCyclesSection.getByText('feature/lifecycle-test');
    await expect(lifecycleBranch).not.toBeVisible();

    // Step 7: Verify feature appears on Features page
    await page.goto('http://localhost:5173/features');
    await expect(page.getByText('Lifecycle Test Feature')).toBeVisible();
  });

  test('should navigate between callback feature pages without errors', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Dashboard -> Features
    await page.getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL(/\/features/);
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();

    // Features -> Learnings
    await page.getByRole('link', { name: 'Learnings' }).click();
    await expect(page).toHaveURL(/\/learnings/);
    await expect(page.getByRole('heading', { name: 'Learnings' })).toBeVisible();

    // Learnings -> Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByTestId('active-cycles')).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
