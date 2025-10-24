/**
 * Token Bucket Algorithm Implementation
 *
 * Token bucket algorithm for rate limiting with support for both
 * in-memory storage (development) and Redis (production).
 *
 * Features:
 * - Automatic fallback to memory if Redis unavailable
 * - Configurable refill rate and max tokens
 * - Precise timing with millisecond resolution
 * - Serverless-friendly (Upstash Redis)
 *
 * @see https://en.wikipedia.org/wiki/Token_bucket
 */

import { Redis } from '@upstash/redis';

/**
 * Token bucket configuration
 */
export interface TokenBucketConfig {
  /** Maximum number of tokens the bucket can hold */
  maxTokens: number;

  /** Number of tokens to add per second */
  refillRate: number;

  /** Interval in milliseconds for refill calculation (default: 1000ms) */
  refillInterval: number;
}

/**
 * Internal state of a token bucket
 */
interface BucketState {
  /** Current number of tokens in the bucket */
  tokens: number;

  /** Timestamp of last refill (milliseconds) */
  lastRefill: number;
}

/**
 * Result of attempting to consume tokens
 */
export interface ConsumeResult {
  /** Whether the request was allowed */
  allowed: boolean;

  /** Number of tokens remaining after consumption */
  remaining: number;

  /** Unix timestamp (ms) when bucket will be refilled */
  resetAt: number;

  /** Seconds until tokens will be available (only set when !allowed) */
  retryAfter?: number;
}

/**
 * Token Bucket implementation with Redis or in-memory storage
 */
export class TokenBucket {
  private redis: Redis | null = null;
  private memoryStore: Map<string, BucketState> = new Map();
  private useRedis: boolean;

  /**
   * Create a new TokenBucket instance
   *
   * @param useRedis - Whether to use Redis (auto-detected if undefined)
   */
  constructor(useRedis?: boolean) {
    // Auto-detect Redis availability if not explicitly set
    if (useRedis === undefined) {
      useRedis = !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN);
    }

    this.useRedis = useRedis;

    if (useRedis && process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_URL,
          token: process.env.UPSTASH_REDIS_TOKEN
        });

        console.log('[TokenBucket] Initialized with Redis storage');
      } catch (error) {
        console.warn('[TokenBucket] Failed to initialize Redis, falling back to memory:', error);
        this.useRedis = false;
      }
    } else {
      console.log('[TokenBucket] Initialized with in-memory storage');
      this.useRedis = false;
    }
  }

  /**
   * Try to consume tokens from the bucket
   *
   * This is the main method for checking rate limits. It will:
   * 1. Calculate how many tokens to refill based on time elapsed
   * 2. Try to consume the requested number of tokens
   * 3. Return whether the request was allowed and remaining tokens
   *
   * @param key - Unique identifier for this bucket (e.g., "chat:send:user123:FREE")
   * @param config - Token bucket configuration
   * @param tokensToConsume - Number of tokens to consume (default: 1)
   * @returns Result indicating if request was allowed
   */
  async consume(
    key: string,
    config: TokenBucketConfig,
    tokensToConsume: number = 1
  ): Promise<ConsumeResult> {
    const now = Date.now();

    // Get current bucket state
    const state = await this.getState(key);

    // Calculate tokens to add since last refill
    const timeSinceLastRefill = now - state.lastRefill;
    const intervalsElapsed = Math.floor(timeSinceLastRefill / config.refillInterval);
    const tokensToAdd = intervalsElapsed * config.refillRate;

    // Refill tokens (cap at maxTokens)
    let currentTokens = Math.min(
      state.tokens + tokensToAdd,
      config.maxTokens
    );

    // Update last refill time if tokens were added
    const newLastRefill = state.lastRefill + (intervalsElapsed * config.refillInterval);

    // Try to consume tokens
    if (currentTokens >= tokensToConsume) {
      // Success: consume tokens
      currentTokens -= tokensToConsume;

      // Update state
      await this.setState(key, {
        tokens: currentTokens,
        lastRefill: newLastRefill
      });

      // Calculate reset time (when bucket will be full again)
      const tokensNeeded = config.maxTokens - currentTokens;
      const secondsUntilFull = Math.ceil(tokensNeeded / config.refillRate);
      const resetAt = now + (secondsUntilFull * 1000);

      return {
        allowed: true,
        remaining: Math.floor(currentTokens),
        resetAt
      };
    } else {
      // Rate limited: not enough tokens
      const tokensNeeded = tokensToConsume - currentTokens;
      const secondsUntilAvailable = Math.ceil(tokensNeeded / config.refillRate);
      const resetAt = now + (secondsUntilAvailable * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: secondsUntilAvailable
      };
    }
  }

  /**
   * Get bucket state from Redis or memory
   *
   * @param key - Bucket identifier
   * @returns Current bucket state
   */
  private async getState(key: string): Promise<BucketState> {
    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get<BucketState>(`rate-limit:${key}`);

        if (data && typeof data === 'object' && 'tokens' in data && 'lastRefill' in data) {
          return data;
        }
      } catch (error) {
        console.error('[TokenBucket] Redis get error, falling back to memory:', error);
      }
    }

    // Try memory store
    const data = this.memoryStore.get(key);
    if (data) {
      return data;
    }

    // Initialize new bucket (start with 0 tokens, will be refilled on first consume)
    return {
      tokens: 0,
      lastRefill: Date.now()
    };
  }

  /**
   * Set bucket state to Redis or memory
   *
   * @param key - Bucket identifier
   * @param state - New bucket state
   */
  private async setState(key: string, state: BucketState): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        // Store in Redis with 1 hour expiration (prevents stale buckets)
        await this.redis.set(`rate-limit:${key}`, state, {
          ex: 3600 // 1 hour TTL
        });
        return;
      } catch (error) {
        console.error('[TokenBucket] Redis set error, falling back to memory:', error);
      }
    }

    // Store in memory
    this.memoryStore.set(key, state);
  }

  /**
   * Reset bucket for a key (admin operation)
   *
   * Useful for:
   * - Admin override to reset user's rate limit
   * - Testing
   * - Clearing rate limit after false positives
   *
   * @param key - Bucket identifier to reset
   */
  async reset(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`rate-limit:${key}`);
      } catch (error) {
        console.error('[TokenBucket] Redis delete error:', error);
      }
    }

    // Also clear from memory
    this.memoryStore.delete(key);
  }

  /**
   * Get storage type being used
   *
   * @returns 'redis' or 'memory'
   */
  getStorageType(): 'redis' | 'memory' {
    return this.useRedis ? 'redis' : 'memory';
  }
}

/**
 * Singleton instance of TokenBucket
 */
let tokenBucket: TokenBucket | null = null;

/**
 * Get or create the singleton TokenBucket instance
 *
 * @returns Shared TokenBucket instance
 */
export function getTokenBucket(): TokenBucket {
  if (!tokenBucket) {
    tokenBucket = new TokenBucket();
  }

  return tokenBucket;
}
