/**
 * useTasks Hook Unit Tests
 *
 * Tests for the task management React hook
 *
 * Related: Phase 7 - Tarea 4 (Unit Testing Suite)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTasks } from '@/hooks/useTasks';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useTasks Hook', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State and Fetching', () => {
    it('should start with loading state', () => {
      // Mock fetch to never resolve (to keep loading state)
      mockFetch.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useTasks());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.tasks).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch tasks on mount', async () => {
      const mockTasks = {
        tasks: [
          {
            id: 'task-1',
            title: 'Test Task',
            status: 'TODO',
            priority: 'MEDIUM',
            tags: [],
            position: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('Test Task');
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.error).toBeTruthy();
    });

    it('should parse date fields correctly', async () => {
      const dueDate = new Date('2025-12-31');
      const mockTasks = {
        tasks: [
          {
            id: 'task-1',
            title: 'Task with dates',
            status: 'TODO',
            priority: 'HIGH',
            tags: [],
            position: 0,
            dueDate: dueDate.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks[0].dueDate).toBeInstanceOf(Date);
      expect(result.current.tasks[0].createdAt).toBeInstanceOf(Date);
      expect(result.current.tasks[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newTask = {
        id: 'task-new',
        title: 'New Task',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create task fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task: newTask }),
      });

      await act(async () => {
        await result.current.createTask({
          title: 'New Task',
          priority: 'MEDIUM',
        });
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('New Task');
      expect(result.current.error).toBeNull();
    });

    it('should handle create error', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create task fetch (fails)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation error' }),
      });

      await act(async () => {
        try {
          await result.current.createTask({ title: '' }); // Invalid
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.error).toBeTruthy();
    });

    it('should send date as ISO string', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const dueDate = new Date('2025-12-31');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          task: {
            id: 'task-1',
            title: 'Task',
            status: 'TODO',
            priority: 'HIGH',
            tags: [],
            position: 0,
            dueDate: dueDate.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });

      await act(async () => {
        await result.current.createTask({
          title: 'Task',
          dueDate,
        });
      });

      // Verify fetch was called with ISO string
      const fetchCall = mockFetch.mock.calls[1];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.dueDate).toBe(dueDate.toISOString());
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Original Title',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [existingTask] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedTask = {
        ...existingTask,
        title: 'Updated Title',
      };

      // Update task fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task: updatedTask }),
      });

      await act(async () => {
        await result.current.updateTask('task-1', { title: 'Updated Title' });
      });

      expect(result.current.tasks[0].title).toBe('Updated Title');
      expect(result.current.error).toBeNull();
    });

    it('should handle update error', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [existingTask] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update task fetch (fails)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' }),
      });

      await act(async () => {
        try {
          await result.current.updateTask('task-1', { title: 'New Title' });
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.tasks[0].title).toBe('Task'); // Unchanged
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task1 = {
        id: 'task-1',
        title: 'Task 1',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const task2 = {
        id: 'task-2',
        title: 'Task 2',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [task1, task2] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(2);

      // Delete task fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.deleteTask('task-1');
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('task-2');
      expect(result.current.error).toBeNull();
    });

    it('should handle delete error', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [existingTask] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Delete task fetch (fails)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Forbidden' }),
      });

      await act(async () => {
        try {
          await result.current.deleteTask('task-1');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.tasks).toHaveLength(1); // Still there
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('moveTask', () => {
    it('should move a task and refresh', async () => {
      const task = {
        id: 'task-1',
        title: 'Task',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [task] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const movedTask = {
        ...task,
        status: 'IN_PROGRESS',
        position: 0,
      };

      // Move task fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task: movedTask }),
      });

      // Refresh fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [movedTask] }),
      });

      await act(async () => {
        await result.current.moveTask('task-1', 'IN_PROGRESS', 0);
      });

      expect(result.current.tasks[0].status).toBe('IN_PROGRESS');
      expect(result.current.error).toBeNull();
    });

    it('should handle move error', async () => {
      const task = {
        id: 'task-1',
        title: 'Task',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: [],
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [task] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Move task fetch (fails)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid status' }),
      });

      await act(async () => {
        try {
          await result.current.moveTask('task-1', 'INVALID' as any, 0);
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('refreshTasks', () => {
    it('should refresh tasks', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      const { result } = renderHook(() => useTasks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newTasks = {
        tasks: [
          {
            id: 'task-1',
            title: 'New Task',
            status: 'TODO',
            priority: 'HIGH',
            tags: [],
            position: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      // Refresh fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTasks,
      });

      await act(async () => {
        await result.current.refreshTasks();
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('New Task');
    });
  });
});
