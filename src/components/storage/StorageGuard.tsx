// ═══════════════════════════════════════════════════════════
// Component - Storage Guard
// Protege el acceso al Storage basado en roles
// ═══════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { useStorageAccess } from '@/hooks/useStorageAccess';
import { StorageAccessDenied } from './StorageAccessDenied';
import { Loader2 } from 'lucide-react';

interface StorageGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente que protege el acceso a funcionalidades de Storage
 * Solo muestra contenido si el usuario es SUPER_ADMIN o ADMIN
 */
export function StorageGuard({ children, fallback }: StorageGuardProps) {
  const { canAccessStorage, isLoading } = useStorageAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!canAccessStorage) {
    return fallback ? <>{fallback}</> : <StorageAccessDenied />;
  }

  return <>{children}</>;
}
