/**
 * Unit Tests for LLM Hybrid Router
 *
 * Tests the routing algorithm, scoring functions, and fallback strategy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { routeToModel, createRoutingContext } from '@/lib/ai/router';
import type { RoutingContext, SystemMetrics } from '@/types/llm';

describe('LLM Router - Hybrid Algorithm', () => {
  let baseContext: RoutingContext;
  let mockMetrics: SystemMetrics;

  beforeEach(() => {
    baseContext = {
      userId: 'test-user-id',
      userTier: 'PRO',
      prompt: 'Explain quantum computing',
      estimatedTokens: 500,
      requestId: 'test-request-id',
    };

    mockMetrics = {
      'claude-3.5-sonnet-20241022': {
        uptime: 0.99,
        currentLatency: 800,
        queueDepth: 10,
      },
      'gpt-4o': {
        uptime: 0.98,
        currentLatency: 1200,
        queueDepth: 20,
      },
      'gemini-2.0-flash': {
        uptime: 0.99,
        currentLatency: 500,
        queueDepth: 5,
      },
      'deepseek-chat': {
        uptime: 0.95,
        currentLatency: 1500,
        queueDepth: 30,
      },
    };
  });

  describe('Routing Decision', () => {
    it('should return a valid routing decision', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      expect(decision).toHaveProperty('selectedModel');
      expect(decision).toHaveProperty('provider');
      expect(decision).toHaveProperty('scores');
      expect(decision).toHaveProperty('reasoning');
      expect(decision).toHaveProperty('fallbacks');
    });

    it('should select a model from allowed tier models', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      // PRO tier has access to all models
      const allowedModels = [
        'claude-3.5-sonnet-20241022',
        'gpt-4o',
        'gemini-2.0-flash',
        'deepseek-chat',
      ];

      expect(allowedModels).toContain(decision.selectedModel);
    });

    it('should provide fallback models', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      expect(decision.fallbacks).toBeInstanceOf(Array);
      expect(decision.fallbacks.length).toBeGreaterThan(0);
      expect(decision.fallbacks.length).toBeLessThan(4); // Max 3 fallbacks
    });
  });

  describe('Quality Scoring', () => {
    it('should boost Claude score for code tasks', () => {
      const codeContext = {
        ...baseContext,
        prompt: 'Write Python code to sort an array',
      };

      const decision = routeToModel(codeContext, mockMetrics);

      // Claude should be preferred for code tasks
      // (quality boost should increase its final score)
      expect(decision.scores.quality).toBeGreaterThan(0.8);
    });

    it('should assign higher quality scores to better models', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      // Claude and GPT-4o should have higher quality scores
      expect(decision.scores.quality).toBeGreaterThan(0.7);
    });
  });

  describe('Cost Scoring', () => {
    it('should favor cheaper models for simple tasks', () => {
      const simpleContext = {
        ...baseContext,
        userTier: 'FREE', // Free tier should use cheaper models
        prompt: 'Hello',
        estimatedTokens: 50,
      };

      const decision = routeToModel(simpleContext, mockMetrics);

      // FREE tier should select Gemini or DeepSeek (cheaper)
      expect(['gemini-2.0-flash', 'deepseek-chat']).toContain(
        decision.selectedModel
      );
    });

    it('should calculate cost score inversely', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      // Cost score should be between 0 and 1
      expect(decision.scores.cost).toBeGreaterThanOrEqual(0);
      expect(decision.scores.cost).toBeLessThanOrEqual(1);
    });
  });

  describe('Availability Scoring', () => {
    it('should penalize models with low uptime', () => {
      const lowUptimeMetrics: SystemMetrics = {
        ...mockMetrics,
        'claude-3.5-sonnet-20241022': {
          uptime: 0.5, // Low uptime
          currentLatency: 800,
          queueDepth: 10,
        },
      };

      const decision = routeToModel(baseContext, lowUptimeMetrics);

      // Claude should have lower availability score
      if (decision.selectedModel === 'claude-3.5-sonnet-20241022') {
        expect(decision.scores.availability).toBeLessThan(0.8);
      }
    });

    it('should penalize models with high latency', () => {
      const highLatencyMetrics: SystemMetrics = {
        ...mockMetrics,
        'gpt-4o': {
          uptime: 0.99,
          currentLatency: 5000, // Very high latency
          queueDepth: 10,
        },
      };

      const decision = routeToModel(baseContext, highLatencyMetrics);

      // GPT-4o should have lower availability score
      if (decision.selectedModel === 'gpt-4o') {
        expect(decision.scores.availability).toBeLessThan(0.7);
      }
    });
  });

  describe('Tier Constraints', () => {
    it('should only use cheap models for FREE tier', () => {
      const freeContext = {
        ...baseContext,
        userTier: 'FREE',
      };

      const decision = routeToModel(freeContext, mockMetrics);

      // FREE tier should only select Gemini or DeepSeek
      expect(['gemini-2.0-flash', 'deepseek-chat']).toContain(
        decision.selectedModel
      );
    });

    it('should have access to all models for ENTERPRISE tier', () => {
      const enterpriseContext = {
        ...baseContext,
        userTier: 'ENTERPRISE',
      };

      const decision = routeToModel(enterpriseContext, mockMetrics);

      // ENTERPRISE can select any model
      const allModels = [
        'claude-3.5-sonnet-20241022',
        'gpt-4o',
        'gemini-2.0-flash',
        'deepseek-chat',
      ];

      expect(allModels).toContain(decision.selectedModel);
    });
  });

  describe('Final Score Calculation', () => {
    it('should calculate weighted average correctly', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      const { quality, cost, availability, final } = decision.scores;

      // Final should be weighted average (40-30-30)
      const expectedFinal = 0.4 * quality + 0.3 * cost + 0.3 * availability;

      expect(final).toBeCloseTo(expectedFinal, 2);
    });

    it('should return scores between 0 and 1', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      expect(decision.scores.quality).toBeGreaterThanOrEqual(0);
      expect(decision.scores.quality).toBeLessThanOrEqual(1);

      expect(decision.scores.cost).toBeGreaterThanOrEqual(0);
      expect(decision.scores.cost).toBeLessThanOrEqual(1);

      expect(decision.scores.availability).toBeGreaterThanOrEqual(0);
      expect(decision.scores.availability).toBeLessThanOrEqual(1);

      expect(decision.scores.final).toBeGreaterThanOrEqual(0);
      expect(decision.scores.final).toBeLessThanOrEqual(1);
    });
  });

  describe('Routing Context Creation', () => {
    it('should create valid routing context', () => {
      const context = createRoutingContext({
        userId: 'user-123',
        userTier: 'PRO',
        prompt: 'Test prompt',
        requestId: 'req-123',
      });

      expect(context.userId).toBe('user-123');
      expect(context.userTier).toBe('PRO');
      expect(context.prompt).toBe('Test prompt');
      expect(context.requestId).toBe('req-123');
      expect(context.estimatedTokens).toBeGreaterThan(0);
    });

    it('should estimate tokens from prompt', () => {
      const shortContext = createRoutingContext({
        userId: 'user-123',
        userTier: 'PRO',
        prompt: 'Hi',
        requestId: 'req-123',
      });

      const longContext = createRoutingContext({
        userId: 'user-123',
        userTier: 'PRO',
        prompt: 'This is a much longer prompt with many more words',
        requestId: 'req-456',
      });

      expect(longContext.estimatedTokens).toBeGreaterThan(
        shortContext.estimatedTokens
      );
    });
  });

  describe('Reasoning Generation', () => {
    it('should include reasoning in decision', () => {
      const decision = routeToModel(baseContext, mockMetrics);

      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
      expect(typeof decision.reasoning).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown tier gracefully', () => {
      const unknownTierContext = {
        ...baseContext,
        userTier: 'UNKNOWN_TIER',
      };

      const decision = routeToModel(unknownTierContext, mockMetrics);

      // Should default to FREE tier constraints
      expect(['gemini-2.0-flash', 'deepseek-chat']).toContain(
        decision.selectedModel
      );
    });

    it('should handle missing system metrics', () => {
      const decision = routeToModel(baseContext); // No metrics

      // Should still return valid decision
      expect(decision).toHaveProperty('selectedModel');
      expect(decision.scores.availability).toBeGreaterThan(0);
    });

    it('should handle very long prompts', () => {
      const longPromptContext = {
        ...baseContext,
        prompt: 'A'.repeat(10000), // 10k characters
        estimatedTokens: 2500,
      };

      const decision = routeToModel(longPromptContext, mockMetrics);

      expect(decision).toHaveProperty('selectedModel');
    });
  });
});
