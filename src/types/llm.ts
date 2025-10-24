/**
 * LLM Types
 *
 * Types for multi-LLM routing and model management
 */

/**
 * Supported LLM Models
 */
export type LLMModel =
  | 'claude-3.5-sonnet-20241022'
  | 'gpt-4o'
  | 'gemini-2.0-flash'
  | 'deepseek-chat';

/**
 * LLM Provider
 */
export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'deepseek';

/**
 * Model Configuration
 */
export interface ModelConfig {
  model: LLMModel;
  provider: LLMProvider;
  quality: number; // 0-1 score
  costPer1kTokens: number;
  avgLatency: number; // milliseconds
  capabilities: string[];
  maxTokens: number;
}

/**
 * Routing Context
 */
export interface RoutingContext {
  userId: string;
  userTier: string;
  prompt: string;
  estimatedTokens: number;
  requestId: string;
}

/**
 * Model Score
 */
export interface ModelScore {
  model: LLMModel;
  quality: number;
  cost: number;
  availability: number;
  final: number;
}

/**
 * Routing Decision
 */
export interface RoutingDecision {
  selectedModel: LLMModel;
  provider: LLMProvider;
  scores: ModelScore;
  reasoning: string;
  fallbacks: LLMModel[];
}

/**
 * LLM Completion Request
 */
export interface LLMCompletionRequest {
  model: LLMModel;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * LLM Completion Response
 */
export interface LLMCompletionResponse {
  content: string;
  model: LLMModel;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  cost: number;
  latency: number; // milliseconds
}

/**
 * System Metrics (for availability scoring)
 */
export interface SystemMetrics {
  [model: string]: {
    uptime: number; // 0-1
    currentLatency: number; // milliseconds
    queueDepth: number;
  };
}
