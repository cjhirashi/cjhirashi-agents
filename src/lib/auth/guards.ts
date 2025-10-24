// ═══════════════════════════════════════════════════════════
// RBAC Authorization Guards
// Enforce role, tier, and ownership requirements
// ═══════════════════════════════════════════════════════════

import { auth } from '@/lib/auth';
import { ApiErrors } from '@/lib/errors/ApiError';
import type { UserRole, SubscriptionTier } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  tier: SubscriptionTier;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════
// BASE AUTH GUARD
// ═══════════════════════════════════════════════════════════

/**
 * Require authentication
 * Throws 401 if not authenticated
 * Throws 403 if account is inactive
 * Returns authenticated session
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();

  if (!session || !session.user) {
    throw ApiErrors.unauthorized('Authentication required');
  }

  if (!session.user.isActive) {
    throw ApiErrors.forbidden('Account is inactive');
  }

  return session.user as AuthenticatedUser;
}

// ═══════════════════════════════════════════════════════════
// ROLE-BASED GUARDS
// ═══════════════════════════════════════════════════════════

/**
 * Require specific role
 * Throws 401 if not authenticated
 * Throws 403 if insufficient role
 * Returns authenticated session
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw ApiErrors.forbidden(`Requires role(s): ${roles.join(', ')}`);
  }

  return user;
}

/**
 * Require admin role (ADMIN or SUPER_ADMIN)
 * Throws 401 if not authenticated
 * Throws 403 if not admin
 * Returns authenticated session
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return await requireRole(['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Require super admin role (SUPER_ADMIN only)
 * Throws 401 if not authenticated
 * Throws 403 if not super admin
 * Returns authenticated session
 */
export async function requireSuperAdmin(): Promise<AuthenticatedUser> {
  return await requireRole('SUPER_ADMIN');
}

// ═══════════════════════════════════════════════════════════
// TIER-BASED GUARDS
// ═══════════════════════════════════════════════════════════

/**
 * Require specific subscription tier
 * Throws 401 if not authenticated
 * Throws 402 (Payment Required) if insufficient tier
 * Returns authenticated session
 */
export async function requireTier(
  minimumTier: SubscriptionTier | SubscriptionTier[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  const tiers = Array.isArray(minimumTier) ? minimumTier : [minimumTier];

  // Tier hierarchy (from lowest to highest)
  const tierHierarchy: SubscriptionTier[] = [
    'FREE',
    'BASIC',
    'PRO',
    'ENTERPRISE',
    'CUSTOM',
    'UNLIMITED',
  ];

  // Get minimum required tier level
  const minimumTierLevel = Math.min(...tiers.map((t) => tierHierarchy.indexOf(t)));

  // Get user's tier level
  const userTierLevel = tierHierarchy.indexOf(user.tier);

  if (userTierLevel < minimumTierLevel) {
    const requiredTierName = tierHierarchy[minimumTierLevel];
    throw ApiErrors.forbidden(`Requires ${requiredTierName} tier or higher`);
  }

  return user;
}

/**
 * Require PRO tier or higher
 * Throws 401 if not authenticated
 * Throws 402 if tier insufficient
 * Returns authenticated session
 */
export async function requirePro(): Promise<AuthenticatedUser> {
  return await requireTier('PRO');
}

/**
 * Require ENTERPRISE tier or higher
 * Throws 401 if not authenticated
 * Throws 402 if tier insufficient
 * Returns authenticated session
 */
export async function requireEnterprise(): Promise<AuthenticatedUser> {
  return await requireTier('ENTERPRISE');
}

// ═══════════════════════════════════════════════════════════
// OWNERSHIP GUARDS
// ═══════════════════════════════════════════════════════════

/**
 * Require resource ownership
 * Throws 401 if not authenticated
 * Throws 403 if not owner (unless admin)
 * Returns authenticated session
 *
 * Admins and Super Admins bypass ownership checks
 */
export async function requireOwnership(resourceOwnerId: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  // Admins and Super Admins can access all resources
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return user;
  }

  // Check ownership
  if (user.id !== resourceOwnerId) {
    throw ApiErrors.forbidden('You do not own this resource');
  }

  return user;
}

/**
 * Require resource ownership (strict - even admins must own)
 * Throws 401 if not authenticated
 * Throws 403 if not owner
 * Returns authenticated session
 *
 * Admins and Super Admins do NOT bypass this check
 */
export async function requireStrictOwnership(resourceOwnerId: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (user.id !== resourceOwnerId) {
    throw ApiErrors.forbidden('You do not own this resource');
  }

  return user;
}

// ═══════════════════════════════════════════════════════════
// COMBINED GUARDS
// ═══════════════════════════════════════════════════════════

/**
 * Require ownership OR admin role
 * Throws 401 if not authenticated
 * Throws 403 if neither owner nor admin
 * Returns authenticated session
 */
export async function requireOwnerOrAdmin(resourceOwnerId: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  // Allow admins and super admins
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return user;
  }

  // Check ownership
  if (user.id !== resourceOwnerId) {
    throw ApiErrors.forbidden('You must own this resource or be an admin');
  }

  return user;
}

/**
 * Require specific role AND tier
 * Throws 401 if not authenticated
 * Throws 403 if role insufficient
 * Throws 402 if tier insufficient
 * Returns authenticated session
 */
export async function requireRoleAndTier(
  role: UserRole | UserRole[],
  tier: SubscriptionTier | SubscriptionTier[]
): Promise<AuthenticatedUser> {
  const userByRole = await requireRole(role);
  await requireTier(tier); // Validate tier (throws if insufficient)

  return userByRole;
}

// ═══════════════════════════════════════════════════════════
// OPTIONAL GUARDS (returns null instead of throwing)
// ═══════════════════════════════════════════════════════════

/**
 * Get current user if authenticated, null otherwise
 * Does NOT throw - returns null if not authenticated
 */
export async function optionalAuth(): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}

/**
 * Check if current user is admin (does NOT throw)
 * Returns true if admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current user is super admin (does NOT throw)
 * Returns true if super admin, false otherwise
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current user owns resource (does NOT throw)
 * Returns true if owner (or admin), false otherwise
 */
export async function isOwner(resourceOwnerId: string): Promise<boolean> {
  try {
    await requireOwnership(resourceOwnerId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current user has minimum tier (does NOT throw)
 * Returns true if tier sufficient, false otherwise
 */
export async function hasTier(minimumTier: SubscriptionTier): Promise<boolean> {
  try {
    await requireTier(minimumTier);
    return true;
  } catch {
    return false;
  }
}
