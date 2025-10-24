/**
 * Rate Limit Configuration
 *
 * Tier-based rate limits for different endpoints.
 *
 * Quotas:
 * - FREE: Limited access (20 req/min chat, no uploads)
 * - PRO: Medium access (100 req/min chat, 10 uploads/hour)
 * - ENTERPRISE: High access (1000 req/min chat, 100 uploads/hour)
 *
 * All limits use Token Bucket algorithm with per-second refill rates.
 */

import { TokenBucketConfig } from './token-bucket';

/**
 * User subscription tier
 */
export type UserTier = 'FREE' | 'PRO' | 'ENTERPRISE';

/**
 * Available rate-limited endpoints
 */
export type RateLimitEndpoint =
  | 'chat:send'           // Send chat message
  | 'chat:sessions'       // Create chat session
  | 'documents:upload'    // Upload document for RAG
  | 'api:general';        // General API fallback

/**
 * Tier-based configurations for each endpoint
 */
type RateLimitConfigs = {
  [endpoint in RateLimitEndpoint]: {
    [tier in UserTier]: TokenBucketConfig;
  };
};

/**
 * Rate limit configurations
 *
 * Each endpoint has three tier configurations (FREE, PRO, ENTERPRISE).
 *
 * Token refill calculation:
 * - refillRate = maxTokens / windowSeconds
 * - refillInterval = 1000ms (1 second)
 *
 * Example: FREE chat:send
 * - maxTokens: 20
 * - windowSeconds: 60
 * - refillRate: 20/60 = 0.333 tokens/second
 * - User can burst 20 requests immediately, then 1 request every 3 seconds
 */
export const RATE_LIMIT_CONFIGS: RateLimitConfigs = {
  /**
   * Chat API - Send Message
   *
   * Primary chat endpoint for sending messages to AI.
   * This is the most critical endpoint to rate limit.
   */
  'chat:send': {
    FREE: {
      maxTokens: 20,              // 20 requests per minute
      refillRate: 20 / 60,        // 0.333 tokens/second
      refillInterval: 1000        // Refill every second
    },
    PRO: {
      maxTokens: 100,             // 100 requests per minute
      refillRate: 100 / 60,       // 1.667 tokens/second
      refillInterval: 1000
    },
    ENTERPRISE: {
      maxTokens: 1000,            // 1000 requests per minute
      refillRate: 1000 / 60,      // 16.667 tokens/second
      refillInterval: 1000
    }
  },

  /**
   * Chat API - Create Session
   *
   * Creating sessions is less frequent but still needs limits.
   */
  'chat:sessions': {
    FREE: {
      maxTokens: 5,               // 5 sessions per minute
      refillRate: 5 / 60,         // 0.083 tokens/second
      refillInterval: 1000
    },
    PRO: {
      maxTokens: 50,              // 50 sessions per minute
      refillRate: 50 / 60,        // 0.833 tokens/second
      refillInterval: 1000
    },
    ENTERPRISE: {
      maxTokens: 500,             // 500 sessions per minute
      refillRate: 500 / 60,       // 8.333 tokens/second
      refillInterval: 1000
    }
  },

  /**
   * Documents API - Upload
   *
   * Document uploads are expensive (RAG indexing), so limits are stricter.
   * Note: FREE tier has 0 uploads (feature not available).
   */
  'documents:upload': {
    FREE: {
      maxTokens: 0,               // No uploads for FREE tier
      refillRate: 0,              // No refill
      refillInterval: 1000
    },
    PRO: {
      maxTokens: 10,              // 10 uploads per hour
      refillRate: 10 / 3600,      // 0.00278 tokens/second
      refillInterval: 1000
    },
    ENTERPRISE: {
      maxTokens: 100,             // 100 uploads per hour
      refillRate: 100 / 3600,     // 0.0278 tokens/second
      refillInterval: 1000
    }
  },

  /**
   * General API - Fallback
   *
   * For any endpoint not explicitly configured.
   * More permissive than specific endpoints.
   */
  'api:general': {
    FREE: {
      maxTokens: 30,              // 30 requests per minute
      refillRate: 30 / 60,        // 0.5 tokens/second
      refillInterval: 1000
    },
    PRO: {
      maxTokens: 200,             // 200 requests per minute
      refillRate: 200 / 60,       // 3.333 tokens/second
      refillInterval: 1000
    },
    ENTERPRISE: {
      maxTokens: 2000,            // 2000 requests per minute
      refillRate: 2000 / 60,      // 33.333 tokens/second
      refillInterval: 1000
    }
  }
};

/**
 * Get rate limit config for an endpoint and tier
 *
 * @param endpoint - API endpoint identifier
 * @param tier - User subscription tier
 * @returns Token bucket configuration
 */
export function getRateLimitConfig(
  endpoint: RateLimitEndpoint,
  tier: UserTier
): TokenBucketConfig {
  return RATE_LIMIT_CONFIGS[endpoint][tier];
}

/**
 * Get all configured endpoints
 *
 * @returns Array of rate-limited endpoint names
 */
export function getRateLimitEndpoints(): RateLimitEndpoint[] {
  return Object.keys(RATE_LIMIT_CONFIGS) as RateLimitEndpoint[];
}

/**
 * Check if an endpoint is rate-limited
 *
 * @param endpoint - Endpoint to check
 * @returns true if endpoint has rate limit configuration
 */
export function isRateLimited(endpoint: string): endpoint is RateLimitEndpoint {
  return endpoint in RATE_LIMIT_CONFIGS;
}

/**
 * Get human-readable description of rate limit
 *
 * @param endpoint - API endpoint
 * @param tier - User tier
 * @returns Formatted string (e.g., "20 requests per minute")
 */
export function getRateLimitDescription(
  endpoint: RateLimitEndpoint,
  tier: UserTier
): string {
  const config = RATE_LIMIT_CONFIGS[endpoint][tier];

  if (config.maxTokens === 0) {
    return 'Not available for this tier';
  }

  // Determine time window based on refill rate
  const secondsForFullRefill = config.maxTokens / config.refillRate;

  if (secondsForFullRefill <= 60) {
    return `${config.maxTokens} requests per minute`;
  } else if (secondsForFullRefill <= 3600) {
    const minutes = Math.round(secondsForFullRefill / 60);
    return `${config.maxTokens} requests per ${minutes} minutes`;
  } else {
    const hours = Math.round(secondsForFullRefill / 3600);
    return `${config.maxTokens} requests per ${hours} hour${hours > 1 ? 's' : ''}`;
  }
}
