/**
 * Rate Limiting Module
 *
 * Token Bucket algorithm implementation with tier-based quotas.
 *
 * @module rate-limit
 */

export {
  TokenBucket,
  getTokenBucket,
  type TokenBucketConfig,
  type ConsumeResult
} from './token-bucket';

export {
  RATE_LIMIT_CONFIGS,
  getRateLimitConfig,
  getRateLimitEndpoints,
  isRateLimited,
  getRateLimitDescription,
  type RateLimitEndpoint,
  type UserTier
} from './config';

export {
  checkRateLimit,
  withRateLimit,
  withRateLimitByIP,
  type RateLimitOptions,
  type RateLimitResult
} from './middleware';
