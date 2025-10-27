/**
 * DALL-E 3 Client Unit Tests
 *
 * Tests for DALL-E 3 image generation utilities
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCost,
  canGenerateImage,
  getRemainingImages,
} from '@/lib/ai/dalle3';

describe('DALL-E 3 - Cost Calculation', () => {
  describe('calculateCost', () => {
    it('should calculate standard 1024x1024 cost correctly', () => {
      const cost = calculateCost('1024x1024', 'standard');
      expect(cost).toBe(0.04);
    });

    it('should calculate standard 1792x1024 cost correctly', () => {
      const cost = calculateCost('1792x1024', 'standard');
      expect(cost).toBe(0.08);
    });

    it('should calculate standard 1024x1792 cost correctly', () => {
      const cost = calculateCost('1024x1792', 'standard');
      expect(cost).toBe(0.08);
    });

    it('should calculate HD 1024x1024 cost correctly', () => {
      const cost = calculateCost('1024x1024', 'hd');
      expect(cost).toBe(0.08);
    });

    it('should calculate HD 1792x1024 cost correctly', () => {
      const cost = calculateCost('1792x1024', 'hd');
      expect(cost).toBe(0.12);
    });

    it('should calculate HD 1024x1792 cost correctly', () => {
      const cost = calculateCost('1024x1792', 'hd');
      expect(cost).toBe(0.12);
    });

    it('should show HD costs are 2x standard for square images', () => {
      const standardCost = calculateCost('1024x1024', 'standard');
      const hdCost = calculateCost('1024x1024', 'hd');

      expect(hdCost).toBe(standardCost * 2);
    });

    it('should show HD costs are 1.5x standard for rectangular images', () => {
      const standardCost = calculateCost('1792x1024', 'standard');
      const hdCost = calculateCost('1792x1024', 'hd');

      expect(hdCost).toBe(standardCost * 1.5);
    });
  });
});

describe('DALL-E 3 - Tier Limits', () => {
  describe('canGenerateImage', () => {
    it('should allow BASIC tier with 0 images generated', () => {
      expect(canGenerateImage('BASIC', 0)).toBe(true);
    });

    it('should allow BASIC tier with 2 images generated', () => {
      expect(canGenerateImage('BASIC', 2)).toBe(true);
    });

    it('should deny BASIC tier with 3 images generated', () => {
      expect(canGenerateImage('BASIC', 3)).toBe(false);
    });

    it('should deny FREE tier always', () => {
      expect(canGenerateImage('FREE', 0)).toBe(false);
      expect(canGenerateImage('FREE', 1)).toBe(false);
    });

    it('should allow PRO tier with 9 images generated', () => {
      expect(canGenerateImage('PRO', 9)).toBe(true);
    });

    it('should deny PRO tier with 10 images generated', () => {
      expect(canGenerateImage('PRO', 10)).toBe(false);
    });

    it('should allow ENTERPRISE tier unlimited', () => {
      expect(canGenerateImage('ENTERPRISE', 0)).toBe(true);
      expect(canGenerateImage('ENTERPRISE', 100)).toBe(true);
      expect(canGenerateImage('ENTERPRISE', 1000)).toBe(true);
    });

    it('should allow UNLIMITED tier unlimited', () => {
      expect(canGenerateImage('UNLIMITED', 0)).toBe(true);
      expect(canGenerateImage('UNLIMITED', 1000)).toBe(true);
    });

    it('should allow CUSTOM tier unlimited', () => {
      expect(canGenerateImage('CUSTOM', 0)).toBe(true);
      expect(canGenerateImage('CUSTOM', 500)).toBe(true);
    });

    it('should deny unknown tiers', () => {
      expect(canGenerateImage('UNKNOWN_TIER', 0)).toBe(false);
    });
  });

  describe('getRemainingImages', () => {
    it('should return 3 for BASIC tier with 0 generated', () => {
      expect(getRemainingImages('BASIC', 0)).toBe(3);
    });

    it('should return 1 for BASIC tier with 2 generated', () => {
      expect(getRemainingImages('BASIC', 2)).toBe(1);
    });

    it('should return 0 for BASIC tier with 3 generated', () => {
      expect(getRemainingImages('BASIC', 3)).toBe(0);
    });

    it('should return 0 for BASIC tier with more than limit', () => {
      expect(getRemainingImages('BASIC', 5)).toBe(0);
    });

    it('should return 0 for FREE tier always', () => {
      expect(getRemainingImages('FREE', 0)).toBe(0);
    });

    it('should return 10 for PRO tier with 0 generated', () => {
      expect(getRemainingImages('PRO', 0)).toBe(10);
    });

    it('should return 5 for PRO tier with 5 generated', () => {
      expect(getRemainingImages('PRO', 5)).toBe(5);
    });

    it('should return Infinity for ENTERPRISE tier', () => {
      expect(getRemainingImages('ENTERPRISE', 0)).toBe(Infinity);
      expect(getRemainingImages('ENTERPRISE', 100)).toBe(Infinity);
    });

    it('should return Infinity for UNLIMITED tier', () => {
      expect(getRemainingImages('UNLIMITED', 0)).toBe(Infinity);
      expect(getRemainingImages('UNLIMITED', 1000)).toBe(Infinity);
    });

    it('should return Infinity for CUSTOM tier', () => {
      expect(getRemainingImages('CUSTOM', 0)).toBe(Infinity);
    });

    it('should return 0 for unknown tiers', () => {
      expect(getRemainingImages('UNKNOWN_TIER', 0)).toBe(0);
    });
  });
});

describe('DALL-E 3 - Tier Limits Integration', () => {
  it('should enforce BASIC tier limit correctly', () => {
    const tier = 'BASIC';
    let generated = 0;

    // First 3 should be allowed
    expect(canGenerateImage(tier, generated)).toBe(true);
    generated++;
    expect(canGenerateImage(tier, generated)).toBe(true);
    generated++;
    expect(canGenerateImage(tier, generated)).toBe(true);
    generated++;

    // 4th should be denied
    expect(canGenerateImage(tier, generated)).toBe(false);
  });

  it('should enforce PRO tier limit correctly', () => {
    const tier = 'PRO';

    // First 10 should be allowed
    for (let i = 0; i < 10; i++) {
      expect(canGenerateImage(tier, i)).toBe(true);
    }

    // 11th should be denied
    expect(canGenerateImage(tier, 10)).toBe(false);
  });

  it('should calculate remaining correctly as images are generated', () => {
    const tier = 'BASIC';

    expect(getRemainingImages(tier, 0)).toBe(3);
    expect(getRemainingImages(tier, 1)).toBe(2);
    expect(getRemainingImages(tier, 2)).toBe(1);
    expect(getRemainingImages(tier, 3)).toBe(0);
  });
});

describe('DALL-E 3 - Business Logic', () => {
  it('should have consistent tier hierarchy', () => {
    const tiers = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'UNLIMITED'];
    const limits = tiers.map((tier) => getRemainingImages(tier, 0));

    // FREE should be 0
    expect(limits[0]).toBe(0);

    // BASIC should be > 0 and < PRO
    expect(limits[1]).toBeGreaterThan(0);
    expect(limits[1]).toBeLessThan(limits[2]);

    // PRO should be > BASIC
    expect(limits[2]).toBeGreaterThan(limits[1]);

    // ENTERPRISE and UNLIMITED should be Infinity
    expect(limits[3]).toBe(Infinity);
    expect(limits[4]).toBe(Infinity);
  });

  it('should have logical cost progression', () => {
    const standardSquare = calculateCost('1024x1024', 'standard');
    const standardLandscape = calculateCost('1792x1024', 'standard');
    const hdSquare = calculateCost('1024x1024', 'hd');
    const hdLandscape = calculateCost('1792x1024', 'hd');

    // Landscape should cost more than square
    expect(standardLandscape).toBeGreaterThan(standardSquare);

    // HD should cost more than standard
    expect(hdSquare).toBeGreaterThan(standardSquare);
    expect(hdLandscape).toBeGreaterThan(standardLandscape);

    // HD landscape should be most expensive
    expect(hdLandscape).toBeGreaterThan(hdSquare);
    expect(hdLandscape).toBeGreaterThan(standardLandscape);
  });
});
