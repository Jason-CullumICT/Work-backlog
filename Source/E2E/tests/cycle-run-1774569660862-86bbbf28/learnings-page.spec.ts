// Verifies: FR-CB-013 — Learnings Page E2E tests
import { test, expect } from '@playwright/test';

test.describe('Feature: Learnings Page', () => {
  test('should render the learnings page with heading', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    await expect(page.getByRole('heading', { name: 'Learnings' })).toBeVisible();
  });

  test('should display filter controls for team and role', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    const filterControls = page.getByTestId('filter-controls');
    await expect(filterControls).toBeVisible();
    await expect(page.getByLabel('Filter by team')).toBeVisible();
    await expect(page.getByLabel('Filter by role')).toBeVisible();
  });

  test('should have team filter options', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    const teamSelect = page.getByLabel('Filter by team');
    await expect(teamSelect).toBeVisible();
    await expect(teamSelect.getByRole('option', { name: 'All Teams' })).toBeAttached();
    await expect(teamSelect.getByRole('option', { name: 'TheATeam' })).toBeAttached();
    await expect(teamSelect.getByRole('option', { name: 'TheFixer' })).toBeAttached();
  });

  test('should have role filter options', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    const roleSelect = page.getByLabel('Filter by role');
    await expect(roleSelect).toBeVisible();
    await expect(roleSelect.getByRole('option', { name: 'All Roles' })).toBeAttached();
    await expect(roleSelect.getByRole('option', { name: 'backend-coder' })).toBeAttached();
    await expect(roleSelect.getByRole('option', { name: 'frontend-coder' })).toBeAttached();
  });

  test('should show empty state when no learnings exist', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    await expect(page.getByText('No learnings found')).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    const paginationControls = page.getByTestId('pagination-controls');
    await expect(paginationControls).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('should have a refresh button', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('should navigate to learnings page from navigation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByRole('link', { name: 'Learnings' }).click();
    await expect(page).toHaveURL('http://localhost:5173/learnings');
    await expect(page.getByRole('heading', { name: 'Learnings' })).toBeVisible();
  });

  test('should filter by team selection', async ({ page }) => {
    await page.goto('http://localhost:5173/learnings');
    await page.getByLabel('Filter by team').selectOption('TheATeam');
    await expect(page.getByTestId('pagination-controls')).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/learnings');
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes('React Router'))).toHaveLength(0);
  });
});
