/**
 * Tasks API Endpoint
 *
 * POST /api/v1/tasks - Create new task
 * GET /api/v1/tasks - List user's tasks
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

const TaskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().datetime().optional(),
});

type TaskCreateRequest = z.infer<typeof TaskCreateSchema>;

// ═══════════════════════════════════════════════════════════
// POST HANDLER - Create Task
// ═══════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;

    logger.info('[Tasks API] Creating task', { userId });

    // 2. Parse and validate request
    const body: unknown = await request.json();
    const validationResult = TaskCreateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[Tasks API] Validation failed', {
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

    const { title, description, status, priority, tags, dueDate } =
      validationResult.data;

    // 3. Get current max position for the status column
    const maxPositionTask = await prisma.tasks.findFirst({
      where: { userId, status },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = (maxPositionTask?.position ?? -1) + 1;

    // 4. Create task
    const task = await prisma.tasks.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        title,
        description,
        status,
        priority,
        tags,
        dueDate: dueDate ? new Date(dueDate) : null,
        position,
        updatedAt: new Date(),
      },
    });

    logger.info('[Tasks API] Task created', { taskId: task.id, userId });

    // 5. Return response
    return NextResponse.json(
      {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          tags: task.tags,
          dueDate: task.dueDate,
          position: task.position,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to create tasks',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Tasks API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create task',
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// GET HANDLER - List Tasks
// ═══════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    logger.info('[Tasks API] Fetching tasks', {
      userId,
      status,
      priority,
      search,
      tags,
    });

    // 3. Build where clause
    const where: Record<string, unknown> = { userId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // 4. Fetch tasks
    const tasks = await prisma.tasks.findMany({
      where,
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });

    logger.info('[Tasks API] Tasks fetched', {
      userId,
      count: tasks.length,
    });

    // 5. Group by status for Kanban board
    const grouped = {
      TODO: tasks.filter((t) => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      DONE: tasks.filter((t) => t.status === 'DONE'),
    };

    // 6. Return response
    return NextResponse.json(
      {
        tasks,
        grouped,
        stats: {
          total: tasks.length,
          todo: grouped.TODO.length,
          inProgress: grouped.IN_PROGRESS.length,
          done: grouped.DONE.length,
        },
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
    logger.error('[Tasks API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch tasks',
      },
      { status: 500 }
    );
  }
}
