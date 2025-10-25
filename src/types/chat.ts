/**
 * Chat Types
 *
 * Types for chat sessions, messages, and streaming
 */

/**
 * Chat Message Role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat Session
 */
export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  agentIds?: string[];
  startedAt: Date;
  lastActivity: Date;
  messageCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Chat Message
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokensInput?: number;
  tokensOutput?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Send Message Request
 */
export interface SendMessageRequest {
  sessionId: string;
  message: string;
  selectedAgents?: string[];
  ragEnabled?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/**
 * SSE Event Types
 */
export type SSEEventType = 'start' | 'chunk' | 'done' | 'error';

/**
 * SSE Event - Start
 */
export interface SSEStartEvent {
  type: 'start';
  messageId: string;
  timestamp: string;
}

/**
 * SSE Event - Chunk
 */
export interface SSEChunkEvent {
  type: 'chunk';
  content: string;
  delta: string;
}

/**
 * SSE Event - Done
 */
export interface SSEDoneEvent {
  type: 'done';
  messageId: string;
  tokensUsed: number;
  cost: number;
  completedAt: string;
}

/**
 * SSE Event - Error
 */
export interface SSEErrorEvent {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

/**
 * Union type for all SSE events
 */
export type SSEEvent = SSEStartEvent | SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;

/**
 * Chat Session List Response
 */
export interface ChatSessionListItem {
  id: string;
  title?: string;
  messageCount: number;
  lastMessage?: string;
  lastActivity: Date;
  createdAt: Date;
}

/**
 * Chat History Item
 */
export interface ChatHistoryItem {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentId?: string;
  tokensUsed?: number;
}
