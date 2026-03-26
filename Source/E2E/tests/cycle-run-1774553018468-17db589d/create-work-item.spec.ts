import { test, expect } from '@playwright/test';

test.describe('Feature: Create Work Item', () => {
  test('should render the create work item page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByRole('heading', { name: 'Create Work Item' })).toBeVisible();
  });

  test('should display the creation form with all fields', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await expect(page.getByTestId('create-form')).toBeVisible();
    await expect(page.getByTestId('input-title')).toBeVisible();
    await expect(page.getByTestId('input-description')).toBeVisible();
    await expect(page.getByTestId('select-type')).toBeVisible();
    await expect(page.getByTestId('select-priority')).toBeVisible();
    await expect(page.getByTestId('select-source')).toBeVisible();
    await expect(page.getByTestId('submit-button')).toBeVisible();
  });

  test('should show validation errors when submitting empty form', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-title')).toBeVisible();
    await expect(page.getByTestId('error-description')).toBeVisible();
  });

  test('should clear validation error when user types in field', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-title')).toBeVisible();
    await page.getByTestId('input-title').fill('Test Title');
    await expect(page.getByTestId('error-title')).not.toBeVisible();
  });

  test('should submit form and navigate to detail page', async ({ page }) => {
    await page.goto('http://localhost:5173/work-items/new');

    await page.getByTestId('input-title').fill('E2E Test Feature');
    await page.getByTestId('input-description').fill('This is a test work item created by E2E tests for validation');
    await page.getByTestId('select-type').selectOption('feature');
    await page.getByTestId('select-priority').selectOption('high');
    await page.getByTestId('select-source').selectOption('browser');

    await page.getByTestId('submit-button').click();

    // Should navigate to detail page
    await page.waitForURL(/\/work-items\/.+/);
    await expect(page.getByText('E2E Test Feature')).toBeVisible();
  });

  test('should navigate to create page from nav link', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByText('Create Item').click();
    await expect(page.getByRole('heading', { name: 'Create Work Item' })).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/work-items/new');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
