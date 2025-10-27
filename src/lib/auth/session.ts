/**
 * Auth Session Module
 *
 * Re-exports from auth-utils for backward compatibility
 *
 * This module provides a convenient import path for session-related utilities
 */

export {
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
