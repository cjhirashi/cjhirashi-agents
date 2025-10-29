/**
 * Voice Session Update API Endpoint
 *
 * PATCH /api/v1/voice/session/[sessionId]
 *
 * Updates voice session status and metrics
 * Used to close sessions and record usage
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guards';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const SessionUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED']).optional(),
  messagesCount: z.number().int().min(0).optional(),
  tokensInput: z.number().int().min(0).optional(),
  tokensOutput: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
});

type SessionUpdate = z.infer<typeof SessionUpdateSchema>;

// ═══════════════════════════════════════════════════════════
// PATCH HANDLER
// ═══════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const { sessionId } = await params;

    logger.info('[Voice Session] Updating session', { sessionId, userId });

    // 2. Parse and validate request
    const body: unknown = await request.json();
    const validationResult = SessionUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[Voice Session] Validation failed', {
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

    // 3. Fetch session
    const session = await prisma.voice_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      logger.warn('[Voice Session] Session not found', { sessionId });

      return NextResponse.json(
        {
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // 4. Verify ownership
    if (session.userId !== userId) {
      logger.warn('[Voice Session] Unauthorized access attempt', {
        sessionId,
        userId,
        ownerId: session.userId,
      });

      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to update this session',
        },
        { status: 403 }
      );
    }

    // 5. Calculate cost if tokens provided
    let costTotal = session.costTotal;

    if (updates.tokensInput !== undefined || updates.tokensOutput !== undefined) {
      const inputTokens = updates.tokensInput ?? session.tokensInput;
      const outputTokens = updates.tokensOutput ?? session.tokensOutput;

      // gpt-4o-realtime pricing (example: $5/$20 per 1M tokens)
      const inputCost = (inputTokens / 1000000) * 5;
      const outputCost = (outputTokens / 1000000) * 20;
      costTotal = inputCost + outputCost;
    }

    // 6. Update session
    const updatedSession = await prisma.voice_sessions.update({
      where: { id: sessionId },
      data: {
        ...updates,
        costTotal,
        endedAt:
          updates.status === 'COMPLETED' || updates.status === 'FAILED'
            ? new Date()
            : session.endedAt,
      },
    });

    logger.info('[Voice Session] Session updated', {
      sessionId,
      status: updatedSession.status,
      costTotal: updatedSession.costTotal,
    });

    // 7. Return updated session
    return NextResponse.json(
      {
        session: {
          id: updatedSession.id,
          status: updatedSession.status,
          messagesCount: updatedSession.messagesCount,
          tokensInput: updatedSession.tokensInput,
          tokensOutput: updatedSession.tokensOutput,
          costTotal: updatedSession.costTotal,
          durationMs: updatedSession.durationMs,
          startedAt: updatedSession.startedAt,
          endedAt: updatedSession.endedAt,
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
          message: 'Please sign in to update voice sessions',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Voice Session] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update voice session',
      },
      { status: 500 }
    );
  }
}
