/**
 * Document API Validation Schemas
 *
 * Zod schemas para validación de endpoints de RAG Pipeline
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// SUPPORTED MIME TYPES
// ═══════════════════════════════════════════════════════════

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
] as const;

export type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];

// ═══════════════════════════════════════════════════════════
// FILE SIZE LIMITS (por tier)
// ═══════════════════════════════════════════════════════════

export const FILE_SIZE_LIMITS = {
  FREE: 0, // Disabled for FREE tier
  PRO: 10 * 1024 * 1024, // 10MB
  ENTERPRISE: 50 * 1024 * 1024, // 50MB
} as const;

export type SubscriptionTier = keyof typeof FILE_SIZE_LIMITS;

// ═══════════════════════════════════════════════════════════
// POST /api/v1/documents/upload
// ═══════════════════════════════════════════════════════════

/**
 * Upload document request schema
 *
 * NOTE: File validation happens separately using FormData
 * This schema validates metadata and options
 */
export const UploadDocumentSchema = z.object({
  // Document metadata
  contentType: z.enum([
    'GENERAL',
    'TECHNICAL',
    'MEDICAL',
    'FINANCIAL',
    'LEGAL',
    'EDUCATIONAL',
    'PERSONAL',
    'OTHER',
  ]).default('GENERAL'),

  language: z.string().min(2).max(5).default('es'), // ISO 639-1 code

  // Processing options
  chunkSize: z.number().int().min(100).max(2000).default(800), // Tokens per chunk
  chunkOverlap: z.number().int().min(0).max(500).default(200), // Overlap tokens
});

export type UploadDocumentRequest = z.infer<typeof UploadDocumentSchema>;

// ═══════════════════════════════════════════════════════════
// GET /api/v1/documents (List documents)
// ═══════════════════════════════════════════════════════════

export const ListDocumentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['PENDING', 'PROCESSING', 'INDEXING', 'COMPLETED', 'FAILED', 'DELETED']).optional(),
  contentType: z.enum([
    'GENERAL',
    'TECHNICAL',
    'MEDICAL',
    'FINANCIAL',
    'LEGAL',
    'EDUCATIONAL',
    'PERSONAL',
    'OTHER',
  ]).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'filename', 'size']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListDocumentsQuery = z.infer<typeof ListDocumentsSchema>;

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Validate file mime type
 */
export function validateMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}

/**
 * Validate file size for subscription tier
 */
export function validateFileSize(size: number, tier: SubscriptionTier): boolean {
  const limit = FILE_SIZE_LIMITS[tier];

  if (limit === 0) {
    return false; // Feature disabled for this tier
  }

  return size <= limit;
}

/**
 * Get maximum file size for tier
 */
export function getMaxFileSize(tier: SubscriptionTier): number {
  return FILE_SIZE_LIMITS[tier];
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
