import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import logger from "@/lib/logging/logger";

// GET /api/admin/users/[userId]/metrics - Get user usage metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    await requireAdmin();

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        customLimits: true,
        monthlyMessages: true,
        monthlyTokens: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Obtener estadísticas de uso
    const [
      totalSessions,
      totalConversations,
      totalMessages,
      totalAgentsCreated,
      recentSessions
    ] = await Promise.all([
      // Total de sesiones
      prisma.chatSession.count({
        where: { userId: userId },
      }),

      // Total de conversaciones
      prisma.conversation.count({
        where: {
          chatSession: {
            userId: userId,
          },
        },
      }),

      // Total de mensajes
      prisma.message.count({
        where: {
          conversation: {
            chatSession: {
              userId: userId,
            },
          },
        },
      }),

      // Total de agentes creados
      prisma.agent.count({
        where: { createdBy: userId },
      }),

      // Últimas 30 sesiones para gráfica de actividad
      prisma.chatSession.findMany({
        where: { userId: userId },
        select: {
          id: true,
          startedAt: true,
          lastActivity: true,
          conversations: {
            select: {
              id: true,
              messages: {
                select: {
                  id: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 30,
      }),
    ]);

    // Calcular mensajes por día para los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messagesPerDay = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT
        DATE(m.timestamp) as date,
        COUNT(*)::bigint as count
      FROM messages m
      INNER JOIN conversations c ON m."conversationId" = c.id
      INNER JOIN chat_sessions cs ON c."chatSessionId" = cs.id
      WHERE cs."userId" = ${userId}
        AND m.timestamp >= ${thirtyDaysAgo}
      GROUP BY DATE(m.timestamp)
      ORDER BY date ASC
    `;

    // Calcular uso de tokens por agente (simulado - necesitarías una tabla de tracking real)
    const agentUsage = await prisma.agent.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        name: true,
        conversations: {
          select: {
            messages: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const agentStats = agentUsage.map((agent) => ({
      agentName: agent.name,
      messageCount: agent.conversations.reduce(
        (sum, conv) => sum + conv.messages.length,
        0
      ),
    }));

    // Obtener límites según tier de suscripción o customLimits
    const tierLimits: Record<string, { messages: number | null; tokens: number | null }> = {
      FREE: { messages: 100, tokens: 100000 },
      BASIC: { messages: 500, tokens: 500000 },
      PRO: { messages: 1000, tokens: 1000000 },
      ENTERPRISE: { messages: 10000, tokens: 10000000 },
      CUSTOM: { messages: null, tokens: null },
      UNLIMITED: { messages: null, tokens: null },
    };

    const customLimits = user.customLimits as Record<string, unknown> | null;
    const defaultLimits = tierLimits[user.subscriptionTier] || tierLimits.FREE;

    const monthlyMessageLimit = customLimits?.monthlyMessageLimit ?? defaultLimits.messages;
    const monthlyTokenLimit = customLimits?.monthlyTokenLimit ?? defaultLimits.tokens;

    // Calcular porcentaje de uso de límites
    const messageLimitPercentage = monthlyMessageLimit
      ? (user.monthlyMessages / monthlyMessageLimit) * 100
      : 0;

    const tokenLimitPercentage = monthlyTokenLimit
      ? (Number(user.monthlyTokens) / Number(monthlyTokenLimit)) * 100
      : 0;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
      },
      limits: {
        monthlyMessageLimit,
        monthlyTokenLimit: monthlyTokenLimit?.toString() || null,
        currentMonthMessages: user.monthlyMessages,
        currentMonthTokens: user.monthlyTokens.toString(),
        messageLimitPercentage: Math.round(messageLimitPercentage),
        tokenLimitPercentage: Math.round(tokenLimitPercentage),
      },
      stats: {
        totalSessions,
        totalConversations,
        totalMessages,
        totalAgentsCreated,
        averageMessagesPerSession: totalSessions > 0
          ? Math.round(totalMessages / totalSessions)
          : 0,
      },
      charts: {
        messagesPerDay: messagesPerDay.map((item) => ({
          date: item.date.toISOString().split("T")[0],
          count: Number(item.count),
        })),
        agentUsage: agentStats.sort((a, b) => b.messageCount - a.messageCount),
        recentActivity: recentSessions.map((session) => {
          const messageCount = session.conversations.reduce(
            (sum, conv) => sum + conv.messages.length,
            0
          );
          return {
            date: session.startedAt.toISOString().split("T")[0],
            messages: messageCount,
          };
        }),
      },
    });
  } catch (error) {
    logger.error("Error fetching user metrics", {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: userId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user metrics" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
