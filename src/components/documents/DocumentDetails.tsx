/**
 * DocumentDetails Component
 *
 * Sheet/Modal displaying full document details with preview
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, Loader2, AlertCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DocumentDetails as DocumentDetailsType } from '@/hooks/useDocuments';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface DocumentDetailsProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function DocumentDetails({ documentId, open, onClose }: DocumentDetailsProps) {
  const [document, setDocument] = useState<DocumentDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);

  /**
   * Fetch document details
   */
  useEffect(() => {
    if (!open || !documentId) {
      return;
    }

    let isMounted = true;
    let refreshInterval: NodeJS.Timeout | null = null;

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/documents/${documentId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch document details');
        }

        const data = await response.json();

        if (isMounted) {
          setDocument({
            ...data,
            uploadedAt: new Date(data.uploadedAt),
          });
          setIsLoading(false);

          // Auto-refresh if processing
          if (data.status === 'processing') {
            refreshInterval = setInterval(() => {
              fetchDetails();
            }, 3000);
          } else {
            // Clear interval if status changed to ready/failed
            if (refreshInterval) {
              clearInterval(refreshInterval);
              refreshInterval = null;
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [documentId, open]);

  /**
   * Handle download
   */
  const handleDownload = () => {
    if (document && document.storageUrl) {
      window.open(document.storageUrl, '_blank');
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/v1/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  /**
   * Render status badge
   */
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="secondary" className="animate-pulse">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'ready':
        return <Badge variant="default">Ready</Badge>;
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document?.originalName || 'Document Details'}
          </SheetTitle>
          <SheetDescription>
            {document ? `Uploaded ${formatDistanceToNow(document.uploadedAt, { addSuffix: true })}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Document details */}
          {!isLoading && !error && document && (
            <>
              {/* Metadata section */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File size:</span>
                    <span className="font-medium">{formatFileSize(document.filesize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Content type:</span>
                    <span className="font-medium">{document.contentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upload date:</span>
                    <span className="font-medium">
                      {document.uploadedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {renderStatusBadge(document.status)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Processing info */}
              {document.status === 'ready' && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Processing Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chunks:</span>
                      <span className="font-medium">{document.chunks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Embedding status:</span>
                      <span className="font-medium">{document.embeddingStatus}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Text preview */}
              {document.status === 'ready' && document.extractedText && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Text Preview</h3>
                  <div className="rounded-md bg-muted p-4 text-sm">
                    <p className="whitespace-pre-wrap font-mono text-xs">
                      {showFullText
                        ? document.extractedText
                        : `${document.extractedText.slice(0, 500)}...`}
                    </p>
                    {document.extractedText.length > 500 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowFullText(!showFullText)}
                        className="mt-2 h-auto p-0 text-xs"
                      >
                        {showFullText ? 'Show less' : 'Show more...'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Error details */}
              {document.status === 'failed' && document.errorMessage && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-destructive">Error Details</h3>
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                    <p>{document.errorMessage}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                {document.status === 'ready' && (
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
                <Button variant="destructive" onClick={handleDelete} className="flex-1">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
