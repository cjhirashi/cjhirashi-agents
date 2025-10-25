'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useChatSession } from '@/hooks/useChatSession';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);

  // Session management
  const {
    sessions,
    activeSessionId,
    isLoading: isSessionLoading,
    createSession,
    deleteSession,
    selectSession,
  } = useChatSession();

  // Chat management (only initialized when session is active)
  const chat = useChat({
    sessionId: activeSessionId || '',
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onFinish: () => {
      // Optional: Show success toast or refresh session list
    },
  });

  // Auto-create session if none exists
  useEffect(() => {
    const initialize = async () => {
      if (!isSessionLoading && sessions.length === 0 && !activeSessionId) {
        try {
          await createSession('New Chat');
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to create initial session',
            variant: 'destructive',
          });
        }
      }
      setIsInitializing(false);
    };

    initialize();
  }, [isSessionLoading, sessions.length, activeSessionId, createSession, toast]);

  const handleCreateSession = async () => {
    try {
      await createSession('New Chat');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create new session',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      toast({
        title: 'Success',
        description: 'Conversation deleted',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!chat.input.trim()) return;
    if (!activeSessionId) {
      toast({
        title: 'Error',
        description: 'No active session. Please create a new chat.',
        variant: 'destructive',
      });
      return;
    }

    await chat.sendMessage(chat.input, {
      ragEnabled: true,
      temperature: 0.7,
      maxTokens: 4096,
    });
  };

  // Show loading state while initializing
  if (isInitializing || isSessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar - Chat History */}
      <div className="w-64 shrink-0 hidden md:block">
        <ChatHistory
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={selectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          isLoading={isSessionLoading}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
          />
        </div>

        {/* Input Area */}
        <ChatInput
          value={chat.input}
          onChange={chat.setInput}
          onSend={handleSendMessage}
          onStop={chat.stop}
          isLoading={chat.isLoading}
          isStreaming={chat.isStreaming}
          placeholder={
            activeSessionId
              ? 'Type a message...'
              : 'Create a new chat to get started'
          }
        />
      </div>
    </div>
  );
}
