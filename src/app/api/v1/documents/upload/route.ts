/**
 * POST /api/v1/documents/upload
 *
 * Upload document for RAG indexing
 *
 * Supports: PDF, TXT, MD
 * Rate Limited: 0/hour (FREE), 10/hour (PRO), 100/hour (ENTERPRISE)
 * Max File Size: 0MB (FREE), 10MB (PRO), 50MB (ENTERPRISE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTier } from '@/lib/auth/guards';
import { withRateLimit } from '@/lib/rate-limit';
import { processDocument } from '@/lib/rag/pipeline';
import {
  validateMimeType,
  validateFileSize,
  getMaxFileSize,
  formatFileSize,
  UploadDocumentSchema,
  FILE_SIZE_LIMITS,
} from '@/lib/validations/document';
import { ApiError } from '@/lib/errors/ApiError';
import logger from '@/lib/logging/logger';
import type { SubscriptionTier } from '@prisma/client';

/**
 * POST /api/v1/documents/upload
 *
 * Upload and process document through RAG pipeline
 * Rate Limited: 0/hour (FREE), 10/hour (PRO), 100/hour (ENTERPRISE)
 */
async function uploadDocumentHandler(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;
    const userTier = user.tier;

    // 2. Require PRO tier or higher (FREE tier cannot upload)
    await requireTier(['PRO', 'ENTERPRISE', 'UNLIMITED']);

    logger.info('[DOCUMENTS Upload] Request received', {
      userId,
      tier: userTier,
    });

    // 3. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contentType = formData.get('contentType') as string | null;
    const language = formData.get('language') as string | null;
    const chunkSize = formData.get('chunkSize') as string | null;
    const chunkOverlap = formData.get('chunkOverlap') as string | null;

    if (!file) {
      throw new ApiError('No file provided', 400, 'VALIDATION_ERROR');
    }

    logger.info('[DOCUMENTS Upload] File received', {
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      userId,
    });

    // 4. Validate file mime type
    if (!validateMimeType(file.type)) {
      throw new ApiError(
        `Unsupported file type: ${file.type}. Supported types: PDF, TXT, MD`,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // 5. Validate file size for user's tier
    const maxFileSize = getMaxFileSize(userTier as keyof typeof FILE_SIZE_LIMITS);

    if (!validateFileSize(file.size, userTier as keyof typeof FILE_SIZE_LIMITS)) {
      throw new ApiError(
        `File size exceeds limit for ${userTier} tier. Maximum: ${formatFileSize(
          maxFileSize
        )}`,
        413,
        'FILE_TOO_LARGE'
      );
    }

    // 6. Validate metadata
    const metadata = UploadDocumentSchema.parse({
      contentType: contentType || 'GENERAL',
      language: language || 'es',
      chunkSize: chunkSize ? parseInt(chunkSize) : 800,
      chunkOverlap: chunkOverlap ? parseInt(chunkOverlap) : 200,
    });

    logger.info('[DOCUMENTS Upload] Metadata validated', {
      contentType: metadata.contentType,
      language: metadata.language,
      chunkSize: metadata.chunkSize,
      chunkOverlap: metadata.chunkOverlap,
      userId,
    });

    // 7. Process document through RAG pipeline
    logger.info('[DOCUMENTS Upload] Starting RAG processing', {
      filename: file.name,
      userId,
    });

    const result = await processDocument({
      userId,
      file,
      contentType: metadata.contentType as any,
      language: metadata.language,
      chunkSize: metadata.chunkSize,
      chunkOverlap: metadata.chunkOverlap,
    });

    if (!result.success) {
      throw new ApiError(
        `Processing failed: ${result.error}`,
        500,
        'PROCESSING_ERROR'
      );
    }

    const processingTime = Date.now() - startTime;

    logger.info('[DOCUMENTS Upload] Processing completed', {
      documentId: result.document.id,
      chunksCreated: result.chunksCreated,
      vectorsStored: result.vectorsStored,
      processingTime,
      userId,
    });

    // 8. Return success response
    return NextResponse.json(
      {
        data: {
          id: result.document.id,
          filename: result.document.originalName,
          size: Number(result.document.size),
          mimeType: result.document.mimeType,
          status: result.document.status,
          totalChunks: result.chunksCreated,
          vectorsStored: result.vectorsStored,
          contentType: result.document.contentType,
          language: result.document.language,
          processingTime,
          createdAt: result.document.createdAt.toISOString(),
        },
        message: 'Document uploaded and indexed successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[DOCUMENTS Upload] Error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString(),
          },
        },
        { status: error.statusCode }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during upload',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Export with rate limiting wrapper
 *
 * Rate limits:
 * - FREE: 0/hour (disabled)
 * - PRO: 10/hour
 * - ENTERPRISE: 100/hour
 */
export const POST = withRateLimit('documents:upload', uploadDocumentHandler);
