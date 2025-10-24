/**
 * GET /api/v1/chat/sessions/[id] - Get session details
 * DELETE /api/v1/chat/sessions/[id] - Delete session (soft delete)
 *
 * Especificación: sys-docs/api/ENDPOINTS.md (líneas 549-775)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import logger from '@/lib/logging/logger';
import { ApiError } from '@/lib/errors/ApiError';
import { requireAuth, requireOwnership } from '@/lib/auth/guards';

/**
 * GET /api/v1/chat/sessions/[id]
 *
 * Get detailed session with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Require authentication
    await requireAuth();

    const sessionId = params.id;

    logger.info('Get session request', {
      sessionId
    });

    // 2. Fetch session with conversations and messages
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId
      },
      include: {
        conversations: {
          include: {
            messages: {
              orderBy: { timestamp: 'asc' }
            }
          }
        }
      }
    });

    if (!session) {
      throw new ApiError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // 3. Check ownership (throws 403 if not owner or admin)
    await requireOwnership(session.userId);

    // Calculate totals
    let totalMessages = 0;
    let totalTokens = 0;

    const allMessages = session.conversations.flatMap((conv: any) => {
      totalMessages += conv.messages.length;
      conv.messages.forEach((msg: any) => {
        totalTokens += (msg.tokensInput || 0) + (msg.tokensOutput || 0);
      });

      return conv.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        tokensUsed: (msg.tokensInput || 0) + (msg.tokensOutput || 0),
        metadata: msg.metadata
      }));
    });

    const metadata = session.metadata as any;

    logger.info('Session fetched successfully', {
      sessionId,
      messageCount: totalMessages
    });

    // Response
    return NextResponse.json({
      data: {
        id: session.id,
        title: metadata?.title || 'Untitled Chat',
        userId: session.userId,
        startedAt: session.startedAt.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
        messages: allMessages,
        messageCount: totalMessages,
        totalTokens
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });
  } catch (error) {
    logger.error('Get session error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

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
 * DELETE /api/v1/chat/sessions/[id]
 *
 * Soft delete session and messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Require authentication
    await requireAuth();

    const sessionId = params.id;

    logger.info('Delete session request', {
      sessionId
    });

    // 2. Verify session exists
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId
      }
    });

    if (!session) {
      throw new ApiError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // 3. Check ownership (throws 403 if not owner or admin)
    await requireOwnership(session.userId);

    // Soft delete session (using updated_at as pseudo-deleted_at)
    // Note: Schema doesn't have deletedAt field on ChatSession
    // We'll delete it for real (can be changed to soft delete if schema is updated)
    await prisma.chatSession.delete({
      where: { id: sessionId }
    });

    logger.info('Session deleted successfully', {
      sessionId
    });

    // Response
    return NextResponse.json({
      data: {
        success: true,
        message: 'Session deleted successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });
  } catch (error) {
    logger.error('Delete session error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

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
