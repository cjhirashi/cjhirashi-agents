'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChatSession, ChatSessionListItem } from '@/types/chat';

/**
 * Return type for useChatSession hook
 */
export interface UseChatSessionReturn {
  sessions: ChatSessionListItem[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: Error | null;
  createSession: (title?: string) => Promise<ChatSession>;
  deleteSession: (sessionId: string) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

/**
 * Custom hook for managing chat sessions
 */
export function useChatSession(): UseChatSessionReturn {
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all sessions from API
   */
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/chat/sessions?limit=100&sortBy=lastActivity&order=desc');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch sessions');
      }

      const data = await response.json();
      const sessionsList: ChatSessionListItem[] = data.data.sessions.map((s: ChatSessionListItem) => ({
        id: s.id,
        title: s.title || 'New Chat',
        messageCount: s.messageCount,
        lastMessage: s.lastMessage,
        lastActivity: new Date(s.lastActivity),
        createdAt: new Date(s.createdAt),
      }));

      setSessions(sessionsList);
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create new session
   */
  const createSession = useCallback(
    async (title?: string): Promise<ChatSession> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/chat/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create session');
        }

        const data = await response.json();
        const newSession: ChatSession = {
          id: data.data.id,
          userId: data.data.userId,
          title: data.data.title,
          agentIds: data.data.agentIds,
          startedAt: new Date(data.data.startedAt),
          lastActivity: new Date(data.data.lastActivity),
          messageCount: 0,
        };

        // Refresh sessions list
        await fetchSessions();

        // Set as active session
        setActiveSessionId(newSession.id);

        return newSession;
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
          throw err;
        }
        throw new Error('Failed to create session');
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSessions]
  );

  /**
   * Delete session
   */
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/chat/sessions/${sessionId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to delete session');
        }

        // If deleted session was active, clear active session
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
        }

        // Refresh sessions list
        await fetchSessions();
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
          throw err;
        }
        throw new Error('Failed to delete session');
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId, fetchSessions]
  );

  /**
   * Select session as active
   */
  const selectSession = useCallback(async (sessionId: string): Promise<void> => {
    setActiveSessionId(sessionId);
  }, []);

  /**
   * Refresh sessions list
   */
  const refreshSessions = useCallback(async (): Promise<void> => {
    await fetchSessions();
  }, [fetchSessions]);

  /**
   * Load sessions on mount
   */
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    activeSessionId,
    isLoading,
    error,
    createSession,
    deleteSession,
    selectSession,
    refreshSessions,
  };
}
