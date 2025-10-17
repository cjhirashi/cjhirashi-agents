// ═══════════════════════════════════════════════════════════
// Hook - Storage Access Check
// Verifica si el usuario tiene acceso al Storage System
// ═══════════════════════════════════════════════════════════

'use client';

import { useSession } from 'next-auth/react';
import type { UserRole } from '@prisma/client';

/**
 * Roles permitidos para acceder al Storage
 * - SUPER_ADMIN: Control total del sistema
 * - ADMIN: Administración de usuarios y permisos
 * - INVITED_STORAGE: Usuarios invitados con acceso a Storage (guests)
 */
const ALLOWED_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'INVITED_STORAGE'];

/**
 * Hook para verificar acceso al Storage System
 * SUPER_ADMIN, ADMIN e INVITED_STORAGE tienen acceso
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
