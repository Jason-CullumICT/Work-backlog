import { test, expect } from '@playwright/test';

test.describe('Feature: Dashboard (pipeline-optimisations regression)', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
