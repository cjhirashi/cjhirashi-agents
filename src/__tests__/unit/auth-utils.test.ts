/**
 * Auth Utilities Unit Tests
 *
 * Tests for authentication and authorization helper functions
 *
 * Functions tested:
 * - getCurrentUser()
 * - getSession()
 * - isAdmin(), isSuperAdmin()
 * - hasAgentAccess()
 * - getAccessibleAgents()
 * - requireAdmin(), requireSuperAdmin(), requireAuth()
 *
 * Related: Phase 7 - Tarea 4 (Unit Testing Suite)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';

// Mock modules
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getCurrentUser,
  getSession,
  isAdmin,
  isSuperAdmin,
  hasAgentAccess,
  getAccessibleAgents,
  requireAdmin,
  requireSuperAdmin,
  requireAuth,
} from '@/lib/auth-utils';

// ═══════════════════════════════════════════════════════════
// SESSION HELPERS
// ═══════════════════════════════════════════════════════════

describe('Auth Utilities - Session Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return session when authenticated', async () => {
      const mockSession = {
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);

      const session = await getSession();

      expect(session).toEqual(mockSession);
      expect(auth).toHaveBeenCalledTimes(1);
    });

    it('should return null when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user with permissions when authenticated', async () => {
      const mockSession = {
        user: {
          email: 'user@example.com',
          name: 'Test User',
        },
      };

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: UserRole.CLIENT,
        tier: 'PRO',
        isActive: true,
        agentPermissions: [
          {
            id: 'perm-1',
            agentId: 'agent-1',
            userId: 'user-123',
            agent: {
              id: 'agent-1',
              name: 'Test Agent',
              isPublic: false,
            },
          },
        ],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        include: {
          agentPermissions: {
            include: {
              agent: true,
            },
          },
        },
      });
    });

    it('should return null when session has no email', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { name: 'Test' },
      } as any);

      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// AUTHORIZATION CHECKS
// ═══════════════════════════════════════════════════════════

describe('Auth Utilities - Authorization Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', async () => {
      const mockSession = {
        user: { email: 'admin@example.com' },
      };

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await isAdmin();

      expect(result).toBe(true);
    });

    it('should return true for SUPER_ADMIN role', async () => {
      const mockSession = {
        user: { email: 'superadmin@example.com' },
      };

      const mockUser = {
        id: 'superadmin-1',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await isAdmin();

      expect(result).toBe(true);
    });

    it('should return false for CLIENT role', async () => {
      const mockSession = {
        user: { email: 'client@example.com' },
      };

      const mockUser = {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await isAdmin();

      expect(result).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true only for SUPER_ADMIN role', async () => {
      const mockSession = {
        user: { email: 'superadmin@example.com' },
      };

      const mockUser = {
        id: 'superadmin-1',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin();

      expect(result).toBe(true);
    });

    it('should return false for ADMIN role', async () => {
      const mockSession = {
        user: { email: 'admin@example.com' },
      };

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin();

      expect(result).toBe(false);
    });
  });

  describe('hasAgentAccess', () => {
    it('should return true for admin users', async () => {
      const mockSession = {
        user: { email: 'admin@example.com' },
      };

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await hasAgentAccess('any-agent-id');

      expect(result).toBe(true);
    });

    it('should return true for public agents (active user)', async () => {
      const mockSession = {
        user: { email: 'client@example.com' },
      };

      const mockUser = {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        isActive: true,
        agentPermissions: [],
      };

      const mockAgent = {
        id: 'agent-1',
        isPublic: true,
        createdBy: 'other-user',
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockAgent as any);

      const result = await hasAgentAccess('agent-1');

      expect(result).toBe(true);
    });

    it('should return false for public agents (inactive user)', async () => {
      const mockSession = {
        user: { email: 'client@example.com' },
      };

      const mockUser = {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        isActive: false,
        agentPermissions: [],
      };

      const mockAgent = {
        id: 'agent-1',
        isPublic: true,
        createdBy: 'other-user',
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockAgent as any);

      const result = await hasAgentAccess('agent-1');

      expect(result).toBe(false);
    });

    it('should return true for agent creator', async () => {
      const mockSession = {
        user: { email: 'creator@example.com' },
      };

      const mockUser = {
        id: 'user-1',
        email: 'creator@example.com',
        role: UserRole.CLIENT,
        isActive: true,
        agentPermissions: [],
      };

      const mockAgent = {
        id: 'agent-1',
        isPublic: false,
        createdBy: 'user-1',
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockAgent as any);

      const result = await hasAgentAccess('agent-1');

      expect(result).toBe(true);
    });

    it('should return true for users with explicit permission', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
      };

      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.CLIENT,
        isActive: true,
        agentPermissions: [
          {
            id: 'perm-1',
            agentId: 'agent-1',
            userId: 'user-1',
          },
        ],
      };

      const mockAgent = {
        id: 'agent-1',
        isPublic: false,
        createdBy: 'other-user',
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockAgent as any);

      const result = await hasAgentAccess('agent-1');

      expect(result).toBe(true);
    });

    it('should return false when agent not found', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
      };

      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.CLIENT,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);

      const result = await hasAgentAccess('non-existent-agent');

      expect(result).toBe(false);
    });

    it('should return false when user not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await hasAgentAccess('any-agent');

      expect(result).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════

describe('Auth Utilities - Query Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccessibleAgents', () => {
    it('should return all agents for admin users', async () => {
      const mockSession = {
        user: { email: 'admin@example.com' },
      };

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        agentPermissions: [],
      };

      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1' },
        { id: 'agent-2', name: 'Agent 2' },
      ];

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      const agents = await getAccessibleAgents();

      expect(agents).toEqual(mockAgents);
      expect(prisma.agent.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return filtered agents for regular users', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
      };

      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.CLIENT,
        agentPermissions: [],
      };

      const mockAgents = [{ id: 'agent-1', name: 'Public Agent' }];

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      const agents = await getAccessibleAgents();

      expect(agents).toEqual(mockAgents);
      expect(prisma.agent.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isPublic: true },
            { createdBy: 'user-1' },
            {
              userPermissions: {
                some: { userId: 'user-1' },
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const agents = await getAccessibleAgents();

      expect(agents).toEqual([]);
      expect(prisma.agent.findMany).not.toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// GUARDS (throw on unauthorized)
// ═══════════════════════════════════════════════════════════

describe('Auth Utilities - Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return user when authenticated and active', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
      };

      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.CLIENT,
        isActive: true,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await requireAuth();

      expect(user).toEqual(mockUser);
    });

    it('should throw when user not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow(
        'Unauthorized: Authentication required'
      );
    });

    it('should throw when user is inactive', async () => {
      const mockSession = {
        user: { email: 'user@example.com' },
      };

      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.CLIENT,
        isActive: false,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(requireAuth()).rejects.toThrow(
        'Unauthorized: Account is inactive'
      );
    });
  });

  describe('requireAdmin', () => {
    it('should return user when user is ADMIN', async () => {
      const mockSession = {
        user: { email: 'admin@example.com' },
      };

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await requireAdmin();

      expect(user).toEqual(mockUser);
    });

    it('should return user when user is SUPER_ADMIN', async () => {
      const mockSession = {
        user: { email: 'superadmin@example.com' },
      };

      const mockUser = {
        id: 'superadmin-1',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await requireAdmin();

      expect(user).toEqual(mockUser);
    });

    it('should throw when user is CLIENT', async () => {
      const mockSession = {
        user: { email: 'client@example.com' },
      };

      const mockUser = {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(requireAdmin()).rejects.toThrow(
        'Unauthorized: Admin access required'
      );
    });

    it('should throw when user not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow(
        'Unauthorized: Admin access required'
      );
    });
  });

  describe('requireSuperAdmin', () => {
    it('should return user when user is SUPER_ADMIN', async () => {
      const mockSession = {
        user: { email: 'superadmin@example.com' },
      };

      const mockUser = {
        id: 'superadmin-1',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await requireSuperAdmin();

      expect(user).toEqual(mockUser);
    });

    it('should throw when user is ADMIN (not SUPER_ADMIN)', async () => {
      const mockSession = {
        user: { email: 'admin@example.com' },
      };

      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        agentPermissions: [],
      };

      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(requireSuperAdmin()).rejects.toThrow(
        'Unauthorized: Super Admin access required'
      );
    });

    it('should throw when user not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await expect(requireSuperAdmin()).rejects.toThrow(
        'Unauthorized: Super Admin access required'
      );
    });
  });
});
