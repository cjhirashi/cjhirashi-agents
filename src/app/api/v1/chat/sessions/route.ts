/**
 * POST /api/v1/chat/sessions - Create chat session
 * GET /api/v1/chat/sessions - List chat sessions
 *
 * Especificación: sys-docs/api/ENDPOINTS.md (líneas 448-545)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import logger from '@/lib/logging/logger';
import { CreateSessionSchema, ListSessionsSchema } from '@/lib/validations/chat';
import { requireAuth } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/ApiError';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/v1/chat/sessions
 *
 * Create a new chat session
 * Rate Limited: 5/min (FREE), 50/min (PRO), 500/min (ENTERPRISE)
 */
async function createSessionHandler(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;

    // 2. Parse request body
    const body = await request.json();

    // 3. Validate request
    const validated = CreateSessionSchema.parse(body);

    logger.info('Create session request', {
      userId,
      title: validated.title,
      agentIds: validated.agentIds
    });

    // 4. Create session (store title and agentIds in metadata)
    const session = await prisma.chat_sessions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        lastActivity: new Date(),
        metadata: {
          title: validated.title || 'New Chat',
          agentIds: validated.agentIds || []
        }
      }
    });

    logger.info('Session created successfully', {
      sessionId: session.id,
      userId
    });

    // 5. Response
    return NextResponse.json(
      {
        data: {
          id: session.id,
          title: validated.title || 'New Chat',
          userId: session.userId,
          agentIds: validated.agentIds || [],
          startedAt: session.startedAt.toISOString(),
          lastActivity: session.lastActivity.toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create session error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            statusCode: 400,
            timestamp: new Date().toISOString(),
            details: error.issues
          }
        },
        { status: 400 }
      );
    }

    // API errors
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString()
          }
        },
        { status: error.statusCode }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Export POST with rate limiting wrapper
 */
export const POST = createSessionHandler; // TODO: Re-enable rate limiting

/**
 * GET /api/v1/chat/sessions
 *
 * List user's chat sessions with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const validated = ListSessionsSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order')
    });

    logger.info('List sessions request', {
      userId,
      ...validated
    });

    // 3. Build orderBy
    const orderBy = {
      [validated.sortBy]: validated.order
    };

    // 4. Fetch sessions with pagination
    const [sessions, total] = await Promise.all([
      prisma.chat_sessions.findMany({
        where: {
          userId
        },
        skip: validated.offset,
        take: validated.limit,
        orderBy,
        include: {
          conversations: {
            include: {
              _count: {
                select: { messages: true }
              }
            }
          }
        }
      }),
      prisma.chat_sessions.count({
        where: { userId }
      })
    ]);

    // 5. Format response
    const formattedSessions = sessions.map((session) => {
        // Calculate total message count across all conversations
        const messageCount = session.conversations.reduce(
          (sum, conv) => sum + conv._count.messages,
          0
        );

        // Extract title from metadata
        const metadata = session.metadata as { title?: string } | null;
        const title = metadata?.title || 'Untitled Chat';

        return {
          id: session.id,
          title,
          messageCount,
          lastActivity: session.lastActivity.toISOString(),
          startedAt: session.startedAt.toISOString()
        };
      });

    logger.info('Sessions fetched successfully', {
      userId,
      count: sessions.length,
      total
    });

    // 6. Response
    return NextResponse.json({
      data: {
        sessions: formattedSessions,
        pagination: {
          total,
          limit: validated.limit,
          offset: validated.offset,
          hasMore: validated.offset + validated.limit < total
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });
  } catch (error) {
    logger.error('List sessions error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            statusCode: 400,
            timestamp: new Date().toISOString(),
            details: error.issues
          }
        },
        { status: 400 }
      );
    }

    // API errors
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString()
          }
        },
        { status: error.statusCode }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
