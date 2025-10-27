'use client';

/**
 * KanbanBoard Component
 *
 * Main Kanban board with drag & drop functionality
 * Uses @dnd-kit for drag and drop
 *
 * Related: Phase 7 - Tarea 3 (Task Management)
 */

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import KanbanColumn, { ColumnStatus } from './KanbanColumn';
import TaskCard, { Task } from './TaskCard';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: ColumnStatus, newPosition: number) => Promise<void>;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════

const COLUMNS = [
  { id: 'TODO' as ColumnStatus, title: 'To Do' },
  { id: 'IN_PROGRESS' as ColumnStatus, title: 'In Progress' },
  { id: 'DONE' as ColumnStatus, title: 'Done' },
];

// ═══════════════════════════════════════════════════════════
// KANBAN BOARD COMPONENT
// ═══════════════════════════════════════════════════════════

export default function KanbanBoard({
  tasks,
  onTaskMove,
  onEditTask,
  onDeleteTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement to start drag
      },
    })
  );

  /**
   * Group tasks by status
   */
  const groupedTasks = {
    TODO: tasks
      .filter((t) => t.status === 'TODO')
      .sort((a, b) => a.position - b.position),
    IN_PROGRESS: tasks
      .filter((t) => t.status === 'IN_PROGRESS')
      .sort((a, b) => a.position - b.position),
    DONE: tasks
      .filter((t) => t.status === 'DONE')
      .sort((a, b) => a.position - b.position),
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  /**
   * Handle drag over (visual feedback)
   */
  const handleDragOver = (event: DragOverEvent) => {
    // Could add visual feedback here if needed
  };

  /**
   * Handle drag end (update task position)
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return;

    // Determine new status and position
    let newStatus = task.status;
    let newPosition = task.position;

    // Check if dropped over a column
    const overColumn = COLUMNS.find((col) => col.id === over.id);
    if (overColumn) {
      newStatus = overColumn.id;
      // Add to end of column
      const columnTasks = groupedTasks[newStatus];
      newPosition = columnTasks.length;
    } else {
      // Dropped over another task
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
        newPosition = overTask.position;
      }
    }

    // Only update if position or status changed
    if (newStatus !== task.status || newPosition !== task.position) {
      try {
        await onTaskMove(taskId, newStatus, newPosition);
      } catch (error) {
        console.error('Failed to move task:', error);
        // Could show error toast here
      }
    }
  };

  /**
   * Handle drag cancel
   */
  const handleDragCancel = () => {
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={groupedTasks[column.id]}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-50 rotate-3 scale-105">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
