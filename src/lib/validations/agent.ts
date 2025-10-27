/**
 * Custom Agent Validation Schemas
 *
 * Zod schemas for custom agent execution and management
 *
 * Related: sys-docs/architecture/ADR-010-custom-agent-execution.md
 */

import { z } from 'zod';

/**
 * POST /api/v1/agents/[agentId]/execute
 *
 * Execute a custom agent with a user message
 */
export const AgentExecuteRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message exceeds maximum length of 10000 characters'),

  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature cannot exceed 2')
    .default(0.7)
    .optional(),

  maxTokens: z
    .number()
    .int('Max tokens must be an integer')
    .min(1, 'Max tokens must be at least 1')
    .max(8192, 'Max tokens cannot exceed 8192')
    .default(4096)
    .optional(),

  timeout: z
    .number()
    .int('Timeout must be an integer')
    .min(5, 'Timeout must be at least 5 seconds')
    .max(60, 'Timeout cannot exceed 60 seconds for MVP')
    .default(30)
    .optional(),

  stream: z
    .boolean()
    .default(true)
    .optional()
});

export type AgentExecuteRequest = z.infer<typeof AgentExecuteRequestSchema>;

/**
 * Response types for agent execution
 */
export interface AgentExecuteStartEvent {
  executionId: string;
  agentId: string;
  agentName: string;
  modelId: string;
  timestamp: string;
}

export interface AgentExecuteChunkEvent {
  content: string;
  delta: string;
}

export interface AgentExecuteDoneEvent {
  executionId: string;
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  duration: number;
  completedAt: string;
}

export interface AgentExecuteErrorEvent {
  error: string;
  code: string;
  executionId?: string;
}
