// Verifies: FR-CB-012 — Features Browser Page E2E tests
import { test, expect } from '@playwright/test';

test.describe('Feature: Features Browser Page', () => {
  test('should render the features page with heading', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
  });

  test('should display features table with correct columns', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();

    const table = page.getByTestId('features-table');
    await expect(table).toBeVisible();
    await expect(table.getByText('Title')).toBeVisible();
    await expect(table.getByText('Description')).toBeVisible();
    await expect(table.getByText('Branch')).toBeVisible();
    await expect(table.getByText('Merged')).toBeVisible();
    await expect(table.getByText('Work Item')).toBeVisible();
  });

  test('should show empty state when no features exist', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    await expect(page.getByText('No features found')).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    const paginationControls = page.getByTestId('pagination-controls');
    await expect(paginationControls).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(page.getByLabel('Page size')).toBeVisible();
  });

  test('should have a refresh button', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('should navigate to features page from navigation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL('http://localhost:5173/features');
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/features');
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes('React Router'))).toHaveLength(0);
  });
});
