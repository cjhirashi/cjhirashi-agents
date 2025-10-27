/**
 * Custom Agent Executor
 *
 * Core execution engine for user-created custom agents
 *
 * Architecture: ADR-010 (Inline Execution Pattern)
 * Features:
 * - Executes agents with custom system prompts
 * - Integrates with LLM Router for model selection
 * - Supports SSE streaming
 * - Timeout handling with AbortController
 * - Cost and token tracking
 *
 * Related:
 * - sys-docs/architecture/ADR-010-custom-agent-execution.md
 * - src/lib/ai/router.ts (LLM routing)
 * - src/app/api/v1/chat/send/route.ts (similar pattern)
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import logger from '@/lib/logging/logger';
import { ApiError } from '@/lib/errors/ApiError';
import { routeToModel, createRoutingContext } from '@/lib/ai/router';
import type { agents } from '@prisma/client';
import type { AgentExecuteRequest } from '@/lib/validations/agent';

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface ExecuteAgentOptions {
  /** agents configuration from database */
  agent: agents;

  /** User ID executing the agent */
  userId: string;

  /** User tier for LLM routing */
  userTier: string;

  /** User message to send to agent */
  message: string;

  /** Temperature (0-2, default 0.7) */
  temperature?: number;

  /** Max tokens to generate (1-8192, default 4096) */
  maxTokens?: number;

  /** Timeout in seconds (5-60, default 30) */
  timeout?: number;
}

export interface AgentExecutionResult {
  /** Full response content */
  content: string;

  /** Tokens used */
  tokensUsed: number;

  /** Prompt tokens */
  promptTokens: number;

  /** Completion tokens */
  completionTokens: number;

  /** Cost in USD */
  cost: number;

  /** Model used */
  modelId: string;

  /** Model provider */
  provider: string;

  /** Execution duration (ms) */
  duration: number;
}

// ═══════════════════════════════════════════════════════════
// ANTHROPIC CLIENT INITIALIZATION
// ═══════════════════════════════════════════════════════════

/**
 * Get Anthropic client (deferred to runtime)
 */
function getAnthropicClient() {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    logger.error('[Agent Executor] ANTHROPIC_API_KEY not configured');
    throw new ApiError(
      'AI service configuration error',
      500,
      'SERVICE_CONFIG_ERROR'
    );
  }

  return createAnthropic({
    apiKey: ANTHROPIC_API_KEY
  });
}

// ═══════════════════════════════════════════════════════════
// MODEL PRICING (Claude 3.5 Sonnet)
// ═══════════════════════════════════════════════════════════

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0 // $15 per 1M output tokens
  },
  'claude-3-5-haiku-20241022': {
    input: 0.8, // $0.80 per 1M input tokens
    output: 4.0 // $4 per 1M output tokens
  },
  'claude-3-opus-20240229': {
    input: 15.0, // $15 per 1M input tokens
    output: 75.0 // $75 per 1M output tokens
  }
};

/**
 * Calculate cost based on token usage and model
 */
function calculateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[modelId] || MODEL_PRICING['claude-3-5-sonnet-20241022'];

  const inputCost = (promptTokens / 1000000) * pricing.input;
  const outputCost = (completionTokens / 1000000) * pricing.output;

  return inputCost + outputCost;
}

// ═══════════════════════════════════════════════════════════
// CORE EXECUTOR
// ═══════════════════════════════════════════════════════════

/**
 * Execute a custom agent (non-streaming version)
 *
 * This function executes an agent and returns the complete result.
 * For streaming, use executeAgentStream() instead.
 *
 * @param options - Execution options
 * @returns Execution result with content, tokens, cost
 */
export async function executeAgent(
  options: ExecuteAgentOptions
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const {
    agent,
    userId,
    userTier,
    message,
    temperature = 0.7,
    maxTokens = 4096,
    timeout = 30
  } = options;

  const executionId = crypto.randomUUID();

  logger.info('[Agent Executor] Starting execution', {
    executionId,
    agentId: agent.id,
    agentName: agent.name,
    userId,
    userTier,
    messageLength: message.length,
    timeout
  });

  try {
    // 1. Model selection via LLM Router
    const routingContext = createRoutingContext({
      userId,
      userTier,
      prompt: message,
      requestId: executionId
    });

    const routingDecision = routeToModel(routingContext);
    const modelId = routingDecision.selectedModel;
    const provider = routingDecision.provider;

    logger.info('[Agent Executor] Model selected', {
      executionId,
      model: modelId,
      provider,
      reasoning: routingDecision.reasoning,
      qualityScore: routingDecision.scores.quality,
      costScore: routingDecision.scores.cost,
      availabilityScore: routingDecision.scores.availability,
      finalScore: routingDecision.scores.final
    });

    // 2. Create AbortController for timeout
    const abortController = new AbortController();
    const timeoutMs = timeout * 1000;

    const timeoutId = setTimeout(() => {
      abortController.abort();
      logger.warn('[Agent Executor] Execution timeout', {
        executionId,
        agentId: agent.id,
        timeout
      });
    }, timeoutMs);

    try {
      // 3. Stream from LLM
      const anthropic = getAnthropicClient();
      const result = await streamText({
        model: anthropic(modelId),
        system: agent.systemPrompt || undefined,
        prompt: message,
        temperature,
        abortSignal: abortController.signal
      });

      // 4. Collect full response
      let fullContent = '';
      for await (const chunk of result.textStream) {
        fullContent += chunk;
      }

      // 5. Get usage metrics
      const usage = (await result.usage) as {
        totalTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
      };

      const tokensUsed = usage.totalTokens || 0;
      const promptTokens = usage.promptTokens || 0;
      const completionTokens = usage.completionTokens || 0;

      // 6. Calculate cost
      const cost = calculateCost(modelId, promptTokens, completionTokens);

      const duration = Date.now() - startTime;

      logger.info('[Agent Executor] Execution completed', {
        executionId,
        agentId: agent.id,
        tokensUsed,
        cost,
        duration
      });

      return {
        content: fullContent,
        tokensUsed,
        promptTokens,
        completionTokens,
        cost,
        modelId,
        provider,
        duration
      };
    } finally {
      // Clear timeout
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    // Check if timeout abort
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('[Agent Executor] Execution timeout', {
        executionId,
        agentId: agent.id,
        timeout,
        duration
      });

      throw new ApiError(
        `Agent execution timed out after ${timeout} seconds`,
        408,
        'EXECUTION_TIMEOUT'
      );
    }

    logger.error('[Agent Executor] Execution error', {
      executionId,
      agentId: agent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration
    });

    throw new ApiError(
      'Agent execution failed',
      500,
      'EXECUTION_ERROR',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * Execute a custom agent with SSE streaming
 *
 * Returns a ReadableStream that emits Server-Sent Events for real-time streaming.
 * Event types: start, chunk, done, error
 *
 * @param options - Execution options
 * @returns ReadableStream for SSE
 */
export function executeAgentStream(
  options: ExecuteAgentOptions
): ReadableStream<Uint8Array> {
  const startTime = Date.now();
  const {
    agent,
    userId,
    userTier,
    message,
    temperature = 0.7,
    maxTokens = 4096,
    timeout = 30
  } = options;

  const executionId = crypto.randomUUID();

  logger.info('[Agent Executor] Starting streaming execution', {
    executionId,
    agentId: agent.id,
    agentName: agent.name,
    userId,
    userTier,
    messageLength: message.length,
    timeout
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // 1. Model selection via LLM Router
        const routingContext = createRoutingContext({
          userId,
          userTier,
          prompt: message,
          requestId: executionId
        });

        const routingDecision = routeToModel(routingContext);
        const modelId = routingDecision.selectedModel;
        const provider = routingDecision.provider;

        logger.info('[Agent Executor] Model selected for streaming', {
          executionId,
          model: modelId,
          provider,
          reasoning: routingDecision.reasoning
        });

        // 2. Send start event
        const startEvent = `event: start\ndata: ${JSON.stringify({
          executionId,
          agentId: agent.id,
          agentName: agent.name,
          modelId,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(startEvent));

        // 3. Create AbortController for timeout
        const abortController = new AbortController();
        const timeoutMs = timeout * 1000;

        const timeoutId = setTimeout(() => {
          abortController.abort();
          logger.warn('[Agent Executor] Streaming timeout', {
            executionId,
            agentId: agent.id,
            timeout
          });
        }, timeoutMs);

        try {
          // 4. Stream from LLM
          const anthropic = getAnthropicClient();
          const result = await streamText({
            model: anthropic(modelId),
            system: agent.systemPrompt || undefined,
            prompt: message,
            temperature,
            abortSignal: abortController.signal
          });

          let fullContent = '';

          // 5. Stream chunks
          for await (const chunk of result.textStream) {
            fullContent += chunk;
            const chunkEvent = `event: chunk\ndata: ${JSON.stringify({
              content: fullContent,
              delta: chunk
            })}\n\n`;
            controller.enqueue(encoder.encode(chunkEvent));
          }

          // 6. Get usage metrics
          const usage = (await result.usage) as {
            totalTokens?: number;
            promptTokens?: number;
            completionTokens?: number;
          };

          const tokensUsed = usage.totalTokens || 0;
          const promptTokens = usage.promptTokens || 0;
          const completionTokens = usage.completionTokens || 0;

          // 7. Calculate cost
          const cost = calculateCost(modelId, promptTokens, completionTokens);

          const duration = Date.now() - startTime;

          logger.info('[Agent Executor] Streaming completed', {
            executionId,
            agentId: agent.id,
            tokensUsed,
            cost,
            duration
          });

          // 8. Send done event
          const doneEvent = `event: done\ndata: ${JSON.stringify({
            executionId,
            tokensUsed,
            promptTokens,
            completionTokens,
            cost,
            duration,
            completedAt: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));

          controller.close();
        } finally {
          // Clear timeout
          clearTimeout(timeoutId);
        }
      } catch (error) {
        const duration = Date.now() - startTime;

        // Check if timeout abort
        if (error instanceof Error && error.name === 'AbortError') {
          logger.error('[Agent Executor] Streaming timeout', {
            executionId,
            agentId: agent.id,
            timeout,
            duration
          });

          const errorEvent = `event: error\ndata: ${JSON.stringify({
            error: `Agent execution timed out after ${timeout} seconds`,
            code: 'EXECUTION_TIMEOUT',
            executionId
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } else {
          logger.error('[Agent Executor] Streaming error', {
            executionId,
            agentId: agent.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            duration
          });

          const errorEvent = `event: error\ndata: ${JSON.stringify({
            error: 'Agent execution failed',
            code: 'EXECUTION_ERROR',
            executionId
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        }

        controller.close();
      }
    }
  });
}
