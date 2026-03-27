// Verifies: FR-CB-014 — E2E tests for Active Cycles section on Dashboard
import { test, expect } from '@playwright/test';

test.describe('Feature: Active Cycles on Dashboard', () => {
  test('should render the dashboard with Active Cycles section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('active-cycles')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active Cycles' })).toBeVisible();
  });

  test('should show empty state when no active cycles', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByText('No active cycles.')).toBeVisible();
  });

  test('should display active cycle after creating one via API', async ({ page }) => {
    // Create a cycle via the backend API
    const cycleData = {
      workItemId: 'test-wi-dashboard-001',
      team: 'TheATeam',
      branch: 'cycle/e2e-dashboard-test',
    };

    const response = await page.request.post('http://localhost:3001/api/cycles', {
      data: cycleData,
    });
    expect(response.status()).toBe(201);
    const cycle = await response.json();

    // Navigate to dashboard and verify cycle card appears
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId(`cycle-card-${cycle.id}`)).toBeVisible();
    await expect(page.getByText('TheATeam')).toBeVisible();
    await expect(page.getByText('cycle/e2e-dashboard-test')).toBeVisible();
  });

  test('should show Active Cycles section above Summary section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const activeCycles = page.getByTestId('active-cycles');
    const summary = page.getByTestId('summary-cards');

    await expect(activeCycles).toBeVisible();
    await expect(summary).toBeVisible();

    // Active cycles should appear before summary in DOM order
    const activeCyclesBox = await activeCycles.boundingBox();
    const summaryBox = await summary.boundingBox();
    if (activeCyclesBox && summaryBox) {
      expect(activeCyclesBox.y).toBeLessThan(summaryBox.y);
    }
  });

  test('should link cycle card to work item page', async ({ page }) => {
    // Create a cycle
    const cycleData = {
      workItemId: 'test-wi-link-001',
      team: 'TheFixer',
      branch: 'cycle/link-test',
    };

    const response = await page.request.post('http://localhost:3001/api/cycles', {
      data: cycleData,
    });
    expect(response.status()).toBe(201);
    const cycle = await response.json();

    await page.goto('http://localhost:5173/');
    const card = page.getByTestId(`cycle-card-${cycle.id}`);
    await expect(card).toBeVisible();

    // Verify the card is wrapped in a link to the work item
    const link = card.locator('xpath=ancestor::a');
    await expect(link).toHaveAttribute('href', `/work-items/${cycleData.workItemId}`);
  });

  test('should have no console errors on dashboard', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    expect(consoleErrors).toEqual([]);
  });
});
