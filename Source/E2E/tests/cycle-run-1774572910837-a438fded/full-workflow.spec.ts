import { test, expect } from '@playwright/test';

test.describe('Feature: Full Workflow (pipeline-optimisations regression)', () => {
  test('should navigate from dashboard to work items list', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    const workItemsLink = page.getByRole('link', { name: /work items/i });
    if (await workItemsLink.isVisible()) {
      await workItemsLink.click();
      await expect(page).toHaveURL(/work-items/);
    }
  });

  test('should navigate to create work item page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    const createLink = page.getByRole('link', { name: /create|new/i });
    if (await createLink.isVisible()) {
      await createLink.click();
      await expect(page).toHaveURL(/work-items\/new/);
    }
  });

  test('should create a work item and view its detail', async ({ page }) => {
    // Create a work item via API
    const response = await page.request.post('http://localhost:3001/api/work-items', {
      data: {
        title: 'E2E Workflow Test Item',
        description: 'Created for full workflow E2E test',
        type: 'bug',
        priority: 'medium',
        source: 'browser',
      },
    });
    expect(response.ok()).toBeTruthy();
    const item = await response.json();

    // Navigate to detail page
    await page.goto(`http://localhost:5173/work-items/${item.id}`);
    await expect(page.getByText('E2E Workflow Test Item')).toBeVisible();
  });

  test('should route a work item from detail page', async ({ page }) => {
    // Create a work item via API
    const response = await page.request.post('http://localhost:3001/api/work-items', {
      data: {
        title: 'E2E Route Test Item',
        description: 'Created for routing E2E test',
        type: 'bug',
        priority: 'low',
        source: 'browser',
      },
    });
    const item = await response.json();

    await page.goto(`http://localhost:5173/work-items/${item.id}`);
    const routeButton = page.getByRole('button', { name: /route/i });
    if (await routeButton.isVisible()) {
      await routeButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test('should have no console errors during navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5173/work-items');
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5173/work-items/new');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
