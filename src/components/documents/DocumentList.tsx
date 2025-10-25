/**
 * DocumentList Component
 *
 * Table/list of documents with status badges, actions, and empty state
 */

'use client';

import React, { useState } from 'react';
import { FileText, Trash2, Eye, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Document } from '@/hooks/useDocuments';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onDelete: (documentId: string) => void;
  onView: (documentId: string) => void;
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

function getFileIcon(contentType: string) {
  if (contentType.includes('pdf')) return '📄';
  if (contentType.includes('text')) return '📝';
  if (contentType.includes('word')) return '📘';
  return '📄';
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function DocumentList({ documents, isLoading, onDelete, onView }: DocumentListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /**
   * Handle delete confirmation
   */
  const handleDeleteClick = (documentId: string) => {
    setDeleteConfirmId(documentId);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  /**
   * Render status badge
   */
  const renderStatusBadge = (status: Document['status']) => {
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

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  /**
   * Empty state
   */
  if (documents.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">No documents uploaded yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload your first document to get started
        </p>
      </div>
    );
  }

  /**
   * Documents table
   */
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Filename</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                {/* Icon */}
                <TableCell>
                  <span className="text-2xl">{getFileIcon(doc.contentType)}</span>
                </TableCell>

                {/* Filename */}
                <TableCell>
                  <div className="font-medium">{doc.originalName}</div>
                  <div className="text-xs text-muted-foreground">{doc.contentType}</div>
                </TableCell>

                {/* Size */}
                <TableCell>{formatFileSize(doc.filesize)}</TableCell>

                {/* Status */}
                <TableCell>{renderStatusBadge(doc.status)}</TableCell>

                {/* Uploaded */}
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(doc.id)}
                      disabled={doc.status === 'processing'}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="ml-2">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={handleDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
