/**
 * Task Status Update API Endpoint
 *
 * PATCH /api/v1/tasks/[id]/status
 *
 * Specialized endpoint for updating task status and position
 * Optimized for Kanban drag & drop operations
 *
 * Related: Phase 7 - Tarea 3 (Task Management)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guards';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const StatusUpdateSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  position: z.number().int().min(0),
});

type StatusUpdateRequest = z.infer<typeof StatusUpdateSchema>;

// ═══════════════════════════════════════════════════════════
// PATCH HANDLER
// ═══════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const { id: taskId } = await params;

    logger.info('[Task Status API] Updating task status', { taskId, userId });

    // 2. Parse and validate request
    const body: unknown = await request.json();
    const validationResult = StatusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[Task Status API] Validation failed', {
        errors: validationResult.error.issues,
      });

      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { status: newStatus, position: newPosition } = validationResult.data;

    // 3. Fetch task
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      logger.warn('[Task Status API] Task not found', { taskId });

      return NextResponse.json(
        {
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    // 4. Verify ownership
    if (task.userId !== userId) {
      logger.warn('[Task Status API] Unauthorized access attempt', {
        taskId,
        userId,
        ownerId: task.userId,
      });

      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to update this task',
        },
        { status: 403 }
      );
    }

    // 5. Reorder tasks in the new column
    if (task.status !== newStatus || task.position !== newPosition) {
      // If moving to a different column, update positions in both columns
      if (task.status !== newStatus) {
        // Remove from old column (shift down tasks after this one)
        await prisma.tasks.updateMany({
          where: {
            userId,
            status: task.status,
            position: { gt: task.position },
          },
          data: {
            position: { decrement: 1 },
          },
        });

        // Make space in new column (shift up tasks at and after new position)
        await prisma.tasks.updateMany({
          where: {
            userId,
            status: newStatus,
            position: { gte: newPosition },
          },
          data: {
            position: { increment: 1 },
          },
        });
      } else {
        // Moving within same column
        if (newPosition < task.position) {
          // Moving up - shift down tasks between new and old position
          await prisma.tasks.updateMany({
            where: {
              userId,
              status: newStatus,
              position: { gte: newPosition, lt: task.position },
            },
            data: {
              position: { increment: 1 },
            },
          });
        } else if (newPosition > task.position) {
          // Moving down - shift up tasks between old and new position
          await prisma.tasks.updateMany({
            where: {
              userId,
              status: newStatus,
              position: { gt: task.position, lte: newPosition },
            },
            data: {
              position: { decrement: 1 },
            },
          });
        }
      }
    }

    // 6. Update the task itself
    const updatedTask = await prisma.tasks.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        position: newPosition,
      },
    });

    logger.info('[Task Status API] Task status updated', {
      taskId,
      userId,
      oldStatus: task.status,
      newStatus,
      newPosition,
    });

    // 7. Return updated task
    return NextResponse.json(
      {
        task: updatedTask,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to update tasks',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Task Status API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update task status',
      },
      { status: 500 }
    );
  }
}
