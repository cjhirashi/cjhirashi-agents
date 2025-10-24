/**
 * LLM Model Configurations
 *
 * Defines the 4 supported models with their quality scores, costs, and capabilities.
 * Used by the Hybrid Router to select the optimal model based on context.
 */

import type { ModelConfig } from '@/types/llm';

/**
 * Model Database
 *
 * Quality scores based on:
 * - Claude 3.5 Sonnet: Best for code, analysis, technical tasks (0.95)
 * - GPT-4o: Versatile, good all-around (0.92)
 * - Gemini 2.0 Flash: Fast, economical, multimodal (0.88)
 * - DeepSeek: Budget alternative (0.85)
 *
 * Cost per 1k tokens (input + output average):
 * - Claude: $0.003 input, $0.015 output → avg $0.009
 * - GPT-4o: $0.0025 input, $0.010 output → avg $0.00625
 * - Gemini: $0.00015 input, $0.0006 output → avg $0.000375
 * - DeepSeek: $0.00014 input, $0.00028 output → avg $0.00021
 */
export const MODELS: Record<string, ModelConfig> = {
  'claude-3.5-sonnet-20241022': {
    model: 'claude-3.5-sonnet-20241022',
    provider: 'anthropic',
    quality: 0.95,
    costPer1kTokens: 0.009, // Average of input/output
    avgLatency: 800,
    capabilities: [
      'code',
      'analysis',
      'reasoning',
      'long-context',
      'function-calling',
    ],
    maxTokens: 200000, // 200k context window
  },
  'gpt-4o': {
    model: 'gpt-4o',
    provider: 'openai',
    quality: 0.92,
    costPer1kTokens: 0.00625, // Average of input/output
    avgLatency: 1200,
    capabilities: [
      'general',
      'reasoning',
      'creative',
      'function-calling',
      'vision',
    ],
    maxTokens: 128000, // 128k context window
  },
  'gemini-2.0-flash': {
    model: 'gemini-2.0-flash',
    provider: 'google',
    quality: 0.88,
    costPer1kTokens: 0.000375, // Average of input/output
    avgLatency: 500,
    capabilities: [
      'fast',
      'multimodal',
      'vision',
      'general',
      'long-context',
    ],
    maxTokens: 1000000, // 1M context window
  },
  'deepseek-chat': {
    model: 'deepseek-chat',
    provider: 'deepseek',
    quality: 0.85,
    costPer1kTokens: 0.00021, // Average of input/output
    avgLatency: 1500,
    capabilities: ['general', 'budget', 'code'],
    maxTokens: 64000, // 64k context window
  },
};

/**
 * Get model configuration by model name
 */
export function getModelConfig(model: string): ModelConfig | undefined {
  return MODELS[model];
}

/**
 * Get all available models
 */
export function getAllModels(): ModelConfig[] {
  return Object.values(MODELS);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(
  provider: string
): ModelConfig[] {
  return Object.values(MODELS).filter((m) => m.provider === provider);
}

/**
 * Check if model exists
 */
export function isValidModel(model: string): boolean {
  return model in MODELS;
}
