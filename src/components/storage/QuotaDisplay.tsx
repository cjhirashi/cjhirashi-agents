// ═══════════════════════════════════════════════════════════
// Component - Quota Display
// Show storage usage and limits
// ═══════════════════════════════════════════════════════════

'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes, calculateStorageUsagePercentage } from '@/lib/storage';
import type { QuotaInfo } from '@/lib/storage';

interface QuotaDisplayProps {
  userId: string;
}

export function QuotaDisplay({ userId }: QuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuota = async () => {
      try {
        // Cargar archivos para obtener info de cuota (la API no tiene endpoint específico)
        const response = await fetch('/api/storage/files?limit=1');

        if (!response.ok) {
          throw new Error('Failed to load quota');
        }

        // Nota: Esto es un workaround. En producción, crear endpoint específico
        // const data = await response.json();
        // setQuota(data.data.quota);

        // Por ahora, mostrar datos simulados
        setQuota({
          id: 'dummy',
          userId,
          maxStorage: BigInt(1024 * 1024 * 1024), // 1GB
          maxFileSize: BigInt(20 * 1024 * 1024), // 20MB
          maxFiles: 500,
          usedStorage: BigInt(250 * 1024 * 1024), // 250MB
          fileCount: 15,
          subscriptionTier: 'BASIC',
          lastCalculated: new Date(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadQuota();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <p className="text-red-600 text-sm">{error || 'Could not load quota'}</p>
      </div>
    );
  }

  const usagePercent = calculateStorageUsagePercentage(quota);
  const filesPercent = (quota.fileCount / quota.maxFiles) * 100;

  const getStorageColor = () => {
    if (usagePercent >= 90) return 'text-red-600';
    if (usagePercent >= 75) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStorageBgColor = () => {
    if (usagePercent >= 90) return 'bg-red-100';
    if (usagePercent >= 75) return 'bg-orange-100';
    return 'bg-green-100';
  };

  const getProgressColor = () => {
    if (usagePercent >= 90) return 'bg-red-500';
    if (usagePercent >= 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getFilesColor = () => {
    if (filesPercent >= 90) return 'text-red-600';
    if (filesPercent >= 75) return 'text-orange-600';
    return 'text-blue-600';
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Almacenamiento</h2>
        <p className="text-sm text-gray-500">
          Plan: <span className="font-medium">{quota.subscriptionTier}</span>
        </p>
      </div>

      {/* Storage Usage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Almacenamiento</span>
          <span className={`text-sm font-medium ${getStorageColor()}`}>
            {usagePercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>

        {/* Stats */}
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>
              Usado: <span className="font-medium">{formatBytes(Number(quota.usedStorage))}</span>
            </span>
            <span>
              Total: <span className="font-medium">{formatBytes(Number(quota.maxStorage))}</span>
            </span>
          </div>
        </div>

        {/* Warning */}
        {usagePercent >= 75 && (
          <div className={`mt-2 p-2 rounded text-xs ${getStorageBgColor()} ${getStorageColor()}`}>
            {usagePercent >= 90
              ? '⚠️ Has alcanzado el 90% de tu cuota'
              : '⚠️ Se aproxima al límite de almacenamiento'}
          </div>
        )}
      </div>

      {/* Files Count */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Cantidad de archivos</span>
          <span className={`text-sm font-medium ${getFilesColor()}`}>
            {quota.fileCount} / {quota.maxFiles}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${filesPercent >= 75 ? 'bg-orange-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(filesPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* File Size Limits */}
      <div className="pt-4 border-t">
        <p className="text-sm font-medium text-gray-700 mb-2">Límites por archivo</p>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Tamaño máximo:</span>
            <span className="font-medium">{formatBytes(Number(quota.maxFileSize))}</span>
          </div>
        </div>
      </div>

      {/* Breakdown by Context */}
      {quota.usageBreakdown && Object.keys(quota.usageBreakdown).length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 mb-3">Uso por contexto</p>
          <div className="space-y-2">
            {Object.entries(quota.usageBreakdown).map(([context, bytes]) => (
              <div key={context} className="flex justify-between text-xs">
                <span className="text-gray-600">{context}</span>
                <span className="font-medium text-gray-900">
                  {formatBytes(bytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
