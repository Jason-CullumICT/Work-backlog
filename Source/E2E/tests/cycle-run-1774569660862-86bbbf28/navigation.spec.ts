// Verifies: FR-CB-012, FR-CB-013 — Navigation includes Features and Learnings links
import { test, expect } from '@playwright/test';

test.describe('Feature: Navigation for Callback Pages', () => {
  test('should show Features link in navigation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Features' })).toBeVisible();
  });

  test('should show Learnings link in navigation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const nav = page.getByTestId('main-nav');
    await expect(nav.getByRole('link', { name: 'Learnings' })).toBeVisible();
  });

  test('should navigate through all new pages without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Dashboard (with Active Cycles)
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Features page
    await page.getByRole('link', { name: 'Features' }).click();
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();

    // Learnings page
    await page.getByRole('link', { name: 'Learnings' }).click();
    await expect(page.getByRole('heading', { name: 'Learnings' })).toBeVisible();

    // Back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    const realErrors = errors.filter((e) => !e.includes('React Router'));
    expect(realErrors).toHaveLength(0);
  });

  test('should highlight active nav link', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    const featuresLink = page.getByTestId('main-nav').getByRole('link', { name: 'Features' });
    await expect(featuresLink).toBeVisible();
    await expect(featuresLink).toHaveCSS('font-weight', '600');
  });
});
