/**
 * DocumentUpload Component
 *
 * Drag & drop file uploader with validation and progress tracking
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Document } from '@/hooks/useDocuments';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface DocumentUploadProps {
  onUploadSuccess?: (document: Document) => void;
  onError?: (error: Error) => void;
  maxSizeInMB?: number; // Default: 10MB
  acceptedTypes?: string[]; // Default: ['.pdf', '.txt', '.md', '.docx']
}

const DEFAULT_ACCEPTED_TYPES = ['.pdf', '.txt', '.md', '.docx'];
const DEFAULT_MAX_SIZE_MB = 10;

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function DocumentUpload({
  onUploadSuccess,
  onError,
  maxSizeInMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: DocumentUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!acceptedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`,
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeInMB}MB limit`,
      };
    }

    return { valid: true };
  };

  /**
   * Upload file to API
   */
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    setUploadedFile(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload document');
      }

      const data = await response.json();
      setUploadedFile(file.name);
      setProgress(100);

      if (onUploadSuccess) {
        onUploadSuccess(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsUploading(false);
      // Reset progress after 2 seconds
      setTimeout(() => {
        setProgress(0);
        setUploadedFile(null);
      }, 2000);
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      await uploadFile(file);
    },
    [maxSizeInMB, acceptedTypes, onUploadSuccess, onError]
  );

  /**
   * Handle drag events
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Trigger file input click
   */
  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      {/* Dropzone */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Icon */}
        <div className="mb-4">
          {uploadedFile ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploadedFile
              ? `Uploaded: ${uploadedFile}`
              : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepted: {acceptedTypes.join(', ')} (max {maxSizeInMB}MB)
          </p>
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="mt-4 w-full max-w-xs">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-center text-xs text-muted-foreground">Uploading...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
