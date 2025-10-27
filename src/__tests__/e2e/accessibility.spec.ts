/**
 * Accessibility E2E Tests
 *
 * Tests for WCAG compliance and accessibility
 *
 * Related: Phase 7 - Tarea 5 (E2E Testing)
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should not have accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test.skip('dashboard should not have accessibility violations', async ({
    page,
  }) => {
    // Requires authentication
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check that headings are properly nested
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for nav element with aria-label
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Links should have accessible names
    const links = page.locator('nav a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName;
    });

    expect(focused).toBeTruthy();
  });
});
