/**
 * Rate Limit Middleware
 *
 * Provides middleware wrapper for Next.js route handlers to enforce
 * tier-based rate limits using Token Bucket algorithm.
 *
 * Features:
 * - Automatic tier detection from user session
 * - Standard X-RateLimit-* headers
 * - 429 error with Retry-After header
 * - Logging for rate limit events
 * - Reusable wrapper function
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit('chat:send', async function handler(request) {
 *   // Your route logic here
 * });
 * ```
 */

import { NextResponse } from 'next/server';
import { getTokenBucket } from './token-bucket';
import { RATE_LIMIT_CONFIGS, RateLimitEndpoint, UserTier, getRateLimitConfig } from './config';
import logger from '@/lib/logging/logger';

/**
 * Rate limit check options
 */
export interface RateLimitOptions {
  /** API endpoint identifier */
  endpoint: RateLimitEndpoint;

  /** User identifier (userId or IP address) */
  identifier: string;

  /** User subscription tier */
  tier: UserTier;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Number of tokens/requests remaining */
  remaining: number;

  /** Unix timestamp (ms) when the limit will reset */
  resetAt: number;

  /** Seconds until retry allowed (only present when !allowed) */
  retryAfter?: number;
}

/**
 * Check rate limit for a request
 *
 * This is the low-level function that performs the actual rate limit check.
 * Most users should use `withRateLimit` instead.
 *
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { endpoint, identifier, tier } = options;

  // Get config for this endpoint and tier
  const config = getRateLimitConfig(endpoint, tier);

  // Create unique key for this bucket
  // Format: endpoint:identifier:tier
  // Example: chat:send:user-123:FREE
  const key = `${endpoint}:${identifier}:${tier}`;

  // Get token bucket instance
  const bucket = getTokenBucket();

  // Try to consume 1 token
  const result = await bucket.consume(key, config, 1);

  if (!result.allowed) {
    // Calculate retry-after in seconds
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

    logger.warn('[RATE_LIMIT] Request blocked', {
      endpoint,
      identifier,
      tier,
      retryAfter
    });

    return {
      allowed: false,
      remaining: 0,
      resetAt: result.resetAt,
      retryAfter
    };
  }

  return {
    allowed: true,
    remaining: result.remaining,
    resetAt: result.resetAt
  };
}

/**
 * Create 429 Too Many Requests response
 *
 * @param endpoint - Endpoint that was rate limited
 * @param tier - User's tier
 * @param retryAfter - Seconds until retry allowed
 * @returns NextResponse with 429 status
 */
function createRateLimitedResponse(
  endpoint: RateLimitEndpoint,
  tier: UserTier,
  retryAfter: number
): NextResponse {
  const config = RATE_LIMIT_CONFIGS[endpoint][tier];

  return NextResponse.json(
    {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        details: {
          retryAfter,
          limit: config.maxTokens,
          tier
        }
      }
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(config.maxTokens),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor((Date.now() + retryAfter * 1000) / 1000)),
        'Retry-After': String(retryAfter)
      }
    }
  );
}

/**
 * Add rate limit headers to a response
 *
 * @param response - Response to modify
 * @param endpoint - Endpoint being accessed
 * @param tier - User's tier
 * @param remaining - Tokens remaining
 * @param resetAt - Unix timestamp (ms) when limit resets
 * @returns Modified response
 */
function addRateLimitHeaders(
  response: Response,
  endpoint: RateLimitEndpoint,
  tier: UserTier,
  remaining: number,
  resetAt: number
): Response {
  const config = RATE_LIMIT_CONFIGS[endpoint][tier];

  response.headers.set('X-RateLimit-Limit', String(config.maxTokens));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));

  return response;
}

/**
 * Rate limit middleware wrapper for Next.js route handlers
 *
 * Wraps a route handler to enforce rate limits based on user tier.
 *
 * Requirements:
 * - Handler must call requireAuth() to get authenticated user
 * - This middleware will call requireAuth() first to get user session
 *
 * Example:
 * ```typescript
 * export const POST = withRateLimit('chat:send', async function handler(request) {
 *   const session = await requireAuth(); // Already authenticated by middleware
 *   // ... your route logic
 *   return NextResponse.json({ ... });
 * });
 * ```
 *
 * @param endpoint - API endpoint identifier
 * @param handler - Route handler function
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T = Record<string, unknown>>(
  endpoint: RateLimitEndpoint,
  handler: (request: Request, context?: T) => Promise<Response>
) {
  return async function rateLimitedHandler(
    request: Request,
    context?: T
  ): Promise<Response> {
    try {
      // Import auth function dynamically to avoid circular dependencies
      const { requireAuth } = await import('@/lib/auth/guards');

      // Get authenticated user (throws if not authenticated)
      let user;
      try {
        user = await requireAuth();
      } catch (error) {
        // Auth failed - let handler deal with it (will also fail and return 401)
        return await handler(request, context);
      }

      const userId = user.id;
      const tier = (user.tier as UserTier) || 'FREE';

      // Check rate limit
      const rateLimitResult = await checkRateLimit({
        endpoint,
        identifier: userId,
        tier
      });

      if (!rateLimitResult.allowed) {
        // Rate limited - return 429
        return createRateLimitedResponse(
          endpoint,
          tier,
          rateLimitResult.retryAfter!
        );
      }

      // Execute handler
      const response = await handler(request, context);

      // Add rate limit headers to successful response
      return addRateLimitHeaders(
        response,
        endpoint,
        tier,
        rateLimitResult.remaining,
        rateLimitResult.resetAt
      );
    } catch (error) {
      // If rate limiting fails, log error and pass through to handler
      // This ensures rate limit failures don't break the API
      logger.error('[RATE_LIMIT] Middleware error', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Pass through to handler
      return await handler(request, context);
    }
  };
}

/**
 * Alternative: Rate limit by IP address (for unauthenticated endpoints)
 *
 * Use this for public endpoints that don't require authentication.
 *
 * @param endpoint - API endpoint identifier
 * @param tier - Fixed tier to use (usually FREE)
 * @param handler - Route handler function
 * @returns Wrapped handler with IP-based rate limiting
 */
export function withRateLimitByIP<T = Record<string, unknown>>(
  endpoint: RateLimitEndpoint,
  tier: UserTier = 'FREE',
  handler: (request: Request, context?: T) => Promise<Response>
) {
  return async function rateLimitedHandler(
    request: Request,
    context?: T
  ): Promise<Response> {
    try {
      // Get IP address from request
      // In production (Vercel), use X-Forwarded-For header
      // In development, use a placeholder
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'development-ip';

      // Check rate limit
      const rateLimitResult = await checkRateLimit({
        endpoint,
        identifier: `ip:${ip}`,
        tier
      });

      if (!rateLimitResult.allowed) {
        // Rate limited - return 429
        return createRateLimitedResponse(
          endpoint,
          tier,
          rateLimitResult.retryAfter!
        );
      }

      // Execute handler
      const response = await handler(request, context);

      // Add rate limit headers
      return addRateLimitHeaders(
        response,
        endpoint,
        tier,
        rateLimitResult.remaining,
        rateLimitResult.resetAt
      );
    } catch (error) {
      // If rate limiting fails, log error and pass through
      logger.error('[RATE_LIMIT] IP-based middleware error', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return await handler(request, context);
    }
  };
}
