import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentChats } from '@/components/dashboard/RecentChats';
import { RecentDocuments } from '@/components/dashboard/RecentDocuments';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  FileText,
  Users,
  Zap,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch dashboard data in parallel
  const [chatSessions, documents, stats] = await Promise.all([
    // Recent chat sessions (last 5)
    prisma.chatSession.findMany({
      where: { userId },
      take: 5,
      orderBy: { lastActivity: 'desc' },
      include: {
        conversations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            messages: {
              take: 2,
              orderBy: { createdAt: 'asc' },
              select: { content: true, role: true },
            },
          },
        },
        _count: {
          select: { conversations: true },
        },
      },
    }),

    // Recent documents (last 5)
    prisma.document.findMany({
      where: { userId },
      take: 5,
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        filesize: true,
        status: true,
        uploadedAt: true,
      },
    }),

    // Stats
    Promise.all([
      // Total chat sessions
      prisma.chatSession.count({ where: { userId } }),

      // Total documents
      prisma.document.count({ where: { userId } }),

      // Total messages sent
      prisma.message.count({
        where: {
          conversation: {
            session: { userId },
          },
          role: 'user',
        },
      }),

      // Active sessions (last 7 days)
      prisma.chatSession.count({
        where: {
          userId,
          lastActivity: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]),
  ]);

  const [totalSessions, totalDocuments, totalMessages, activeSessions] = stats;

  // Format chat sessions - generate title from first message
  const formattedSessions = chatSessions.map((session) => {
    const firstMessage = session.conversations[0]?.messages.find(m => m.role === 'user');
    const lastMessage = session.conversations[0]?.messages[session.conversations[0].messages.length - 1];

    // Generate title from first user message or use generic title
    const title = firstMessage
      ? firstMessage.content.slice(0, 50) + (firstMessage.content.length > 50 ? '...' : '')
      : 'Chat Session ' + formatDistanceToNow(session.startedAt, { addSuffix: true });

    return {
      id: session.id,
      title,
      lastMessage: lastMessage?.content || 'No messages yet',
      lastActivity: session.lastActivity,
      messageCount: session._count.conversations,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.email}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chat">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Chats"
          value={totalSessions}
          description="All chat sessions"
          icon={MessageSquare}
        />
        <StatsCard
          title="Documents"
          value={totalDocuments}
          description="Uploaded to RAG"
          icon={FileText}
        />
        <StatsCard
          title="Messages Sent"
          value={totalMessages}
          description="Total messages"
          icon={Zap}
        />
        <StatsCard
          title="Active Sessions"
          value={activeSessions}
          description="Last 7 days"
          icon={Users}
        />
      </div>

      {/* Recent Items Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentChats sessions={formattedSessions} />
        <RecentDocuments documents={documents} />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button variant="outline" className="h-24" asChild>
          <Link href="/dashboard/chat" className="flex flex-col gap-2">
            <MessageSquare className="h-6 w-6" />
            <span>Start New Chat</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24" asChild>
          <Link href="/dashboard/documents" className="flex flex-col gap-2">
            <FileText className="h-6 w-6" />
            <span>Upload Document</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24" asChild>
          <Link href="/dashboard/settings" className="flex flex-col gap-2">
            <Users className="h-6 w-6" />
            <span>Settings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
