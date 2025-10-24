/**
 * GET /api/v1/user/rate-limits
 *
 * Get current user's rate limits for all endpoints
 *
 * Returns configured rate limits based on user's tier.
 * Useful for:
 * - Displaying limits in UI
 * - Client-side rate limit awareness
 * - User education about tier benefits
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import {
  RATE_LIMIT_CONFIGS,
  getRateLimitDescription,
  type RateLimitEndpoint,
  type UserTier
} from '@/lib/rate-limit';
import logger from '@/lib/logging/logger';

/**
 * GET /api/v1/user/rate-limits
 *
 * Get user's rate limits for all endpoints
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;
    const tier = (user.tier as UserTier) || 'FREE';

    logger.info('[USER] Rate limits request', {
      userId,
      tier
    });

    // 2. Build limits object for all endpoints
    const limits: Record<string, any> = {};

    for (const endpoint of Object.keys(RATE_LIMIT_CONFIGS) as RateLimitEndpoint[]) {
      const config = RATE_LIMIT_CONFIGS[endpoint][tier];

      limits[endpoint] = {
        // Human-readable description
        description: getRateLimitDescription(endpoint, tier),

        // Technical details
        maxRequests: config.maxTokens,
        refillRate: config.refillRate,
        refillInterval: config.refillInterval,

        // User's tier
        tier,

        // Whether this endpoint is available for this tier
        available: config.maxTokens > 0
      };
    }

    logger.info('[USER] Rate limits fetched', {
      userId,
      tier,
      endpointCount: Object.keys(limits).length
    });

    // 3. Response
    return NextResponse.json(
      {
        data: {
          userId,
          tier,
          limits
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[USER] Rate limits error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

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
