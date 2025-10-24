/**
 * Integration Tests - Rate Limiting
 *
 * Tests for rate limiting in actual API endpoints
 *
 * Note: These tests require authentication setup
 * They test the full middleware integration with endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit/middleware';
import { getTokenBucket } from '@/lib/rate-limit/token-bucket';
import type { UserTier } from '@/lib/rate-limit/config';

/**
 * Helper: Reset rate limits for a user
 */
async function resetUserRateLimits(userId: string, endpoint: string) {
  const bucket = getTokenBucket();
  const tiers: UserTier[] = ['FREE', 'PRO', 'ENTERPRISE'];

  for (const tier of tiers) {
    await bucket.reset(`${endpoint}:${userId}:${tier}`);
  }
}

describe('Rate Limiting - Integration', () => {
  const testUserId = 'test-user-integration-001';

  beforeEach(async () => {
    // Reset rate limits before each test
    await resetUserRateLimits(testUserId, 'chat:send');
    await resetUserRateLimits(testUserId, 'chat:sessions');
    await resetUserRateLimits(testUserId, 'documents:upload');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit Function', () => {
    it('should allow requests within FREE tier limit (chat:send)', async () => {
      // FREE tier: 20 requests/min
      for (let i = 0; i < 20; i++) {
        const result = await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'FREE'
        });

        expect(result.allowed).toBe(true);
      }
    });

    it('should deny 21st request for FREE tier (chat:send)', async () => {
      // Exhaust FREE tier limit (20 requests)
      for (let i = 0; i < 20; i++) {
        await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'FREE'
        });
      }

      // 21st request should be denied
      const result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should allow more requests for PRO tier', async () => {
      // PRO tier: 100 requests/min (vs FREE: 20)
      for (let i = 0; i < 100; i++) {
        const result = await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'PRO'
        });

        expect(result.allowed).toBe(true);
      }

      // 101st should fail
      const result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'PRO'
      });

      expect(result.allowed).toBe(false);
    });

    it('should isolate rate limits between users', async () => {
      const user1 = 'user-001';
      const user2 = 'user-002';

      // Reset both users
      await resetUserRateLimits(user1, 'chat:send');
      await resetUserRateLimits(user2, 'chat:send');

      // Exhaust user1's limit
      for (let i = 0; i < 20; i++) {
        await checkRateLimit({
          endpoint: 'chat:send',
          identifier: user1,
          tier: 'FREE'
        });
      }

      // user1 should be rate limited
      let result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: user1,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(false);

      // user2 should still have full quota
      result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: user2,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(true);
    });

    it('should isolate rate limits between endpoints', async () => {
      // Reset both endpoints
      await resetUserRateLimits(testUserId, 'chat:send');
      await resetUserRateLimits(testUserId, 'chat:sessions');

      // Exhaust chat:send limit
      for (let i = 0; i < 20; i++) {
        await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'FREE'
        });
      }

      // chat:send should be rate limited
      let result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(false);

      // chat:sessions should still allow requests
      result = await checkRateLimit({
        endpoint: 'chat:sessions',
        identifier: testUserId,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('Tier-Specific Behavior', () => {
    it('should deny FREE tier document uploads', async () => {
      await resetUserRateLimits(testUserId, 'documents:upload');

      // FREE tier: 0 uploads allowed
      const result = await checkRateLimit({
        endpoint: 'documents:upload',
        identifier: testUserId,
        tier: 'FREE'
      });

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should allow PRO tier document uploads (up to 10/hour)', async () => {
      await resetUserRateLimits(testUserId, 'documents:upload');

      // PRO tier: 10 uploads/hour
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit({
          endpoint: 'documents:upload',
          identifier: testUserId,
          tier: 'PRO'
        });

        expect(result.allowed).toBe(true);
      }

      // 11th should fail
      const result = await checkRateLimit({
        endpoint: 'documents:upload',
        identifier: testUserId,
        tier: 'PRO'
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow ENTERPRISE tier high volume', async () => {
      await resetUserRateLimits(testUserId, 'chat:send');

      // ENTERPRISE tier: 1000 requests/min
      // Test first 100 (testing all 1000 would be slow)
      for (let i = 0; i < 100; i++) {
        const result = await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'ENTERPRISE'
        });

        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should return correct remaining count', async () => {
      await resetUserRateLimits(testUserId, 'chat:send');

      // First request: should have 19 remaining (20 - 1)
      let result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(18);
      expect(result.remaining).toBeLessThanOrEqual(20);

      // Second request: should have 18 remaining
      result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });

      expect(result.remaining).toBeGreaterThanOrEqual(17);
      expect(result.remaining).toBeLessThanOrEqual(19);
    });

    it('should return resetAt timestamp', async () => {
      await resetUserRateLimits(testUserId, 'chat:send');

      const result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });

      expect(result.resetAt).toBeGreaterThan(Date.now());
      expect(result.resetAt).toBeLessThan(Date.now() + 120000); // Within 2 minutes
    });

    it('should return retryAfter when rate limited', async () => {
      await resetUserRateLimits(testUserId, 'chat:send');

      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'FREE'
        });
      }

      // Get rate limited
      const result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThan(120); // Should be less than 2 minutes
    });
  });

  describe('Token Refill', () => {
    it('should allow requests after refill period', async () => {
      await resetUserRateLimits(testUserId, 'chat:send');

      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'FREE'
        });
      }

      // Should be rate limited
      let result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(false);

      // Wait for partial refill (3 seconds = ~1 token for FREE tier)
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Should allow 1 request after refill
      result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(true);
    }, 10000); // 10 second timeout for this test
  });

  describe('Admin Reset', () => {
    it('should allow requests after admin reset', async () => {
      await resetUserRateLimits(testUserId, 'chat:send');

      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        await checkRateLimit({
          endpoint: 'chat:send',
          identifier: testUserId,
          tier: 'FREE'
        });
      }

      // Should be rate limited
      let result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(false);

      // Admin reset
      await resetUserRateLimits(testUserId, 'chat:send');

      // Should allow requests after reset
      result = await checkRateLimit({
        endpoint: 'chat:send',
        identifier: testUserId,
        tier: 'FREE'
      });
      expect(result.allowed).toBe(true);
    });
  });
});
