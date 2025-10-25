'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChatSessionListItem } from '@/types/chat';
import {
  Plus,
  MessageSquare,
  Trash2,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ChatHistoryProps {
  sessions: ChatSessionListItem[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
}

export function ChatHistory({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  isLoading,
}: ChatHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent session selection

    if (
      !confirm('Are you sure you want to delete this conversation? This action cannot be undone.')
    ) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await onDeleteSession(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          onClick={onCreateSession}
          disabled={isLoading}
          className="w-full"
        >
          <Plus className="mr-2 size-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="size-8 mb-2 opacity-20" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Create a new chat to get started</p>
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                isDeleting={deletingId === session.id}
                onSelect={() => onSelectSession(session.id)}
                onDelete={(e) => handleDelete(session.id, e)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SessionItemProps {
  session: ChatSessionListItem;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SessionItem({
  session,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
}: SessionItemProps) {
  const truncateTitle = (title: string, maxLength: number = 50) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
      onClick={onSelect}
    >
      {/* Icon */}
      <MessageSquare className="size-4 shrink-0 opacity-50" />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium truncate">
          {truncateTitle(session.title || 'New Chat')}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {formatDistanceToNow(session.lastActivity, { addSuffix: true })}
        </p>
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'shrink-0 opacity-0 transition-opacity group-hover:opacity-100',
              isActive && 'opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deleting indicator */}
      {isDeleting && (
        <Loader2 className="absolute right-2 size-4 animate-spin" />
      )}
    </div>
  );
}
