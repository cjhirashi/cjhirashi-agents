// ═══════════════════════════════════════════════════════════
// Component - File List
// Display user files with pagination and actions
// ═══════════════════════════════════════════════════════════

'use client';

import React, { useState, useEffect } from 'react';
import type { FileUsageContext, FileAccessLevel } from '@prisma/client';
import {
  Download,
  Trash2,
  Share2,
  Loader2,
  AlertCircle,
  FileIcon,
} from 'lucide-react';
import { formatBytes } from '@/lib/storage';
import type { FileMetadata } from '@/lib/storage';

interface FileListProps {
  usageContext?: FileUsageContext;
  accessLevel?: FileAccessLevel;
  onShare?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  refreshTrigger?: number;
}

export function FileList({
  usageContext,
  accessLevel,
  onShare,
  onDelete,
  refreshTrigger = 0,
}: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const pageSize = 10;

  // Cargar archivos
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query params
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (usageContext) {
        params.append('usageContext', usageContext);
      }
      if (accessLevel) {
        params.append('accessLevel', accessLevel);
      }

      const response = await fetch(`/api/storage/files?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load files');
      }

      const data = await response.json();
      setFiles(data.data.files);
      setTotal(data.data.pagination.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [usageContext, accessLevel, page, refreshTrigger]);

  // Descargar archivo
  const handleDownload = async (file: FileMetadata) => {
    try {
      const response = await fetch(`/api/storage/download/${file.id}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  // Eliminar archivo
  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/storage/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeleteConfirm(null);
      onDelete?.(fileId);
    } catch (err) {
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  // Calcular página
  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page < totalPages - 1;
  const hasPrev = page > 0;

  if (error && files.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <FileIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p>No files found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Files Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Nombre
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Tamaño
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Creado
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="truncate font-medium text-gray-900">
                    {file.originalName}
                  </div>
                  {file.encrypted && (
                    <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      🔒 Encrypted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatBytes(Number(file.size))}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {file.mimeType.split('/')[1]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(file.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 hover:bg-blue-50 rounded text-blue-600"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {/* Share */}
                    <button
                      onClick={() => onShare?.(file.id)}
                      className="p-2 hover:bg-green-50 rounded text-green-600"
                      title="Compartir"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteConfirm(file.id)}
                      className="p-2 hover:bg-red-50 rounded text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {files.length} de {total} archivos
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!hasPrev}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-3 py-1 text-sm">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <p className="text-gray-900 font-semibold mb-4">
              ¿Eliminar este archivo? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
