import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * Get the current user session with full user data
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      agentPermissions: {
        include: {
          agent: true,
        },
      },
    },
  });

  return user;
}

/**
 * Check if the current user is an admin (ADMIN or SUPER_ADMIN)
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
}

/**
 * Check if the current user has access to a specific agent
 */
export async function hasAgentAccess(agentId: string) {
  const user = await getCurrentUser();

  if (!user) return false;

  // Admins and Super Admins have access to all agents
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) return true;

  // Check if agent is public
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { isPublic: true, createdBy: true },
  });

  if (!agent) return false;

  // Public agents are accessible to all active users
  if (agent.isPublic && user.isActive) return true;

  // Check if user created the agent
  if (agent.createdBy === user.id) return true;

  // Check if user has specific permission for this agent
  return user.agentPermissions.some(permission => permission.agentId === agentId);
}

/**
 * Get all accessible agents for the current user
 */
export async function getAccessibleAgents() {
  const user = await getCurrentUser();

  if (!user) return [];

  // Admins and Super Admins have access to all agents
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
    return await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  // Get public agents, created agents, and agents with explicit permissions
  return await prisma.agent.findMany({
    where: {
      OR: [
        { isPublic: true },
        { createdBy: user.id },
        {
          userPermissions: {
            some: { userId: user.id },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Require admin role or throw error
 * Returns the user object if successful
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
}
