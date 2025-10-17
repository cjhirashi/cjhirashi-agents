// ═══════════════════════════════════════════════════════════
// Component - File Uploader
// Drag & drop upload component with progress
// ═══════════════════════════════════════════════════════════

'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileUsageContext, FileAccessLevel } from '@prisma/client';
import { Upload, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { formatBytes } from '@/lib/storage';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFileId?: string;
}

interface FileUploaderProps {
  usageContext: FileUsageContext;
  accessLevel?: FileAccessLevel;
  onUploadComplete?: (fileId: string) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxSize?: number;
}

export function FileUploader({
  usageContext,
  accessLevel = 'PRIVATE',
  onUploadComplete,
  onError,
  maxFiles = 5,
  maxSize = 104857600, // 100MB
}: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Validar cantidad máxima
      if (acceptedFiles.length > maxFiles) {
        const error = `Máximo ${maxFiles} archivos permitidos`;
        onError?.(error);
        return;
      }

      // Agregar archivos a la cola
      const newUploads: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending',
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Procesar uploads
      for (const upload of newUploads) {
        await uploadFile(upload);
      }
    },
    [maxFiles, onError]
  );

  const uploadFile = async (upload: UploadFile) => {
    try {
      // Marcar como uploading
      setUploads((prev) =>
        prev.map((u) =>
          u === upload ? { ...u, status: 'uploading' } : u
        )
      );

      // Crear FormData
      const formData = new FormData();
      formData.append('file', upload.file);
      formData.append('usageContext', usageContext);
      formData.append('accessLevel', accessLevel);

      // Upload con fetch (sin usar XMLHttpRequest)
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      // Marcar como exitoso
      setUploads((prev) =>
        prev.map((u) =>
          u === upload
            ? {
                ...u,
                status: 'success',
                progress: 100,
                uploadedFileId: data.data.file.id,
              }
            : u
        )
      );

      // Callback
      onUploadComplete?.(data.data.file.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Marcar como error
      setUploads((prev) =>
        prev.map((u) =>
          u === upload
            ? {
                ...u,
                status: 'error',
                error: errorMessage,
              }
            : u
        )
      );

      onError?.(errorMessage);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
  });

  const removeUpload = (upload: UploadFile) => {
    setUploads((prev) => prev.filter((u) => u !== upload));
  };

  const successCount = uploads.filter((u) => u.status === 'success').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Suelta los archivos aquí...</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Máximo: {maxFiles} archivos, {formatBytes(maxSize)}
            </p>
          </>
        )}
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Archivos ({uploads.length})</h3>
            {(successCount > 0 || errorCount > 0) && (
              <div className="text-sm text-gray-600">
                {successCount > 0 && (
                  <span className="text-green-600 mr-4">
                    ✓ {successCount} exitoso
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600">✗ {errorCount} error</span>
                )}
              </div>
            )}
          </div>

          {/* Upload Items */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {uploads.map((upload, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {upload.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  )}
                  {upload.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {upload.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {upload.file.name}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      {formatBytes(upload.file.size)}
                    </p>
                    {upload.status === 'uploading' && (
                      <p className="text-xs text-gray-500">{upload.progress}%</p>
                    )}
                    {upload.status === 'error' && (
                      <p className="text-xs text-red-600">{upload.error}</p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(upload.status === 'uploading' || upload.status === 'pending') && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {(upload.status === 'success' || upload.status === 'error') && (
                  <button
                    onClick={() => removeUpload(upload)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                    title="Eliminar"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
