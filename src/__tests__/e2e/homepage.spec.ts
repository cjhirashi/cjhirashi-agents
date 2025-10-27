/**
 * Homepage E2E Tests
 *
 * Tests for homepage navigation and basic UI
 *
 * Related: Phase 7 - Tarea 5 (E2E Testing)
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check that page loaded (accept either "cjhirashi-agents" or "cjhirashi agents")
    await expect(page).toHaveTitle(/cjhirashi[\s-]?agents/i);
  });

  test('should have navigation', async ({ page }) => {
    await page.goto('/');

    // Check for navigation elements (adjust selectors based on actual UI)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page).toHaveTitle(/cjhirashi[\s-]?agents/i);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await expect(page).toHaveTitle(/cjhirashi[\s-]?agents/i);
  });
});
