import { test, expect } from '@playwright/test';

test.describe('Feature: Pipeline Optimisations (Self-Judging Workflow)', () => {
  // This cycle modifies team definition markdown files (Teams/) and pipeline configs.
  // The E2E tests verify the existing workflow UI still works correctly after changes,
  // since the pipeline optimisations should not break any user-facing behavior.

  test('should render the dashboard page', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should navigate to work items list', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByRole('heading', { name: /work items/i })).toBeVisible();
  });

  test('should navigate to create work item page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();
  });

  test('should display create form fields', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/type/i)).toBeVisible();
    await expect(page.getByLabel(/priority/i)).toBeVisible();
  });

  test('should create a work item and navigate to detail', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await page.getByLabel(/title/i).fill('Test Pipeline Optimisation Item');
    await page.getByLabel(/description/i).fill('Verifying pipeline optimisations do not break workflow');
    await page.getByLabel(/type/i).selectOption('bug');
    await page.getByLabel(/priority/i).selectOption('low');
    await page.getByRole('button', { name: /create|submit/i }).click();
    // Should navigate to detail page after creation
    await expect(page).toHaveURL(/\/work-items\/.+/, { timeout: 5000 });
  });

  test('should display work item detail with action buttons', async ({ page }) => {
    // First create an item
    await page.goto('http://localhost:5173/work-items/new');
    await page.getByLabel(/title/i).fill('Detail Test Item');
    await page.getByLabel(/description/i).fill('Testing detail view');
    await page.getByLabel(/type/i).selectOption('feature');
    await page.getByLabel(/priority/i).selectOption('medium');
    await page.getByRole('button', { name: /create|submit/i }).click();
    await expect(page).toHaveURL(/\/work-items\/.+/, { timeout: 5000 });
    // Should see the route button (item starts in backlog)
    await expect(page.getByRole('button', { name: /route/i })).toBeVisible();
  });

  test('should have no console errors during navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(500);
    await page.goto('http://localhost:5173/work-items');
    await page.waitForTimeout(500);
    await page.goto('http://localhost:5173/work-items/new');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
