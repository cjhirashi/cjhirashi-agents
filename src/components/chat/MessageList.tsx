'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './MessageItem';
import { ChatMessage } from '@/types/chat';
import { useEffect, useRef } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';

export interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <MessageSquare className="size-16 opacity-20" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="text-sm">
            Send a message to begin chatting with AI assistants
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full">
      <div ref={scrollRef} className="flex flex-col">
        {/* Messages */}
        {messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            isStreaming={isStreaming && index === messages.length - 1}
          />
        ))}

        {/* Loading indicator during streaming */}
        {isStreaming && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Generating response...</span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-4" />
      </div>
    </ScrollArea>
  );
}
