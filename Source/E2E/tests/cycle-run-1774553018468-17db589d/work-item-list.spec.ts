import { test, expect } from '@playwright/test';

test.describe('Feature: Work Item List Page', () => {
  test('should render the work items list page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByRole('heading', { name: 'Work Items' })).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByTestId('filter-controls')).toBeVisible();
    await expect(page.getByLabel('Filter by status')).toBeVisible();
    await expect(page.getByLabel('Filter by type')).toBeVisible();
    await expect(page.getByLabel('Filter by priority')).toBeVisible();
  });

  test('should display the work items table', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByTestId('work-items-table')).toBeVisible();
    // Table headers
    await expect(page.getByText('Doc ID')).toBeVisible();
    await expect(page.getByText('Title')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Priority')).toBeVisible();
  });

  test('should display pagination controls', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByTestId('pagination-controls')).toBeVisible();
    await expect(page.getByLabel('Page size')).toBeVisible();
    await expect(page.getByText('Previous')).toBeVisible();
    await expect(page.getByText('Next')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await page.getByLabel('Filter by status').selectOption('backlog');
    // Page should still be functional after filtering
    await expect(page.getByTestId('work-items-table')).toBeVisible();
  });

  test('should filter by type', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await page.getByLabel('Filter by type').selectOption('feature');
    await expect(page.getByTestId('work-items-table')).toBeVisible();
  });

  test('should navigate to work items page from nav', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByText('Work Items').click();
    await expect(page.getByRole('heading', { name: 'Work Items' })).toBeVisible();
  });

  test('should have a refresh button', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    const refreshButton = page.getByRole('button', { name: 'Refresh' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await expect(page.getByTestId('work-items-table')).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/work-items');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
