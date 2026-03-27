// Verifies: FR-CB-014 — Active Cycles Dashboard Section E2E tests
import { test, expect } from '@playwright/test';

test.describe('Feature: Active Cycles on Dashboard', () => {
  test('should render the dashboard page with heading', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should display active cycles section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const activeCycles = page.getByTestId('active-cycles');
    await expect(activeCycles).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active Cycles' })).toBeVisible();
  });

  test('should show active cycles section above summary section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const activeCycles = page.getByTestId('active-cycles');
    const summaryCards = page.getByTestId('summary-cards');
    await expect(activeCycles).toBeVisible();
    await expect(summaryCards).toBeVisible();

    // Active cycles should appear before summary in DOM order
    const activeCyclesBox = await activeCycles.boundingBox();
    const summaryBox = await summaryCards.boundingBox();
    if (activeCyclesBox && summaryBox) {
      expect(activeCyclesBox.y).toBeLessThan(summaryBox.y);
    }
  });

  test('should show "No active cycles" when none exist', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // When no cycles are running, should show empty message
    await expect(page.getByText('No active cycles.')).toBeVisible();
  });

  test('should have a refresh button on dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('refresh-button')).toBeVisible();
  });

  test('should display all dashboard sections', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('active-cycles')).toBeVisible();
    await expect(page.getByTestId('summary-cards')).toBeVisible();
    await expect(page.getByTestId('team-workload')).toBeVisible();
    await expect(page.getByTestId('priority-distribution')).toBeVisible();
    await expect(page.getByTestId('queue-breakdown')).toBeVisible();
    await expect(page.getByTestId('activity-feed')).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes('React Router'))).toHaveLength(0);
  });
});
