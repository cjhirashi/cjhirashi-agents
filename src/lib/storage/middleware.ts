// ═══════════════════════════════════════════════════════════
// Storage System - Access Control Middleware
// Autorización basada en roles para Storage API
// ═══════════════════════════════════════════════════════════

import { getServerSession } from 'next-auth/next';
import type { UserRole } from '@prisma/client';

/**
 * Roles permitidos para acceder al Storage System
 * - SUPER_ADMIN: Control total del sistema
 * - ADMIN: Administración de usuarios y permisos
 * - INVITED_STORAGE: Usuarios invitados con acceso a Storage (guests)
 */
const ALLOWED_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'INVITED_STORAGE'];

/**
 * Resultado de la validación de acceso
 */
export interface AccessCheckResult {
  allowed: boolean;
  userId?: string;
  role?: UserRole;
  error?: string;
}

/**
 * Valida que el usuario tenga permisos para acceder al Storage System
 * SUPER_ADMIN, ADMIN e INVITED_STORAGE pueden usar Storage
 */
export async function checkStorageAccess(): Promise<AccessCheckResult> {
  try {
    // 1. Obtener sesión
    const session = await getServerSession();

    if (!session || !session.user) {
      return {
        allowed: false,
        error: 'No authenticated user found',
      };
    }

    // 2. Validar que tenga ID
    if (!session.user.id) {
      return {
        allowed: false,
        error: 'User ID not found in session',
      };
    }

    // 3. Obtener rol del usuario (necesitamos la base de datos)
    const { prisma } = await import('@/lib/prisma');

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return {
        allowed: false,
        error: 'User not found in database',
      };
    }

    // 4. Validar que el rol sea permitido
    if (!ALLOWED_ROLES.includes(user.role)) {
      return {
        allowed: false,
        userId: user.id,
        role: user.role,
        error: `Storage access denied. Only ${ALLOWED_ROLES.join(', ')} can access Storage. Your role: ${user.role}`,
      };
    }

    // 5. Acceso permitido
    return {
      allowed: true,
      userId: user.id,
      role: user.role,
    };
  } catch (error) {
    return {
      allowed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtiene el ID de usuario después de validar acceso
 * Lanza error si no tiene permiso
 */
export async function getStorageUserIdOrThrow(): Promise<string> {
  const result = await checkStorageAccess();

  if (!result.allowed) {
    throw new Error(result.error || 'Storage access denied');
  }

  if (!result.userId) {
    throw new Error('User ID not found');
  }

  return result.userId;
}

/**
 * Valida acceso y retorna respuesta JSON si falla
 * Para usar en API routes
 */
export async function validateStorageAccessOrRespond() {
  const result = await checkStorageAccess();

  return result;
}
