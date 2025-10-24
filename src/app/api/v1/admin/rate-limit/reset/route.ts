/**
 * POST /api/v1/admin/rate-limit/reset
 *
 * Reset rate limit for a specific user and endpoint
 *
 * Admin-only endpoint to clear rate limit buckets.
 * Useful for:
 * - Customer support (reset limits after false positives)
 * - Testing
 * - Emergency overrides
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { getTokenBucket, isRateLimited, type RateLimitEndpoint, type UserTier } from '@/lib/rate-limit';
import logger from '@/lib/logging/logger';

/**
 * Request schema for reset rate limit
 */
const ResetRateLimitSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  endpoint: z.string().min(1, 'endpoint is required'),
  tier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional()
});

/**
 * POST /api/v1/admin/rate-limit/reset
 *
 * Reset rate limit buckets for a user
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Require admin authentication
    const admin = await requireAdmin();

    // 2. Parse and validate request
    const body = await request.json();
    const validated = ResetRateLimitSchema.parse(body);

    logger.info('[ADMIN] Rate limit reset request', {
      adminId: admin.id,
      targetUserId: validated.userId,
      endpoint: validated.endpoint,
      tier: validated.tier
    });

    // 3. Validate endpoint
    if (!isRateLimited(validated.endpoint)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ENDPOINT',
            message: `Endpoint '${validated.endpoint}' is not rate-limited`,
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    const endpoint = validated.endpoint as RateLimitEndpoint;

    // 4. Get token bucket instance
    const bucket = getTokenBucket();

    // 5. Reset buckets
    const tiersToReset: UserTier[] = validated.tier
      ? [validated.tier]
      : ['FREE', 'PRO', 'ENTERPRISE'];

    const resetPromises = tiersToReset.map(tier => {
      const key = `${endpoint}:${validated.userId}:${tier}`;
      return bucket.reset(key);
    });

    await Promise.all(resetPromises);

    logger.info('[ADMIN] Rate limit reset completed', {
      adminId: admin.id,
      targetUserId: validated.userId,
      endpoint,
      tiersReset: tiersToReset
    });

    // 6. Response
    return NextResponse.json(
      {
        data: {
          success: true,
          userId: validated.userId,
          endpoint,
          tiersReset,
          resetBy: admin.id,
          resetAt: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[ADMIN] Rate limit reset error', {
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
