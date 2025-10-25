'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/types/chat';
import { Copy, User, Bot, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface MessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming = false }: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className="size-8 shrink-0">
        {isUser ? (
          <>
            <AvatarImage src="/avatar.png" alt="User" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="size-4" />
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="size-4" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'relative rounded-lg px-4 py-3 break-words',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
            isStreaming && 'animate-pulse'
          )}
        >
          {/* Content */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>

          {/* Copy Button (only for assistant messages) */}
          {!isUser && !isStreaming && (
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                'absolute -right-10 top-2 opacity-0 transition-opacity group-hover:opacity-100',
                copied && 'opacity-100'
              )}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="sr-only">Copy message</span>
            </Button>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-2">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
