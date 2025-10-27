/**
 * Single Task API Endpoint
 *
 * GET /api/v1/tasks/[id] - Get task by ID
 * PATCH /api/v1/tasks/[id] - Update task
 * DELETE /api/v1/tasks/[id] - Delete task
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

const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

type TaskUpdateRequest = z.infer<typeof TaskUpdateSchema>;

// ═══════════════════════════════════════════════════════════
// GET HANDLER - Get Task by ID
// ═══════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const { id: taskId } = await params;

    logger.info('[Task API] Fetching task', { taskId, userId });

    // 2. Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      logger.warn('[Task API] Task not found', { taskId });

      return NextResponse.json(
        {
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    // 3. Verify ownership
    if (task.userId !== userId) {
      logger.warn('[Task API] Unauthorized access attempt', {
        taskId,
        userId,
        ownerId: task.userId,
      });

      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to access this task',
        },
        { status: 403 }
      );
    }

    // 4. Return task
    return NextResponse.json(
      {
        task,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to view tasks',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Task API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch task',
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// PATCH HANDLER - Update Task
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

    logger.info('[Task API] Updating task', { taskId, userId });

    // 2. Parse and validate request
    const body: unknown = await request.json();
    const validationResult = TaskUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[Task API] Validation failed', {
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

    const updates = validationResult.data;

    // 3. Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      logger.warn('[Task API] Task not found', { taskId });

      return NextResponse.json(
        {
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    // 4. Verify ownership
    if (task.userId !== userId) {
      logger.warn('[Task API] Unauthorized access attempt', {
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

    // 5. Update task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...updates,
        dueDate:
          updates.dueDate !== undefined
            ? updates.dueDate
              ? new Date(updates.dueDate)
              : null
            : undefined,
      },
    });

    logger.info('[Task API] Task updated', { taskId, userId });

    // 6. Return updated task
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
    logger.error('[Task API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update task',
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// DELETE HANDLER - Delete Task
// ═══════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const { id: taskId } = await params;

    logger.info('[Task API] Deleting task', { taskId, userId });

    // 2. Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      logger.warn('[Task API] Task not found', { taskId });

      return NextResponse.json(
        {
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    // 3. Verify ownership
    if (task.userId !== userId) {
      logger.warn('[Task API] Unauthorized access attempt', {
        taskId,
        userId,
        ownerId: task.userId,
      });

      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to delete this task',
        },
        { status: 403 }
      );
    }

    // 4. Delete task
    await prisma.task.delete({
      where: { id: taskId },
    });

    logger.info('[Task API] Task deleted', { taskId, userId });

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Task deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to delete tasks',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Task API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete task',
      },
      { status: 500 }
    );
  }
}
