import { test, expect } from '@playwright/test';

test.describe('Feature: Dashboard Page', () => {
  test('should render the dashboard page with heading', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should display navigation bar with all links', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Workflow Engine')).toBeVisible();
    await expect(nav.getByText('Dashboard')).toBeVisible();
    await expect(nav.getByText('Work Items')).toBeVisible();
    await expect(nav.getByText('Create Item')).toBeVisible();
  });

  test('should display summary cards section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('summary-cards')).toBeVisible();
    await expect(page.getByText('Total Items')).toBeVisible();
  });

  test('should display team workload section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('team-workload')).toBeVisible();
    await expect(page.getByText('Team Workload')).toBeVisible();
  });

  test('should display priority distribution section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('priority-distribution')).toBeVisible();
    await expect(page.getByText('Priority Distribution')).toBeVisible();
  });

  test('should display queue breakdown section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('queue-breakdown')).toBeVisible();
    await expect(page.getByText('Queue Breakdown')).toBeVisible();
  });

  test('should display recent activity section', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByTestId('activity-feed')).toBeVisible();
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('should have a working refresh button', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const refreshButton = page.getByTestId('refresh-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    // After refresh, dashboard should still be visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
