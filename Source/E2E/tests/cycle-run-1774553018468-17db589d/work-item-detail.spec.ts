import { test, expect } from '@playwright/test';

test.describe('Feature: Work Item Detail Page', () => {
  // Helper: create a work item via the API and return its ID
  async function createWorkItem(page: import('@playwright/test').Page): Promise<string> {
    const response = await page.request.post('http://localhost:3000/api/work-items', {
      data: {
        title: 'E2E Detail Test Item',
        description: 'A test work item for E2E detail page validation with sufficient detail',
        type: 'feature',
        priority: 'high',
        source: 'browser',
      },
    });
    const item = await response.json();
    return item.id;
  }

  test('should render work item detail page with all sections', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Header with title and badges
    await expect(page.getByText('E2E Detail Test Item')).toBeVisible();
    await expect(page.getByTestId('detail-section')).toBeVisible();
    await expect(page.getByTestId('history-section')).toBeVisible();
  });

  test('should display detail fields', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await expect(page.getByText('Type')).toBeVisible();
    await expect(page.getByText('Source')).toBeVisible();
    await expect(page.getByText('Complexity')).toBeVisible();
    await expect(page.getByText('Route')).toBeVisible();
    await expect(page.getByText('Assigned Team')).toBeVisible();
  });

  test('should show Route action button for backlog items', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await expect(page.getByTestId('actions-section')).toBeVisible();
    await expect(page.getByTestId('action-route')).toBeVisible();
  });

  test('should route a work item and show updated status', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await page.getByTestId('action-route').click();

    // After routing a feature, it should go to proposed (full-review)
    // Wait for the page to refresh with new status
    await page.waitForTimeout(500);
    // Status badge should show proposed or approved
    await expect(page.getByTestId('status-badge')).toBeVisible();
  });

  test('should display change history timeline', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    const historySection = page.getByTestId('history-section');
    await expect(historySection).toBeVisible();
    await expect(historySection.getByText('Change History')).toBeVisible();
    // Should have at least the creation entry
    await expect(page.getByTestId('history-entry').first()).toBeVisible();
  });

  test('should navigate back to list from detail page', async ({ page }) => {
    const itemId = await createWorkItem(page);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await page.getByText('Back to list').click();
    await expect(page.getByRole('heading', { name: 'Work Items' })).toBeVisible();
  });

  test('should show approve/reject buttons after routing to proposed', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route the item via API first
    await page.request.post(`http://localhost:3000/api/work-items/${itemId}/route`);

    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // For a feature, routing sends to proposed → should show approve/reject
    await expect(page.getByTestId('action-approve')).toBeVisible();
    await expect(page.getByTestId('action-reject')).toBeVisible();
    await expect(page.getByTestId('reject-reason')).toBeVisible();
  });

  test('should approve a proposed work item and show dispatch button', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route and then visit
    await page.request.post(`http://localhost:3000/api/work-items/${itemId}/route`);
    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Approve
    await page.getByTestId('action-approve').click();
    await page.waitForTimeout(500);

    // After approval, should show dispatch controls
    await expect(page.getByTestId('action-dispatch')).toBeVisible();
    await expect(page.getByTestId('dispatch-team-select')).toBeVisible();
  });

  test('should dispatch an approved work item', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route → Approve via API
    await page.request.post(`http://localhost:3000/api/work-items/${itemId}/route`);
    await page.request.post(`http://localhost:3000/api/work-items/${itemId}/approve`);

    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    // Select team and dispatch
    await page.getByTestId('dispatch-team-select').selectOption('TheFixer');
    await page.getByTestId('action-dispatch').click();
    await page.waitForTimeout(500);

    // After dispatch, no action buttons should be shown
    await expect(page.getByTestId('actions-section')).not.toBeVisible();
  });

  test('should show assessment records after assessment', async ({ page }) => {
    const itemId = await createWorkItem(page);

    // Route → Assess via API
    await page.request.post(`http://localhost:3000/api/work-items/${itemId}/route`);
    await page.request.post(`http://localhost:3000/api/work-items/${itemId}/assess`);

    await page.goto(`http://localhost:5173/work-items/${itemId}`);

    await expect(page.getByTestId('assessments-section')).toBeVisible();
    const cards = page.getByTestId('assessment-card');
    // Should have 4 assessment cards (requirements-reviewer, domain-expert, work-definer, pod-lead)
    await expect(cards).toHaveCount(4);
  });

  test('should have no console errors on load', async ({ page }) => {
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
