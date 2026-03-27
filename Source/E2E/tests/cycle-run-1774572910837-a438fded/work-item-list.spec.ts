import { test, expect } from '@playwright/test';

test.describe('Feature: Work Item List (pipeline-optimisations regression)', () => {
  test('should render the work items list page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByRole('heading', { name: /work items/i })).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items');
    await expect(page.getByText(/status/i)).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/work-items');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
