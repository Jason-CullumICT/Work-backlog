// Verifies: FR-WFD-009 — E2E tests for create workflow page
import { test, expect } from '@playwright/test';

test.describe('Feature: Create Workflow Page', () => {
  test('should render create workflow page with heading', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await expect(page.getByRole('heading', { name: 'Create Workflow' })).toBeVisible();
  });

  test('should render the form with all sections', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await expect(page.getByTestId('create-workflow-form')).toBeVisible();
    await expect(page.getByTestId('input-name')).toBeVisible();
    await expect(page.getByTestId('input-description')).toBeVisible();
    await expect(page.getByTestId('stage-checklist')).toBeVisible();
    await expect(page.getByTestId('submit-button')).toBeVisible();
  });

  test('should have all stages pre-checked', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    const stageTypes = ['intake', 'queue', 'router', 'assessment', 'worklist', 'dispatch'];
    for (const type of stageTypes) {
      await expect(page.getByTestId(`stage-${type}`)).toBeChecked();
    }
  });

  test('should have team targets pre-checked', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await expect(page.getByTestId('team-TheATeam')).toBeChecked();
    await expect(page.getByTestId('team-TheFixer')).toBeChecked();
  });

  test('should show validation error when name is empty', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await page.getByTestId('input-description').fill('Some description');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-name')).toBeVisible();
  });

  test('should show validation error when description is empty', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await page.getByTestId('input-name').fill('Test Workflow');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-description')).toBeVisible();
  });

  test('should allow adding a routing rule', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await page.getByTestId('add-rule-button').click();
    await expect(page.getByTestId('routing-rule-0')).toBeVisible();
    await expect(page.getByTestId('rule-field-0')).toBeVisible();
    await expect(page.getByTestId('rule-operator-0')).toBeVisible();
    await expect(page.getByTestId('rule-path-0')).toBeVisible();
  });

  test('should allow removing a routing rule', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await page.getByTestId('add-rule-button').click();
    await expect(page.getByTestId('routing-rule-0')).toBeVisible();
    await page.getByTestId('remove-rule-0').click();
    await expect(page.getByTestId('routing-rule-0')).not.toBeVisible();
  });

  test('should display default assessment roles', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await expect(page.getByTestId('roles-list')).toBeVisible();
    await expect(page.getByTestId('role-pod-lead')).toBeVisible();
    await expect(page.getByTestId('role-requirements-reviewer')).toBeVisible();
    await expect(page.getByTestId('role-domain-expert')).toBeVisible();
    await expect(page.getByTestId('role-work-definer')).toBeVisible();
  });

  test('should submit form and navigate to detail page on success', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows/new');
    await page.getByTestId('input-name').fill('E2E Test Workflow');
    await page.getByTestId('input-description').fill('A workflow created during E2E testing');
    await page.getByTestId('submit-button').click();

    // Should navigate to the detail page
    await expect(page).toHaveURL(/\/workflows\/.+/, { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/workflows\/new/);
  });

  test('should have no console errors on create page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto('http://localhost:5173/workflows/new');
    await page.waitForTimeout(2000);
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('React Router') && !e.includes('Future Flag'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
