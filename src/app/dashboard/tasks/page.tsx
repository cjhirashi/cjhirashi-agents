'use client';

/**
 * Tasks Page
 *
 * Dashboard page for task management with Kanban board
 *
 * Features:
 * - Kanban board with drag & drop
 * - Create/Edit/Delete tasks
 * - Task stats
 * - Filters
 *
 * Related: Phase 7 - Tarea 3 (Task Management)
 */

import { useState } from 'react';
import { Plus, AlertCircle, ListTodo } from 'lucide-react';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import { Task } from '@/components/tasks/TaskCard';
import { useTasks } from '@/hooks/useTasks';

// ═══════════════════════════════════════════════════════════
// TASKS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

export default function TasksPage() {
  const {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useTasks();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  /**
   * Handle create task
   */
  const handleCreateTask = async () => {
    // Simple inline creation for demo
    const title = prompt('Enter task title:');
    if (!title) return;

    try {
      await createTask({ title, priority: 'MEDIUM' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  /**
   * Handle edit task
   */
  const handleEditTask = async (task: Task) => {
    const title = prompt('Enter new title:', task.title);
    if (!title || title === task.title) return;

    try {
      await updateTask(task.id, { title });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  /**
   * Handle delete task
   */
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  /**
   * Calculate stats
   */
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ListTodo className="text-blue-600" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Task Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Organize your work with Kanban board
              </p>
            </div>
          </div>

          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            New Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400">To Do</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              {stats.todo}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-blue-600 dark:text-blue-400">In Progress</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.inProgress}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 shadow-sm">
            <div className="text-sm text-green-600 dark:text-green-400">Done</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.done}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        /* Kanban Board */
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={tasks}
            onTaskMove={moveTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          💡 Kanban Tips
        </h3>
        <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
          <li>• Drag tasks between columns to update their status</li>
          <li>• Click edit icon to modify task details</li>
          <li>• Use priority levels to organize important work</li>
          <li>• Add tags to categorize related tasks</li>
        </ul>
      </div>
    </div>
  );
}
