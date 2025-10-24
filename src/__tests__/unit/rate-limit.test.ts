/**
 * Unit Tests - Rate Limiting
 *
 * Tests for Token Bucket algorithm implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenBucket } from '@/lib/rate-limit/token-bucket';
import { getRateLimitConfig, getRateLimitDescription, isRateLimited } from '@/lib/rate-limit/config';

describe('Rate Limiting - Token Bucket', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    // Use memory storage for tests
    bucket = new TokenBucket(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Token Consumption', () => {
    it('should allow request when tokens available', async () => {
      const result = await bucket.consume('test-key-1', {
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 1000
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should rate limit when tokens exhausted', async () => {
      const config = {
        maxTokens: 2,
        refillRate: 1,
        refillInterval: 1000
      };

      // Consume all tokens
      await bucket.consume('test-key-2', config);
      await bucket.consume('test-key-2', config);

      // Should be rate limited now
      const result = await bucket.consume('test-key-2', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should isolate buckets by key', async () => {
      const config = {
        maxTokens: 1,
        refillRate: 1,
        refillInterval: 1000
      };

      // Consume token for key1
      const result1 = await bucket.consume('key1', config);
      expect(result1.allowed).toBe(true);

      // Consume token for key1 again (should fail)
      const result2 = await bucket.consume('key1', config);
      expect(result2.allowed).toBe(false);

      // Consume token for key2 (should succeed - different bucket)
      const result3 = await bucket.consume('key2', config);
      expect(result3.allowed).toBe(true);
    });
  });

  describe('Token Refill', () => {
    it('should refill tokens over time', async () => {
      const config = {
        maxTokens: 5,
        refillRate: 5, // 5 tokens per second
        refillInterval: 1000
      };

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        await bucket.consume('test-key-refill', config);
      }

      // Should be rate limited
      let result = await bucket.consume('test-key-refill', config);
      expect(result.allowed).toBe(false);

      // Wait 1.2 seconds for refill
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Should have refilled and allow request
      result = await bucket.consume('test-key-refill', config);
      expect(result.allowed).toBe(true);
    });

    it('should cap tokens at maxTokens', async () => {
      const config = {
        maxTokens: 3,
        refillRate: 10, // Fast refill
        refillInterval: 1000
      };

      // Consume 1 token
      await bucket.consume('test-key-cap', config);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Consume 3 tokens (should succeed - capped at maxTokens)
      const result1 = await bucket.consume('test-key-cap', config);
      const result2 = await bucket.consume('test-key-cap', config);
      const result3 = await bucket.consume('test-key-cap', config);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);

      // 4th should fail (only 3 max tokens)
      const result4 = await bucket.consume('test-key-cap', config);
      expect(result4.allowed).toBe(false);
    });
  });

  describe('Token Reset', () => {
    it('should reset bucket state', async () => {
      const config = {
        maxTokens: 2,
        refillRate: 1,
        refillInterval: 1000
      };

      // Exhaust tokens
      await bucket.consume('test-key-reset', config);
      await bucket.consume('test-key-reset', config);

      // Should be rate limited
      let result = await bucket.consume('test-key-reset', config);
      expect(result.allowed).toBe(false);

      // Reset bucket
      await bucket.reset('test-key-reset');

      // Should allow request after reset
      result = await bucket.consume('test-key-reset', config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Storage Type', () => {
    it('should use memory storage when Redis not configured', () => {
      const memoryBucket = new TokenBucket(false);
      expect(memoryBucket.getStorageType()).toBe('memory');
    });

    it('should fallback to memory if Redis URL missing', () => {
      // No UPSTASH_REDIS_URL set
      delete process.env.UPSTASH_REDIS_URL;

      const fallbackBucket = new TokenBucket();
      expect(fallbackBucket.getStorageType()).toBe('memory');
    });
  });
});

describe('Rate Limiting - Configuration', () => {
  describe('getRateLimitConfig', () => {
    it('should return config for chat:send FREE tier', () => {
      const config = getRateLimitConfig('chat:send', 'FREE');

      expect(config.maxTokens).toBe(20);
      expect(config.refillRate).toBeCloseTo(20 / 60, 3);
      expect(config.refillInterval).toBe(1000);
    });

    it('should return config for chat:send PRO tier', () => {
      const config = getRateLimitConfig('chat:send', 'PRO');

      expect(config.maxTokens).toBe(100);
      expect(config.refillRate).toBeCloseTo(100 / 60, 3);
      expect(config.refillInterval).toBe(1000);
    });

    it('should return config for documents:upload FREE tier', () => {
      const config = getRateLimitConfig('documents:upload', 'FREE');

      // FREE tier has no upload access
      expect(config.maxTokens).toBe(0);
      expect(config.refillRate).toBe(0);
    });

    it('should return config for documents:upload PRO tier', () => {
      const config = getRateLimitConfig('documents:upload', 'PRO');

      expect(config.maxTokens).toBe(10);
      expect(config.refillRate).toBeCloseTo(10 / 3600, 5);
    });
  });

  describe('isRateLimited', () => {
    it('should return true for configured endpoints', () => {
      expect(isRateLimited('chat:send')).toBe(true);
      expect(isRateLimited('chat:sessions')).toBe(true);
      expect(isRateLimited('documents:upload')).toBe(true);
      expect(isRateLimited('api:general')).toBe(true);
    });

    it('should return false for unknown endpoints', () => {
      expect(isRateLimited('unknown:endpoint')).toBe(false);
      expect(isRateLimited('chat:invalid')).toBe(false);
    });
  });

  describe('getRateLimitDescription', () => {
    it('should return correct description for chat:send FREE', () => {
      const desc = getRateLimitDescription('chat:send', 'FREE');
      expect(desc).toBe('20 requests per minute');
    });

    it('should return correct description for documents:upload PRO', () => {
      const desc = getRateLimitDescription('documents:upload', 'PRO');
      expect(desc).toContain('10 requests');
      expect(desc).toContain('hour');
    });

    it('should return "Not available" for FREE tier uploads', () => {
      const desc = getRateLimitDescription('documents:upload', 'FREE');
      expect(desc).toBe('Not available for this tier');
    });
  });
});

describe('Rate Limiting - Edge Cases', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    bucket = new TokenBucket(false);
  });

  it('should handle concurrent requests correctly', async () => {
    const config = {
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000
    };

    // Make 15 concurrent requests
    const requests = Array.from({ length: 15 }, () =>
      bucket.consume('concurrent-test', config)
    );

    const results = await Promise.all(requests);

    // Should allow first 10, deny last 5
    const allowed = results.filter(r => r.allowed).length;
    const denied = results.filter(r => !r.allowed).length;

    expect(allowed).toBeLessThanOrEqual(10);
    expect(denied).toBeGreaterThanOrEqual(5);
  });

  it('should handle fractional refill rates correctly', async () => {
    const config = {
      maxTokens: 10,
      refillRate: 0.5, // 0.5 tokens per second = 1 token per 2 seconds
      refillInterval: 1000
    };

    // Consume 1 token
    await bucket.consume('fractional-test', config);

    // Wait 1 second (should refill 0.5 tokens - not enough)
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should still be rate limited
    let result = await bucket.consume('fractional-test', config);
    expect(result.allowed).toBe(false);

    // Wait another second (total 2 seconds - should refill 1 token)
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should allow now
    result = await bucket.consume('fractional-test', config);
    expect(result.allowed).toBe(true);
  });

  it('should handle zero maxTokens (disabled endpoint)', async () => {
    const config = {
      maxTokens: 0,
      refillRate: 0,
      refillInterval: 1000
    };

    // Should always deny
    const result = await bucket.consume('zero-tokens-test', config);
    expect(result.allowed).toBe(false);
  });
});
