'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, StopCircle } from 'lucide-react';
import { KeyboardEvent, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isLoading,
  isStreaming = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend();
    }
  };

  const handleStop = () => {
    if (isStreaming && onStop) {
      onStop();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        {/* File Upload Button (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          disabled={isLoading}
          title="Attach file (coming soon)"
          className="shrink-0"
        >
          <Paperclip className="size-5" />
          <span className="sr-only">Attach file</span>
        </Button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'min-h-[60px] max-h-[200px] resize-none pr-12',
              'field-sizing-content'
            )}
            rows={1}
          />

          {/* Character count (optional) */}
          {value.length > 0 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {value.length} / 10000
            </div>
          )}
        </div>

        {/* Send / Stop Button */}
        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={handleStop}
            className="shrink-0"
          >
            <StopCircle className="size-5" />
            <span className="sr-only">Stop generating</span>
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="size-5" />
            <span className="sr-only">Send message</span>
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="text-xs text-muted-foreground text-center mt-2">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-muted">Shift + Enter</kbd> for new
        line
      </div>
    </div>
  );
}
