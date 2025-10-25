/**
 * Vercel AI SDK Integration
 *
 * Provides unified interface for calling different LLM providers
 * with fallback strategy (max 3 attempts, 30s timeout per attempt).
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type {
  LLMModel,
  LLMProvider,
  LLMCompletionRequest,
  LLMCompletionResponse,
  RoutingDecision,
} from '@/types/llm';
import { logRoutingAttempt } from './router';
import { calculateCost } from './tokens';
import { MODELS } from './models';
import logger from '@/lib/logging/logger';

/**
 * Timeout duration (30 seconds)
 */
const TIMEOUT_MS = 30000;

/**
 * Maximum fallback attempts
 */
const MAX_ATTEMPTS = 3;

/**
 * Create Anthropic provider
 */
function createAnthropicProvider() {
  return createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });
}

/**
 * Create OpenAI provider
 */
function createOpenAIProvider() {
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

/**
 * Create Google Generative AI provider
 */
function createGoogleProvider() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || '',
  });
}

/**
 * Create DeepSeek provider (uses OpenAI-compatible API)
 */
function createDeepSeekProvider() {
  return createOpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  });
}

/**
 * Get provider instance by provider type
 */
function getProvider(provider: LLMProvider) {
  switch (provider) {
    case 'anthropic':
      return createAnthropicProvider();
    case 'openai':
      return createOpenAIProvider();
    case 'google':
      return createGoogleProvider();
    case 'deepseek':
      return createDeepSeekProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get model string for provider
 */
function getModelString(model: LLMModel): string {
  // For most providers, the model ID is the same
  // Adjust if needed for specific providers
  return model;
}

/**
 * Call LLM with timeout
 *
 * @param model - Model to use
 * @param request - Completion request
 * @returns Completion response
 */
async function callLLM(
  model: LLMModel,
  request: LLMCompletionRequest
): Promise<LLMCompletionResponse> {
  const config = MODELS[model];
  if (!config) {
    throw new Error(`Model not found: ${model}`);
  }

  const provider = getProvider(config.provider);
  const modelString = getModelString(model);

  const startTime = Date.now();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS);
    });

    // Call LLM (non-streaming for now)
    const completionPromise = generateText({
      model: provider(modelString),
      prompt: request.prompt,
      system: request.systemPrompt,
      temperature: request.temperature || 0.7,
      // Note: maxTokens not supported in current AI SDK version, using model defaults
    });

    // Race against timeout
    const result = await Promise.race([
      completionPromise,
      timeoutPromise,
    ]);

    const endTime = Date.now();
    const latency = endTime - startTime;

    // Calculate cost
    // @ts-expect-error - AI SDK usage types are inconsistent across versions
    const inputTokens = result.usage.promptTokens || result.usage.inputTokens || 0;
    // @ts-expect-error - AI SDK usage types are inconsistent across versions
    const outputTokens = result.usage.completionTokens || result.usage.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Use average cost for simplicity (in production, use separate input/output costs)
    const cost = calculateCost(totalTokens, config.costPer1kTokens);

    return {
      content: result.text,
      model,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      totalTokens,
      cost,
      latency,
    };
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;

    // Log internally with full details
    logger.error('LLM call failed', {
      model,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency,
      requestId: request.prompt.substring(0, 50),
    });

    // Throw sanitized error (no internal info leakage)
    throw new Error('AI service temporarily unavailable. Please try again.');
  }
}

/**
 * Call model with fallback strategy
 *
 * Tries primary model, then fallbacks if it fails.
 * Max 3 attempts, 30s timeout per attempt.
 *
 * @param routing - Routing decision with fallbacks
 * @param request - Completion request
 * @returns Completion response
 */
export async function callModelWithFallback(
  routing: RoutingDecision,
  request: LLMCompletionRequest
): Promise<LLMCompletionResponse> {
  const models = [routing.selectedModel, ...routing.fallbacks];
  let lastError: Error | null = null;

  for (let i = 0; i < Math.min(models.length, MAX_ATTEMPTS); i++) {
    const model = models[i];

    try {
      // Log attempt
      logRoutingAttempt({
        requestId: request.prompt.substring(0, 50), // Use prompt prefix as requestId
        model,
        success: false,
        attempt: i + 1,
      });

      // Call LLM
      const response = await callLLM(model, request);

      // Log success
      logRoutingAttempt({
        requestId: request.prompt.substring(0, 50),
        model,
        success: true,
        attempt: i + 1,
      });

      return response;
    } catch (error) {
      lastError = error as Error;

      // Log failure
      logRoutingAttempt({
        requestId: request.prompt.substring(0, 50),
        model,
        success: false,
        error: lastError.message,
        attempt: i + 1,
      });

      logger.error('LLM model call failed', {
        model,
        error: lastError.message,
        attempt: i + 1,
        maxAttempts: MAX_ATTEMPTS,
      });

      // Continue to next fallback
    }
  }

  // All models failed
  throw new Error(
    `All models failed after ${MAX_ATTEMPTS} attempts. Last error: ${
      lastError?.message || 'Unknown error'
    }`
  );
}

/**
 * Call model with streaming (for future use)
 *
 * Note: Streaming implementation would go here
 * For now, placeholder that throws
 */
export async function callModelWithStreaming(
  routing: RoutingDecision,
  request: LLMCompletionRequest
): Promise<ReadableStream> {
  throw new Error('Streaming not yet implemented');

  // Future implementation:
  // const config = MODELS[routing.selectedModel];
  // const provider = getProvider(config.provider);
  // const result = await streamText({
  //   model: provider(routing.selectedModel),
  //   prompt: request.prompt,
  //   system: request.systemPrompt,
  // });
  // return result.toAIStream();
}
