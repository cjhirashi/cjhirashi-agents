'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  SendMessageRequest,
  SSEEvent,
  SSEStartEvent,
  SSEChunkEvent,
  SSEDoneEvent,
  SSEErrorEvent,
} from '@/types/chat';

/**
 * Options for useChat hook
 */
export interface UseChatOptions {
  sessionId: string;
  onError?: (error: Error) => void;
  onFinish?: (message: ChatMessage) => void;
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  ragEnabled?: boolean;
  temperature?: number;
  maxTokens?: number;
  selectedAgents?: string[];
}

/**
 * Return type for useChat hook
 */
export interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  setInput: (input: string) => void;
  sendMessage: (message: string, options?: SendMessageOptions) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
}

/**
 * Custom hook for chat with SSE streaming support
 */
export function useChat(options: UseChatOptions): UseChatReturn {
  const { sessionId, onError, onFinish } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<{
    id: string;
    content: string;
    role: 'assistant';
  } | null>(null);

  /**
   * Parse SSE event from text
   */
  const parseSSEEvent = (text: string): SSEEvent | null => {
    const lines = text.split('\n');
    let eventType = 'chunk'; // default
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.substring(5).trim();
      }
    }

    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return { type: eventType, ...parsed } as SSEEvent;
    } catch {
      return null;
    }
  };

  /**
   * Send message with SSE streaming
   */
  const sendMessage = useCallback(
    async (message: string, messageOptions?: SendMessageOptions) => {
      if (!message.trim()) return;
      if (isStreaming) return; // Prevent multiple concurrent streams

      setIsLoading(true);
      setIsStreaming(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: sessionId,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput(''); // Clear input

      try {
        const requestBody: SendMessageRequest = {
          sessionId,
          message,
          ragEnabled: messageOptions?.ragEnabled ?? true,
          temperature: messageOptions?.temperature,
          maxTokens: messageOptions?.maxTokens,
          selectedAgents: messageOptions?.selectedAgents,
        };

        const response = await fetch('/api/v1/chat/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to send message');
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            setIsStreaming(false);
            break;
          }

          // Decode chunk
          buffer += decoder.decode(value, { stream: true });

          // Split by double newlines (SSE event boundaries)
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer

          // Process each complete event
          for (const eventText of events) {
            if (!eventText.trim()) continue;

            const event = parseSSEEvent(eventText);
            if (!event) continue;

            switch (event.type) {
              case 'start': {
                const startEvent = event as SSEStartEvent;
                currentMessageRef.current = {
                  id: startEvent.messageId,
                  content: '',
                  role: 'assistant',
                };
                break;
              }

              case 'chunk': {
                const chunkEvent = event as SSEChunkEvent;
                if (currentMessageRef.current) {
                  currentMessageRef.current.content = chunkEvent.content;

                  // Update messages array with streaming content
                  setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'assistant') {
                      // Update existing assistant message
                      return [
                        ...prev.slice(0, -1),
                        {
                          ...lastMessage,
                          content: chunkEvent.content,
                        },
                      ];
                    } else {
                      // Add new assistant message
                      return [
                        ...prev,
                        {
                          id: currentMessageRef.current?.id || crypto.randomUUID(),
                          conversationId: sessionId,
                          role: 'assistant' as const,
                          content: chunkEvent.content,
                          timestamp: new Date(),
                        },
                      ];
                    }
                  });
                }
                break;
              }

              case 'done': {
                const doneEvent = event as SSEDoneEvent;
                if (currentMessageRef.current) {
                  const finalMessage: ChatMessage = {
                    id: doneEvent.messageId,
                    conversationId: sessionId,
                    role: 'assistant',
                    content: currentMessageRef.current.content,
                    tokensOutput: doneEvent.tokensUsed,
                    timestamp: new Date(doneEvent.completedAt),
                  };

                  // Update final message
                  setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'assistant') {
                      return [...prev.slice(0, -1), finalMessage];
                    }
                    return prev;
                  });

                  // Call onFinish callback
                  onFinish?.(finalMessage);

                  currentMessageRef.current = null;
                }
                setIsStreaming(false);
                break;
              }

              case 'error': {
                const errorEvent = event as SSEErrorEvent;
                const err = new Error(errorEvent.error.message);
                setError(err);
                onError?.(err);
                setIsStreaming(false);
                break;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was aborted by user
            console.log('Request aborted');
          } else {
            setError(err);
            onError?.(err);
          }
        }
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, isStreaming, onError, onFinish]
  );

  /**
   * Stop current streaming
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  /**
   * Reload last message (retry)
   */
  const reload = useCallback(async () => {
    // Find last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (lastUserMessage) {
      // Remove messages after last user message
      const lastUserIndex = messages.lastIndexOf(lastUserMessage);
      setMessages((prev) => prev.slice(0, lastUserIndex + 1));

      // Resend message
      await sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    input,
    isLoading,
    isStreaming,
    error,
    setInput,
    sendMessage,
    stop,
    reload,
  };
}
