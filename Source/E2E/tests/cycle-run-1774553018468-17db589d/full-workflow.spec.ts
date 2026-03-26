import { test, expect } from '@playwright/test';

test.describe('Feature: Full Workflow E2E', () => {
  test('should complete the full workflow: create -> route -> assess -> approve -> dispatch', async ({ page }) => {
    // Step 1: Navigate to create page
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByRole('heading', { name: 'Create Work Item' })).toBeVisible();

    // Step 2: Fill out the form
    await page.getByTestId('input-title').fill('Full Workflow Test Feature');
    await page.getByTestId('input-description').fill('This is a comprehensive E2E test that walks through the entire workflow pipeline from creation to dispatch');
    await page.getByTestId('select-type').selectOption('feature');
    await page.getByTestId('select-priority').selectOption('critical');
    await page.getByTestId('select-source').selectOption('browser');

    // Step 3: Submit
    await page.getByTestId('submit-button').click();
    await page.waitForURL(/\/work-items\/.+/);

    // Step 4: Verify on detail page with backlog status
    await expect(page.getByText('Full Workflow Test Feature')).toBeVisible();
    await expect(page.getByTestId('action-route')).toBeVisible();

    // Step 5: Route the item
    await page.getByTestId('action-route').click();
    await page.waitForTimeout(500);

    // Feature type should go to full-review -> proposed
    // Should now show approve/reject buttons
    await expect(page.getByTestId('action-approve')).toBeVisible();

    // Step 6: Approve the item
    await page.getByTestId('action-approve').click();
    await page.waitForTimeout(500);

    // Should now show dispatch controls
    await expect(page.getByTestId('action-dispatch')).toBeVisible();
    await expect(page.getByTestId('dispatch-team-select')).toBeVisible();

    // Step 7: Dispatch to TheATeam
    await page.getByTestId('dispatch-team-select').selectOption('TheATeam');
    await page.getByTestId('action-dispatch').click();
    await page.waitForTimeout(500);

    // Step 8: Verify final state - no more action buttons
    await expect(page.getByTestId('actions-section')).not.toBeVisible();

    // Step 9: Verify change history has multiple entries
    const historyEntries = page.getByTestId('history-entry');
    const count = await historyEntries.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should complete fast-track workflow for simple bug', async ({ page }) => {
    // Create a simple bug via API
    const response = await page.request.post('http://localhost:3000/api/work-items', {
      data: {
        title: 'Simple Bug Fix',
        description: 'A trivial bug that should be fast-tracked through the workflow',
        type: 'bug',
        priority: 'low',
        source: 'browser',
      },
    });
    const item = await response.json();

    // Set complexity to trivial via PATCH so it qualifies for fast-track
    await page.request.patch(`http://localhost:3000/api/work-items/${item.id}`, {
      data: { complexity: 'trivial' },
    });

    // Navigate to detail page
    await page.goto(`http://localhost:5173/work-items/${item.id}`);
    await expect(page.getByText('Simple Bug Fix')).toBeVisible();

    // Route - should fast-track to approved
    await page.getByTestId('action-route').click();
    await page.waitForTimeout(500);

    // Should skip proposed/reviewing and go straight to dispatch
    await expect(page.getByTestId('action-dispatch')).toBeVisible();

    // Dispatch to TheFixer
    await page.getByTestId('dispatch-team-select').selectOption('TheFixer');
    await page.getByTestId('action-dispatch').click();
    await page.waitForTimeout(500);

    // Done - no more actions
    await expect(page.getByTestId('actions-section')).not.toBeVisible();
  });

  test('should reject a work item with reason', async ({ page }) => {
    // Create and route a work item
    const response = await page.request.post('http://localhost:3000/api/work-items', {
      data: {
        title: 'Item To Reject',
        description: 'This work item will be rejected during the E2E test workflow',
        type: 'feature',
        priority: 'medium',
        source: 'browser',
      },
    });
    const item = await response.json();
    await page.request.post(`http://localhost:3000/api/work-items/${item.id}/route`);

    // Navigate to detail page
    await page.goto(`http://localhost:5173/work-items/${item.id}`);

    // Enter rejection reason and reject
    await page.getByTestId('reject-reason').fill('Requirements are incomplete - need acceptance criteria');
    await page.getByTestId('action-reject').click();
    await page.waitForTimeout(500);

    // After rejection, no action buttons should appear (rejected status has no actions)
    await expect(page.getByTestId('actions-section')).not.toBeVisible();
  });

  test('should navigate between all pages without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Dashboard
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Work Items list
    await page.getByText('Work Items').click();
    await expect(page.getByRole('heading', { name: 'Work Items' })).toBeVisible();

    // Create Item
    await page.getByText('Create Item').click();
    await expect(page.getByRole('heading', { name: 'Create Work Item' })).toBeVisible();

    // Back to Dashboard
    await page.getByText('Dashboard').click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
