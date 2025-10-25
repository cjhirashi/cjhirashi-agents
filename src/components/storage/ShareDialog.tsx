// ═══════════════════════════════════════════════════════════
// Component - Share Dialog
// Create share links with security options
// ═══════════════════════════════════════════════════════════

'use client';

import React, { useState } from 'react';
import { Copy, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ShareDialogProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareForm {
  password: string;
  maxDownloads: number | null;
  expiresInDays: number;
  allowDownload: boolean;
  allowView: boolean;
}

export function ShareDialog({
  fileId,
  fileName,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [form, setForm] = useState<ShareForm>({
    password: '',
    maxDownloads: null,
    expiresInDays: 7,
    allowDownload: true,
    allowView: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreateShare = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calcular expiración
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + form.expiresInDays);

      const response = await fetch('/api/storage/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          shareType: 'LINK',
          password: form.password || undefined,
          maxDownloads: form.maxDownloads || undefined,
          allowDownload: form.allowDownload,
          allowView: form.allowView,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create share');
      }

      const data = await response.json();
      setShareUrl(data.data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mostrar resultado de share creado
  if (shareUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Success */}
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold">Enlace creado</h2>
          </div>

          <p className="text-gray-600 mb-4">
            El enlace de compartición para &ldquo;{fileName}&rdquo; ha sido creado exitosamente.
          </p>

          {/* URL Box */}
          <div className="bg-gray-50 border rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Enlace:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 text-sm bg-transparent font-mono truncate"
              />
              <button
                onClick={handleCopyUrl}
                className="p-2 hover:bg-gray-200 rounded flex-shrink-0"
                title="Copiar"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {form.password && '🔒 Protegido con contraseña'}
            {form.maxDownloads && ` • ${form.maxDownloads} descargas máximo`}
            {` • Expira en ${form.expiresInDays} días`}
          </p>

          {/* Actions */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Formulario de compartición
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">Compartir: {fileName}</h2>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña (opcional)
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Dejar en blanco sin protección"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Max Descargas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descargas máximas (opcional)
            </label>
            <input
              type="number"
              value={form.maxDownloads || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxDownloads: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="Sin límite"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Días de expiración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expira en (días)
            </label>
            <select
              value={form.expiresInDays}
              onChange={(e) =>
                setForm({ ...form, expiresInDays: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 día</option>
              <option value="3">3 días</option>
              <option value="7">7 días</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
            </select>
          </div>

          {/* Permisos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Permisos
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowView"
                checked={form.allowView}
                onChange={(e) =>
                  setForm({ ...form, allowView: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <label htmlFor="allowView" className="text-sm text-gray-600">
                Permitir ver
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowDownload"
                checked={form.allowDownload}
                onChange={(e) =>
                  setForm({ ...form, allowDownload: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <label htmlFor="allowDownload" className="text-sm text-gray-600">
                Permitir descargar
              </label>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateShare}
            disabled={loading || (!form.allowDownload && !form.allowView)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creando...' : 'Crear Enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}
