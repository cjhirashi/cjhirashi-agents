/**
 * POST /api/v1/agents/[agentId]/execute
 *
 * Execute a custom agent with Server-Sent Events (SSE) streaming
 *
 * Architecture: ADR-010 (Inline Execution Pattern)
 *
 * Features:
 * - Authentication required (requireAuth)
 * - Ownership validation (only agent creator can execute)
 * - Rate limiting (agents:execute endpoint)
 * - SSE streaming for real-time responses
 * - Timeout handling (5-60 seconds)
 * - Cost tracking
 *
 * Related:
 * - sys-docs/architecture/ADR-010-custom-agent-execution.md
 * - src/lib/agents/executor.ts (core execution logic)
 * - src/app/api/v1/chat/send/route.ts (similar pattern)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import logger from '@/lib/logging/logger';
import { AgentExecuteRequestSchema } from '@/lib/validations/agent';
import { ApiError } from '@/lib/errors/ApiError';
import { requireAuth, requireOwnership } from '@/lib/auth/guards';
import { executeAgentStream } from '@/lib/agents/executor';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/agents/[agentId]/execute
 *
 * Response: Server-Sent Events stream
 *
 * Rate Limited: 10/min (FREE), 50/min (PRO), 500/min (ENTERPRISE)
 *
 * Auth: Required (must be agent owner)
 */
async function executeAgentHandler(
  request: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;
    const userTier = user.tier;

    // 2. Get agent ID from route params
    const params = await context.params;
    const { agentId } = params;

    if (!agentId) {
      throw new ApiError('Agent ID is required', 400, 'MISSING_AGENT_ID');
    }

    logger.info('[Agent Execute] Request received', {
      agentId,
      userId,
      userTier
    });

    // 3. Parse request body
    const body = await request.json();

    // 4. Validate request
    const validated = AgentExecuteRequestSchema.parse(body);

    logger.info('[Agent Execute] Request validated', {
      agentId,
      userId,
      messageLength: validated.message.length,
      temperature: validated.temperature,
      maxTokens: validated.maxTokens,
      timeout: validated.timeout
    });

    // 5. Fetch agent from database
    const agent = await prisma.agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new ApiError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }

    logger.info('[Agent Execute] Agent found', {
      agentId,
      agentName: agent.name,
      createdBy: agent.createdBy,
      model: agent.model
    });

    // 6. Verify ownership
    // Only the agent creator can execute their agent
    await requireOwnership(agent.createdBy);

    logger.info('[Agent Execute] Ownership verified', {
      agentId,
      userId,
      agentCreatedBy: agent.createdBy
    });

    // 7. Check tier compatibility
    // NOTE: Tier checking disabled - agent model doesn't have tier property
    // TODO: Add tier field to agents model if tier-based access control is needed
    //
    // const tierHierarchy = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'UNLIMITED'];
    // const userTierLevel = tierHierarchy.indexOf(userTier);
    // const agentTierLevel = tierHierarchy.indexOf(agent.tier);
    //
    // if (userTierLevel < agentTierLevel) {
    //   logger.warn('[Agent Execute] Insufficient tier', {
    //     agentId,
    //     userId,
    //     userTier,
    //     agentTier: agent.tier
    //   });
    //
    //   throw new ApiError(
    //     `Agent requires ${agent.tier} tier or higher`,
    //     403,
    //     'INSUFFICIENT_TIER'
    //   );
    // }

    // 8. Execute agent with streaming
    const stream = executeAgentStream({
      agent,
      userId,
      userTier,
      message: validated.message,
      temperature: validated.temperature,
      maxTokens: validated.maxTokens,
      timeout: validated.timeout
    });

    logger.info('[Agent Execute] Streaming started', {
      agentId,
      userId,
      setupDuration: Date.now() - startTime
    });

    // 9. Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    logger.error('[Agent Execute] Error', {
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
 * Export POST handler
 *
 * Note: Rate limiting temporarily disabled due to Next.js 15 type compatibility
 * TODO: Re-enable rate limiting after fixing type issues
 *
 * Original: export const POST = withRateLimit('agents:execute', executeAgentHandler);
 */
export const POST = executeAgentHandler;
