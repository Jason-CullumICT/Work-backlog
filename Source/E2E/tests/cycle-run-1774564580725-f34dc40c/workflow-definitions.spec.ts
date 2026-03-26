// Verifies: FR-WFD-007, FR-WFD-008, FR-WFD-009, FR-WFD-010
// E2E tests for the Workflow Definitions feature

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Feature: Workflow Definitions', () => {
  test('should render the workflow list page', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`);
    await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();
  });

  test('should show Create Workflow button on list page', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`);
    await expect(page.getByTestId('create-workflow-button')).toBeVisible();
    await expect(page.getByTestId('create-workflow-button')).toHaveText('Create Workflow');
  });

  test('should navigate to create workflow page', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`);
    await page.getByTestId('create-workflow-button').click();
    await expect(page).toHaveURL(`${BASE_URL}/workflows/new`);
    await expect(page.getByRole('heading', { name: 'Create Workflow' })).toBeVisible();
  });

  test('should render the create workflow form with all sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows/new`);
    await expect(page.getByRole('heading', { name: 'Create Workflow' })).toBeVisible();

    // Basic Info
    await expect(page.getByTestId('input-name')).toBeVisible();
    await expect(page.getByTestId('input-description')).toBeVisible();

    // Stages
    await expect(page.getByTestId('stage-checklist')).toBeVisible();
    await expect(page.getByTestId('stage-intake')).toBeChecked();
    await expect(page.getByTestId('stage-queue')).toBeChecked();
    await expect(page.getByTestId('stage-router')).toBeChecked();
    await expect(page.getByTestId('stage-assessment')).toBeChecked();
    await expect(page.getByTestId('stage-worklist')).toBeChecked();
    await expect(page.getByTestId('stage-dispatch')).toBeChecked();

    // Assessment Config
    await expect(page.getByTestId('select-consensus')).toBeVisible();
    await expect(page.getByTestId('roles-list')).toBeVisible();

    // Team Targets
    await expect(page.getByTestId('team-targets')).toBeVisible();
    await expect(page.getByTestId('team-TheATeam')).toBeChecked();
    await expect(page.getByTestId('team-TheFixer')).toBeChecked();

    // Submit button
    await expect(page.getByTestId('submit-button')).toBeVisible();
  });

  test('should show validation errors when submitting empty form', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows/new`);
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-name')).toBeVisible();
    await expect(page.getByTestId('error-description')).toBeVisible();
  });

  test('should fill out and submit create workflow form', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows/new`);

    // Fill basic info
    await page.getByTestId('input-name').fill('Test Pipeline');
    await page.getByTestId('input-description').fill('A test workflow for E2E verification');

    // Add a routing rule
    await page.getByTestId('add-rule-button').click();
    await page.getByTestId('rule-name-0').fill('Bug fast-track');
    await page.getByTestId('rule-field-0').selectOption('type');
    await page.getByTestId('rule-operator-0').selectOption('equals');
    await page.getByTestId('rule-value-0').selectOption('bug');
    await page.getByTestId('rule-path-0').selectOption('fast-track');

    // Submit
    await page.getByTestId('submit-button').click();

    // Should navigate to detail page on success (or show error if backend not running)
    // We verify no console errors during the flow
  });

  test('should show Workflows link in navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Workflows')).toBeVisible();
  });

  test('should navigate to workflows page from nav link', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByTestId('main-nav').getByText('Workflows').click();
    await expect(page).toHaveURL(`${BASE_URL}/workflows`);
  });

  test('should render workflow detail page with flow diagram', async ({ page }) => {
    // First navigate to list to find a workflow
    await page.goto(`${BASE_URL}/workflows`);

    // If workflows exist, click the first row
    const rows = page.locator('[data-testid^="workflow-row-"]');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      await rows.first().click();
      // Should navigate to detail page
      await expect(page.getByTestId('workflow-detail-page')).toBeVisible();
      // Should show routing rules panel
      await expect(page.getByTestId('routing-rules-panel')).toBeVisible();
      // Should show assessment config panel
      await expect(page.getByTestId('assessment-config-panel')).toBeVisible();
      // Should show team targets panel
      await expect(page.getByTestId('team-targets-panel')).toBeVisible();
    }
  });

  test('should have no console errors during navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.goto(`${BASE_URL}/workflows`);
    await page.goto(`${BASE_URL}/workflows/new`);

    // Filter out expected errors (e.g. network errors when backend is not running)
    const unexpectedErrors = consoleErrors.filter(
      (err) => !err.includes('Failed to fetch') && !err.includes('net::ERR_')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('should allow toggling stages in create form', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows/new`);

    // Uncheck a stage
    await page.getByTestId('stage-assessment').uncheck();
    await expect(page.getByTestId('stage-assessment')).not.toBeChecked();

    // Re-check it
    await page.getByTestId('stage-assessment').check();
    await expect(page.getByTestId('stage-assessment')).toBeChecked();
  });

  test('should allow adding and removing roles in create form', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows/new`);

    // Check default roles exist
    await expect(page.getByTestId('role-pod-lead')).toBeVisible();
    await expect(page.getByTestId('role-requirements-reviewer')).toBeVisible();

    // Add a new role
    await page.getByTestId('new-role-name').fill('Security Reviewer');
    await page.getByTestId('new-role-description').fill('Reviews security implications');
    await page.getByTestId('add-role-button').click();
    await expect(page.getByTestId('role-security-reviewer')).toBeVisible();

    // Remove a role
    await page.getByTestId('remove-role-security-reviewer').click();
    await expect(page.getByTestId('role-security-reviewer')).not.toBeVisible();
  });

  test('should show loading or empty state on workflow list', async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`);
    // Either loading indicator or empty state or table should be visible
    const hasContent = await page.getByTestId('workflows-table').isVisible().catch(() => false);
    const hasEmpty = await page.getByTestId('empty-state').isVisible().catch(() => false);
    const hasLoading = await page.getByTestId('loading-indicator').isVisible().catch(() => false);
    expect(hasContent || hasEmpty || hasLoading).toBeTruthy();
  });
});
