// ═══════════════════════════════════════════════════════════
// Component - Storage Access Denied
// Mostrado cuando usuario no tiene permisos
// ═══════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface StorageAccessDeniedProps {
  compact?: boolean;
}

export function StorageAccessDenied({ compact = false }: StorageAccessDeniedProps) {
  const { data: session } = useSession();

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
        <Lock className="h-4 w-4 text-red-600" />
        <p className="text-sm text-red-600">
          Acceso a Storage limitado a Administradores
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 rounded-full p-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso Denegado
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          El Sistema de Almacenamiento está reservado exclusivamente para administradores.
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Roles autorizados:</p>
              <ul className="text-left space-y-1">
                <li>• Super Administrador</li>
                <li>• Administrador</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current Role */}
        {session?.user?.role && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Tu rol actual: <span className="font-semibold text-gray-900">{session.user.role}</span>
            </p>
          </div>
        )}

        {/* Action */}
        <p className="text-sm text-gray-600">
          Si crees que esto es un error, contacta con un administrador del sistema.
        </p>
      </div>
    </div>
  );
}
