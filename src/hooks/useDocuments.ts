/**
 * useDocuments Hook
 *
 * Manages document operations (upload, list, delete, details)
 * with auto-refresh for processing documents
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  filesize: number;
  status: 'processing' | 'ready' | 'failed';
  uploadedAt: Date;
  contentType: string;
}

export interface DocumentDetails extends Document {
  storageUrl: string;
  embeddingStatus: string;
  chunks: number;
  extractedText?: string;
  errorMessage?: string;
}

export interface DocumentMetadata {
  language?: string;
  tags?: string[];
}

export interface UseDocumentsOptions {
  autoRefresh?: boolean; // Auto-refresh every 5s if there are "processing" docs
  onUploadSuccess?: (document: Document) => void;
  onError?: (error: Error) => void;
}

export interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  isUploading: boolean;
  error: Error | null;
  uploadDocument: (file: File, metadata?: DocumentMetadata) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  getDocument: (documentId: string) => Promise<DocumentDetails>;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useDocuments(options: UseDocumentsOptions = {}): UseDocumentsReturn {
  const { autoRefresh = true, onUploadSuccess, onError } = options;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch documents from API
   */
  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/v1/documents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch documents');
      }

      const data = await response.json();
      const docs = data.documents || [];

      // Transform dates
      const transformedDocs = docs.map((doc: Record<string, unknown>) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt as string),
      })) as Document[];

      setDocuments(transformedDocs);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Upload document to API
   */
  const uploadDocument = useCallback(
    async (file: File, metadata?: DocumentMetadata): Promise<Document> => {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        if (metadata?.language) {
          formData.append('language', metadata.language);
        }

        if (metadata?.tags && metadata.tags.length > 0) {
          formData.append('tags', JSON.stringify(metadata.tags));
        }

        const response = await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to upload document');
        }

        const data = await response.json();
        const uploadedDoc = {
          ...data,
          uploadedAt: new Date(data.uploadedAt),
        } as Document;

        // Add to local state
        setDocuments((prev) => [uploadedDoc, ...prev]);

        if (onUploadSuccess) {
          onUploadSuccess(uploadedDoc);
        }

        return uploadedDoc;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        if (onError) {
          onError(error);
        }
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, onError]
  );

  /**
   * Delete document from API
   */
  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      setError(null);

      try {
        const response = await fetch(`/api/v1/documents/${documentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to delete document');
        }

        // Optimistic update
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
    [onError]
  );

  /**
   * Get document details
   */
  const getDocument = useCallback(
    async (documentId: string): Promise<DocumentDetails> => {
      setError(null);

      try {
        const response = await fetch(`/api/v1/documents/${documentId}`, {
          method: 'GET',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch document details');
        }

        const data = await response.json();
        return {
          ...data,
          uploadedAt: new Date(data.uploadedAt),
        } as DocumentDetails;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
    [onError]
  );

  /**
   * Refresh documents manually
   */
  const refreshDocuments = useCallback(async () => {
    setIsLoading(true);
    await fetchDocuments();
  }, [fetchDocuments]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    // Initial fetch
    fetchDocuments();

    // Setup auto-refresh if enabled and there are processing documents
    if (autoRefresh) {
      const hasProcessingDocs = documents.some((doc) => doc.status === 'processing');

      if (hasProcessingDocs) {
        // Refresh every 5 seconds
        refreshIntervalRef.current = setInterval(() => {
          fetchDocuments();
        }, 5000);
      } else {
        // Clear interval if no processing documents
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      }
    }

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, documents, fetchDocuments]);

  return {
    documents,
    isLoading,
    isUploading,
    error,
    uploadDocument,
    deleteDocument,
    refreshDocuments,
    getDocument,
  };
}
