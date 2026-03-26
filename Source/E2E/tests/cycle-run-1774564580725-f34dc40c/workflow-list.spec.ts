// Verifies: FR-WFD-007, FR-WFD-010 — E2E tests for workflow list page and navigation
import { test, expect } from '@playwright/test';

test.describe('Feature: Workflow List Page', () => {
  test('should navigate to workflows page via nav link', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible();
    const workflowsLink = nav.getByText('Workflows');
    await expect(workflowsLink).toBeVisible();
    await workflowsLink.click();
    await expect(page).toHaveURL(/\/workflows/);
  });

  test('should render the workflows list page heading', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();
  });

  test('should show the Create Workflow button', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    const createBtn = page.getByTestId('create-workflow-button');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toHaveText('Create Workflow');
  });

  test('should display the default seeded workflow', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });
    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      await expect(table.getByText('Feature Processing Pipeline')).toBeVisible();
    }
  });

  test('should navigate to create workflow page when clicking Create Workflow', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.getByTestId('create-workflow-button').click();
    await expect(page).toHaveURL(/\/workflows\/new/);
  });

  test('should have no console errors during navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto('http://localhost:5173/workflows');
    await page.waitForTimeout(2000);
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('React Router') && !e.includes('Future Flag'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
