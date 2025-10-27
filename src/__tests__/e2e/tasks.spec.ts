/**
 * Task Management E2E Tests
 *
 * Tests for Kanban board and task CRUD operations
 *
 * Related: Phase 7 - Tarea 5 (E2E Testing)
 */

import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.skip('should display Kanban board', async ({ page }) => {
    // Requires authentication
    await page.goto('/dashboard/tasks');

    // Check for Kanban columns
    const columns = page.locator('[data-column]');
    await expect(columns).toHaveCount(3); // TODO, IN_PROGRESS, DONE
  });

  test.skip('should create a new task', async ({ page }) => {
    // Requires authentication
    await page.goto('/dashboard/tasks');

    // Click "New Task" button
    await page.click('button:has-text("New Task")');

    // Fill in task details (adjust based on your UI)
    await page.fill('input[name="title"]', 'Test Task from E2E');
    await page.selectOption('select[name="priority"]', 'HIGH');

    // Submit form
    await page.click('button[type="submit"]');

    // Check task was created
    await expect(page.locator('text=Test Task from E2E')).toBeVisible();
  });

  test.skip('should drag task between columns', async ({ page }) => {
    // Requires authentication and existing task
    await page.goto('/dashboard/tasks');

    // Get first task card
    const taskCard = page.locator('[data-testid="task-card"]').first();

    // Get IN_PROGRESS column
    const inProgressColumn = page.locator('[data-column="IN_PROGRESS"]');

    // Drag and drop
    await taskCard.dragTo(inProgressColumn);

    // Verify task moved
    await expect(inProgressColumn.locator('[data-testid="task-card"]')).toHaveCount(1);
  });

  test.skip('should delete a task', async ({ page }) => {
    // Requires authentication and existing task
    await page.goto('/dashboard/tasks');

    const taskCard = page.locator('[data-testid="task-card"]').first();
    const taskTitle = await taskCard.locator('.task-title').textContent();

    // Click delete button
    await taskCard.locator('button[aria-label="Delete task"]').click();

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify task was deleted
    await expect(page.locator(`text=${taskTitle}`)).not.toBeVisible();
  });

  test.skip('should edit task details', async ({ page }) => {
    // Requires authentication and existing task
    await page.goto('/dashboard/tasks');

    const taskCard = page.locator('[data-testid="task-card"]').first();

    // Click edit button
    await taskCard.locator('button[aria-label="Edit task"]').click();

    // Update title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.fill('Updated Task Title');

    // Save changes
    await page.click('button:has-text("Save")');

    // Verify task was updated
    await expect(page.locator('text=Updated Task Title')).toBeVisible();
  });
});
