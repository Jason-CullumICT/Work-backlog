import { test, expect } from '@playwright/test';

test.describe('Feature: Create Work Item (pipeline-optimisations regression)', () => {
  test('should render the create work item page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();
  });

  test('should display form fields', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test('should validate required fields on submit', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    const submitButton = page.getByRole('button', { name: /create|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should stay on page due to validation
      await expect(page).toHaveURL(/work-items\/new/);
    }
  });

  test('should fill and submit the form', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await page.getByLabel(/title/i).fill('E2E Test Work Item');
    await page.getByLabel(/description/i).fill('Created by E2E regression test');
    const submitButton = page.getByRole('button', { name: /create|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/work-items/new');
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
