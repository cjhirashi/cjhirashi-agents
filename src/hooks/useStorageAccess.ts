// ═══════════════════════════════════════════════════════════
// Hook - Storage Access Check
// Verifica si el usuario tiene acceso al Storage System
// ═══════════════════════════════════════════════════════════

'use client';

import { useSession } from 'next-auth/react';
import type { UserRole } from '@prisma/client';

/**
 * Roles permitidos para acceder al Storage
 */
const ALLOWED_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Hook para verificar acceso al Storage System
 * Solo SUPER_ADMIN y ADMIN tienen acceso
 */
export function useStorageAccess() {
  const { data: session, status } = useSession();

  const canAccessStorage =
    status === 'authenticated' &&
    session?.user?.role &&
    ALLOWED_ROLES.includes(session.user.role as UserRole);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const userRole = (session?.user?.role as UserRole) || null;

  return {
    canAccessStorage,
    isLoading,
    isAuthenticated,
    userRole,
    allowedRoles: ALLOWED_ROLES,
  };
}
