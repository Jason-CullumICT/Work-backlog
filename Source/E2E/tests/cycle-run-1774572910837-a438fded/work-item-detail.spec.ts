import { test, expect } from '@playwright/test';

// Verifies: FR-WF-011 — Work Item Detail Page E2E tests
test.describe('Feature: Work Item Detail (pipeline-optimisations regression)', () => {
  // Helper: create a work item via the API and return its ID
  async function createWorkItem(page: import('@playwright/test').Page, overrides: Record<string, string> = {}): Promise<string> {
    const response = await page.request.post('http://localhost:3001/api/work-items', {
      data: {
        title: overrides.title ?? 'E2E Detail Test Item',
        description: overrides.description ?? 'Work item created for detail page E2E validation',
        type: overrides.type ?? 'feature',
        priority: overrides.priority ?? 'high',
        source: overrides.source ?? 'browser',
      },
    });
    expect(response.ok()).toBeTruthy();
    const item = await response.json();
    return item.id;
  }

  test('should render detail page with all sections', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await expect(page.getByText('E2E Detail Test Item')).toBeVisible();
    await expect(page.getByTestId('detail-section')).toBeVisible();
    await expect(page.getByTestId('history-section')).toBeVisible();
  });

  test('should display detail fields for a new item', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Check key detail field labels
    await expect(page.getByText('Type')).toBeVisible();
    await expect(page.getByText('Source')).toBeVisible();
    await expect(page.getByText('Assigned Team')).toBeVisible();
  });

  test('should show Route button for backlog items', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await expect(page.getByTestId('actions-section')).toBeVisible();
    await expect(page.getByTestId('action-route')).toBeVisible();
  });

  test('should route item and show approve/reject for feature', async ({ page }) => {
    const itemId = await createWorkItem(page, { type: 'feature' });
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Route the feature (should go to full-review -> proposed)
    await page.getByTestId('action-route').click();
    await page.waitForTimeout(500);

    // Should now show approve/reject buttons
    await expect(page.getByTestId('action-approve')).toBeVisible();
    await expect(page.getByTestId('action-reject')).toBeVisible();
  });

  test('should approve item and show dispatch controls', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route via API to get to proposed state
    await page.request.post(`http://localhost:3001/api/work-items/${itemId}/route`);

    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Approve
    await page.getByTestId('action-approve').click();
    await page.waitForTimeout(500);

    // Should show dispatch controls
    await expect(page.getByTestId('action-dispatch')).toBeVisible();
    await expect(page.getByTestId('dispatch-team-select')).toBeVisible();
  });

  test('should dispatch to a team', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route → Approve via API
    await page.request.post(`http://localhost:3001/api/work-items/${itemId}/route`);
    await page.request.post(`http://localhost:3001/api/work-items/${itemId}/approve`);

    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await page.getByTestId('dispatch-team-select').selectOption('TheFixer');
    await page.getByTestId('action-dispatch').click();
    await page.waitForTimeout(500);

    // After dispatch, no action buttons
    await expect(page.getByTestId('actions-section')).not.toBeVisible();
  });

  test('should reject with reason', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route via API
    await page.request.post(`http://localhost:3001/api/work-items/${itemId}/route`);

    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Reject button should be disabled without reason
    const rejectButton = page.getByTestId('action-reject');
    await expect(rejectButton).toBeVisible();

    // Fill reason and reject
    await page.getByTestId('reject-reason').fill('Incomplete requirements');
    await rejectButton.click();
    await page.waitForTimeout(500);

    // After rejection, no actions section
    await expect(page.getByTestId('actions-section')).not.toBeVisible();
  });

  test('should navigate back to list', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await page.getByText('Back to list').click();
    await expect(page.getByRole('heading', { name: 'Work Items' })).toBeVisible();
  });

  test('should display change history entries', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    const historySection = page.getByTestId('history-section');
    await expect(historySection).toBeVisible();
    await expect(historySection.getByText('Change History')).toBeVisible();
  });

  test('should have no console errors on detail page', async ({ page }) => {
    const itemId = await createWorkItem(page);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`http://localhost:5173/work-items/${itemId}`);
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
