/**
 * useTasks Hook
 *
 * React hook for task management
 * Manages tasks state, CRUD operations, and API calls
 *
 * Related: Phase 7 - Tarea 3 (Task Management)
 */

import { useState, useCallback, useEffect } from 'react';
import { Task } from '@/components/tasks/TaskCard';
import { ColumnStatus } from '@/components/tasks/KanbanColumn';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  createTask: (data: CreateTaskData) => Promise<void>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, newStatus: ColumnStatus, newPosition: number) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

interface CreateTaskData {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
  dueDate?: Date;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: ColumnStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
  dueDate?: Date | null;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tasks
   */
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/tasks');

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();

      // Parse dates
      const parsedTasks = data.tasks.map((task: Task) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      }));

      setTasks(parsedTasks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create task
   */
  const createTask = useCallback(
    async (data: CreateTaskData) => {
      try {
        setError(null);

        const response = await fetch('/api/v1/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            dueDate: data.dueDate?.toISOString(),
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || responseData.error || 'Failed to create task');
        }

        // Add new task to state
        const newTask = {
          ...responseData.task,
          dueDate: responseData.task.dueDate ? new Date(responseData.task.dueDate) : null,
          createdAt: new Date(responseData.task.createdAt),
          updatedAt: new Date(responseData.task.updatedAt),
        };

        setTasks((prev) => [...prev, newTask]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to create task:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Update task
   */
  const updateTask = useCallback(async (id: string, data: UpdateTaskData) => {
    try {
      setError(null);

      const response = await fetch(`/api/v1/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate === undefined ? undefined : data.dueDate?.toISOString() || null,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to update task');
      }

      // Update task in state
      const updatedTask = {
        ...responseData.task,
        dueDate: responseData.task.dueDate ? new Date(responseData.task.dueDate) : null,
        createdAt: new Date(responseData.task.createdAt),
        updatedAt: new Date(responseData.task.updatedAt),
      };

      setTasks((prev) => prev.map((task) => (task.id === id ? updatedTask : task)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to update task:', err);
      throw err;
    }
  }, []);

  /**
   * Delete task
   */
  const deleteTask = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/v1/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to delete task');
      }

      // Remove from state
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to delete task:', err);
      throw err;
    }
  }, []);

  /**
   * Move task (drag & drop)
   */
  const moveTask = useCallback(
    async (id: string, newStatus: ColumnStatus, newPosition: number) => {
      try {
        setError(null);

        const response = await fetch(`/api/v1/tasks/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            position: newPosition,
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.message || responseData.error || 'Failed to move task');
        }

        // Refresh all tasks to get updated positions
        await fetchTasks();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to move task:', err);
        throw err;
      }
    },
    [fetchTasks]
  );

  /**
   * Refresh tasks
   */
  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  /**
   * Load tasks on mount
   */
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    refreshTasks,
  };
}
