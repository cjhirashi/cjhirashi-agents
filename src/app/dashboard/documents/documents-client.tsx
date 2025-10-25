/**
 * Documents Client Component
 *
 * Client-side logic for document management
 */

'use client';

import React, { useState } from 'react';
import { useDocuments, type Document } from '@/hooks/useDocuments';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentDetails } from '@/components/documents/DocumentDetails';
import { QuotaTracker } from '@/components/documents/QuotaTracker';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface DocumentsClientProps {
  initialDocuments: Document[];
  usedBytes: number;
  limitBytes: number;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function DocumentsClient({
  initialDocuments,
  usedBytes: initialUsedBytes,
  limitBytes,
  tier,
}: DocumentsClientProps) {
  const { toast } = useToast();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [usedBytes, setUsedBytes] = useState(initialUsedBytes);

  const {
    documents,
    isLoading,
    isUploading,
    error,
    uploadDocument,
    deleteDocument,
    refreshDocuments,
  } = useDocuments({
    autoRefresh: true,
    onUploadSuccess: (document) => {
      toast({
        title: 'Upload successful',
        description: `${document.originalName} has been uploaded and is being processed.`,
      });
      // Update used bytes
      setUsedBytes((prev) => prev + document.filesize);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Handle upload
   */
  const handleUpload = async (file: File) => {
    try {
      await uploadDocument(file);
    } catch (err) {
      // Error already handled by onError callback
      console.error('Upload failed:', err);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async (documentId: string) => {
    try {
      // Find document to get size
      const doc = documents.find((d) => d.id === documentId);
      await deleteDocument(documentId);

      toast({
        title: 'Document deleted',
        description: 'The document has been deleted successfully.',
      });

      // Update used bytes
      if (doc) {
        setUsedBytes((prev) => prev - doc.filesize);
      }
    } catch (err) {
      // Error already handled by onError callback
      console.error('Delete failed:', err);
    }
  };

  /**
   * Handle view
   */
  const handleView = (documentId: string) => {
    setSelectedDocumentId(documentId);
  };

  /**
   * Handle close details
   */
  const handleCloseDetails = () => {
    setSelectedDocumentId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Upload and manage your documents for RAG-powered conversations
        </p>
      </div>

      {/* Quota tracker */}
      <QuotaTracker usedBytes={usedBytes} limitBytes={limitBytes} tier={tier} />

      {/* Upload section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Upload Document</h2>
        <DocumentUpload
          onUploadSuccess={handleUpload}
          onError={(error) => {
            toast({
              title: 'Upload failed',
              description: error.message,
              variant: 'destructive',
            });
          }}
        />
      </div>

      {/* Documents list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Your Documents</h2>
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          onDelete={handleDelete}
          onView={handleView}
        />
      </div>

      {/* Document details sheet */}
      {selectedDocumentId && (
        <DocumentDetails
          documentId={selectedDocumentId}
          open={selectedDocumentId !== null}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
