/**
 * GET /api/v1/chat/history/[sessionId]
 *
 * Get paginated message history for a chat session
 *
 * Especificación: sys-docs/api/ENDPOINTS.md (líneas 700-743)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import logger from '@/lib/logging/logger';
import { ApiError } from '@/lib/errors/ApiError';
import { HistoryQuerySchema } from '@/lib/validations/chat';
import { requireAuth, requireOwnership } from '@/lib/auth/guards';

/**
 * GET /api/v1/chat/history/[sessionId]
 *
 * Fetch paginated message history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 1. Require authentication
    await requireAuth();

    const { sessionId } = await params;

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const validated = HistoryQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      before: searchParams.get('before')
    });

    logger.info('Get chat history request', {
      sessionId,
      ...validated
    });

    // 3. Verify session exists and ownership
    const session = await prisma.chat_sessions.findFirst({
      where: {
        id: sessionId
      }
    });

    if (!session) {
      throw new ApiError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // 4. Check ownership (throws 403 if not owner or admin)
    await requireOwnership(session.userId);

    // 5. Build where clause
    const whereClause: Record<string, unknown> = {
      sessionId: sessionId
    };

    if (validated.before) {
      whereClause.createdAt = {
        lt: validated.before
      };
    }

    // 6. Fetch messages with pagination
    const [messages, total] = await Promise.all([
      prisma.messages.findMany({
        where: whereClause,
        skip: validated.offset,
        take: validated.limit,
        orderBy: { timestamp: 'asc' }
      }),
      prisma.messages.count({
        where: whereClause
      })
    ]);

    // 7. Format messages
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      tokensUsed: (msg.tokensInput || 0) + (msg.tokensOutput || 0),
      metadata: msg.metadata
    }));

    logger.info('Chat history fetched successfully', {
      sessionId,
      count: messages.length,
      total
    });

    // 8. Response
    return NextResponse.json({
      data: {
        messages: formattedMessages,
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
    logger.error('Get chat history error', {
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
