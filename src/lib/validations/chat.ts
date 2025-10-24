/**
 * Chat API Validation Schemas
 *
 * Zod schemas para validación de endpoints de chat
 */

import { z } from 'zod';

/**
 * POST /api/v1/chat/send
 */
export const ChatSendRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message exceeds maximum length of 10000 characters'),
  selectedAgents: z.array(z.string().uuid()).max(3, 'Maximum 3 agents allowed').optional(),
  ragEnabled: z.boolean().default(true),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(8192).default(4096)
});

export type ChatSendRequest = z.infer<typeof ChatSendRequestSchema>;

/**
 * POST /api/v1/chat/sessions
 */
export const CreateSessionSchema = z.object({
  title: z.string().max(500, 'Title exceeds maximum length of 500 characters').optional(),
  agentIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;

/**
 * GET /api/v1/chat/sessions
 */
export const ListSessionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'lastActivity']).default('lastActivity'),
  order: z.enum(['asc', 'desc']).default('desc')
});

export type ListSessionsQuery = z.infer<typeof ListSessionsSchema>;

/**
 * GET /api/v1/chat/history/[sessionId]
 */
export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  before: z.coerce.date().optional()
});

export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
