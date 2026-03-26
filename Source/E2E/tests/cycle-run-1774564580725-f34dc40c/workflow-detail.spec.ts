// Verifies: FR-WFD-008 — E2E tests for workflow detail page with flow diagram
import { test, expect } from '@playwright/test';

test.describe('Feature: Workflow Detail Page', () => {
  test('should navigate to default workflow detail page from list', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();
      await expect(page).toHaveURL(/\/workflows\/.+/);
    }
  });

  test('should display workflow detail page with heading and badges', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();

      await expect(page.getByTestId('workflow-detail-page')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByTestId('active-badge')).toBeVisible();
    }
  });

  test('should display flow diagram on detail page', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();

      await expect(page.getByTestId('workflow-detail-page')).toBeVisible({ timeout: 10000 });
      const diagramOrEmpty = page.locator('[data-testid="flow-diagram"], [data-testid="flow-diagram-empty"]');
      await expect(diagramOrEmpty.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display routing rules panel', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();

      await expect(page.getByTestId('workflow-detail-page')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('routing-rules-panel')).toBeVisible();
    }
  });

  test('should display assessment config panel', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();

      await expect(page.getByTestId('workflow-detail-page')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('assessment-config-panel')).toBeVisible();
      await expect(page.getByTestId('consensus-rule')).toBeVisible();
    }
  });

  test('should display team targets panel', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();

      await expect(page.getByTestId('workflow-detail-page')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('team-targets-panel')).toBeVisible();
    }
  });

  test('should have back link to workflows list', async ({ page }) => {
    await page.goto('http://localhost:5173/workflows');
    await page.waitForSelector('[data-testid="workflows-table"], [data-testid="empty-state"]', { timeout: 10000 });

    const table = page.getByTestId('workflows-table');
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();

      await expect(page.getByTestId('workflow-detail-page')).toBeVisible({ timeout: 10000 });
      const backLink = page.getByText('← Workflows');
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/\/workflows$/);
    }
  });
});
