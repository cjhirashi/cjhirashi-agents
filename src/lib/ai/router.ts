/**
 * LLM Hybrid Router
 *
 * Implements the hybrid routing algorithm (40% quality, 30% cost, 30% availability)
 * to select the optimal LLM model based on context.
 *
 * Scoring Formula:
 * finalScore = 0.4 * qualityScore + 0.3 * costScore + 0.3 * availabilityScore
 */

import type {
  RoutingContext,
  RoutingDecision,
  ModelScore,
  SystemMetrics,
  LLMModel,
} from '@/types/llm';
import { MODELS, isValidModel } from './models';
import { estimateTokens } from './tokens';
import logger from '@/lib/logging/logger';

/**
 * Weights for hybrid scoring
 */
const WEIGHTS = {
  QUALITY: 0.4,
  COST: 0.3,
  AVAILABILITY: 0.3,
};

/**
 * Tier-based model constraints
 *
 * FREE: Only economical models
 * PRO: All except most expensive
 * ENTERPRISE: All models available
 */
function getTierConstraints(tier: string): LLMModel[] {
  switch (tier.toUpperCase()) {
    case 'FREE':
      return ['gemini-2.0-flash', 'deepseek-chat'];
    case 'PRO':
      return [
        'claude-3.5-sonnet-20241022',
        'gpt-4o',
        'gemini-2.0-flash',
        'deepseek-chat',
      ];
    case 'ENTERPRISE':
      return [
        'claude-3.5-sonnet-20241022',
        'gpt-4o',
        'gemini-2.0-flash',
        'deepseek-chat',
      ];
    default:
      // Default to FREE tier constraints
      return ['gemini-2.0-flash', 'deepseek-chat'];
  }
}

/**
 * Calculate quality score (0-1)
 *
 * Based on:
 * - Base model quality score
 * - Boost for code tasks (Claude +0.1)
 * - Boost for analysis tasks (GPT-4o +0.05)
 * - Penalty for high latency (>2000ms: -0.1)
 */
function getQualityScore(
  model: LLMModel,
  context: RoutingContext
): number {
  const config = MODELS[model];
  if (!config) return 0;

  let score = config.quality;

  // Boost Claude for code tasks
  if (
    context.prompt.toLowerCase().includes('code') &&
    model.includes('claude')
  ) {
    score += 0.1;
  }

  // Boost GPT-4o for analysis tasks
  if (
    (context.prompt.toLowerCase().includes('analiz') ||
      context.prompt.toLowerCase().includes('explain')) &&
    model.includes('gpt')
  ) {
    score += 0.05;
  }

  // Penalty for high latency
  if (config.avgLatency > 2000) {
    score -= 0.1;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate cost score (0-1)
 *
 * Inverse score: lower cost = higher score
 * Max cost reference: $0.01 per 1k tokens
 */
function getCostScore(
  model: LLMModel,
  estimatedTokens: number
): number {
  const config = MODELS[model];
  if (!config) return 0;

  const cost = (estimatedTokens / 1000) * config.costPer1kTokens;
  const maxCost = 0.01; // $0.01 considered expensive

  // Inverse score: cheaper = better
  const score = 1 - Math.min(1, cost / maxCost);

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate availability score (0-1)
 *
 * Based on:
 * - Uptime (from system metrics)
 * - Current latency
 * - Queue depth
 */
function getAvailabilityScore(
  model: LLMModel,
  systemMetrics?: SystemMetrics
): number {
  if (!systemMetrics || !systemMetrics[model]) {
    // Default score if no metrics available
    return 0.8;
  }

  const metrics = systemMetrics[model];
  let score = 1.0;

  // Penalize downtime
  score -= (1 - metrics.uptime) * 0.5;

  // Penalize high latency
  if (metrics.currentLatency > 3000) {
    score -= 0.3;
  } else if (metrics.currentLatency > 1500) {
    score -= 0.1;
  }

  // Penalize high queue depth
  if (metrics.queueDepth > 100) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate final score for a model
 */
function calculateFinalScore(
  model: LLMModel,
  context: RoutingContext,
  systemMetrics?: SystemMetrics
): ModelScore {
  const quality = getQualityScore(model, context);
  const cost = getCostScore(model, context.estimatedTokens);
  const availability = getAvailabilityScore(model, systemMetrics);

  const final =
    WEIGHTS.QUALITY * quality +
    WEIGHTS.COST * cost +
    WEIGHTS.AVAILABILITY * availability;

  return {
    model,
    quality,
    cost,
    availability,
    final,
  };
}

/**
 * Generate reasoning for routing decision
 */
function generateReasoning(
  score: ModelScore,
  context: RoutingContext
): string {
  const parts: string[] = [];

  // Quality reasoning
  if (score.quality > 0.9) {
    parts.push('High-quality model selected for best results');
  } else if (score.quality < 0.7) {
    parts.push('Budget model selected to optimize cost');
  }

  // Cost reasoning
  if (score.cost > 0.8) {
    parts.push('Cost-efficient option');
  } else if (score.cost < 0.5) {
    parts.push('Higher cost justified by quality/requirements');
  }

  // Tier reasoning
  if (context.userTier === 'FREE') {
    parts.push('Free tier constraints applied');
  } else if (context.userTier === 'ENTERPRISE') {
    parts.push('Enterprise tier - all models available');
  }

  return parts.join('. ');
}

/**
 * Log routing attempt (for monitoring/debugging)
 */
export function logRoutingAttempt(data: {
  requestId: string;
  model: LLMModel;
  success: boolean;
  error?: string;
  attempt: number;
}): void {
  // Log routing attempt for monitoring/debugging
  logger.info('LLM routing attempt', {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Main routing function
 *
 * Selects the optimal model based on hybrid scoring algorithm
 */
export function routeToModel(
  context: RoutingContext,
  systemMetrics?: SystemMetrics
): RoutingDecision {
  // Get allowed models based on user tier
  const allowedModels = getTierConstraints(context.userTier);

  // Calculate scores for all allowed models
  const scores = allowedModels.map((model) =>
    calculateFinalScore(model, context, systemMetrics)
  );

  // Sort by final score (descending)
  const sorted = scores.sort((a, b) => b.final - a.final);

  // Select best model
  const best = sorted[0];
  const fallbacks = sorted.slice(1).map((s) => s.model);

  // Get provider
  const config = MODELS[best.model];
  const provider = config?.provider || 'anthropic';

  return {
    selectedModel: best.model,
    provider,
    scores: best,
    reasoning: generateReasoning(best, context),
    fallbacks,
  };
}

/**
 * Create routing context from request data
 */
export function createRoutingContext(data: {
  userId: string;
  userTier: string;
  prompt: string;
  requestId: string;
}): RoutingContext {
  return {
    userId: data.userId,
    userTier: data.userTier,
    prompt: data.prompt,
    estimatedTokens: estimateTokens(data.prompt),
    requestId: data.requestId,
  };
}
