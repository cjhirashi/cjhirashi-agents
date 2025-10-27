'use client';

/**
 * KanbanColumn Component
 *
 * Droppable column for Kanban board
 * Contains TaskCard components
 *
 * Related: Phase 7 - Tarea 3 (Task Management)
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import TaskCard, { Task } from './TaskCard';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type ColumnStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

interface KanbanColumnProps {
  id: ColumnStatus;
  title: string;
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// COLUMN STYLES
// ═══════════════════════════════════════════════════════════

const COLUMN_STYLES = {
  TODO: {
    icon: Circle,
    bg: 'bg-gray-100 dark:bg-gray-800',
    headerBg: 'bg-gray-200 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
  },
  IN_PROGRESS: {
    icon: Clock,
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    headerBg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  DONE: {
    icon: CheckCircle2,
    bg: 'bg-green-50 dark:bg-green-900/10',
    headerBg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
  },
};

// ═══════════════════════════════════════════════════════════
// KANBAN COLUMN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function KanbanColumn({
  id,
  title,
  tasks,
  onEditTask,
  onDeleteTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const columnStyle = COLUMN_STYLES[id];
  const Icon = columnStyle.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full rounded-xl ${columnStyle.bg} ${
        isOver ? 'ring-2 ring-blue-500' : ''
      } transition-all`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${columnStyle.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <Icon size={20} className={columnStyle.text} />
          <h3 className={`font-semibold ${columnStyle.text}`}>{title}</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${columnStyle.headerBg} ${columnStyle.text}`}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-600 text-sm">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
