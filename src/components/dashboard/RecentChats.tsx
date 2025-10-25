'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  lastActivity: Date;
  messageCount: number;
}

interface RecentChatsProps {
  sessions: ChatSession[];
}

export function RecentChats({ sessions }: RecentChatsProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No conversations yet</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/chat">Start chatting</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Recent Conversations
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/chat">
            View all <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/dashboard/chat?session=${session.id}`}
              className="block group"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary">
                    {session.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.lastMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{session.messageCount} messages</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(session.lastActivity), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
