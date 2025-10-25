/**
 * DELETE /api/v1/documents/[id]
 *
 * Delete document and remove from vector index
 *
 * Rate Limited: 50/min (all tiers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { deleteDocument } from '@/lib/rag/pipeline';
import { ApiError } from '@/lib/errors/ApiError';
import logger from '@/lib/logging/logger';

/**
 * DELETE /api/v1/documents/[id]
 *
 * Soft delete document and remove vectors from Pinecone
 * Rate Limited: 50/min (all tiers)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;

    // 2. Get document ID from params
    const { id: documentId } = await params;

    logger.info('[DOCUMENTS Delete] Request received', {
      documentId,
      userId,
    });

    // 3. Delete document (soft delete + remove vectors)
    await deleteDocument(documentId, userId);

    logger.info('[DOCUMENTS Delete] Document deleted successfully', {
      documentId,
      userId,
    });

    // 4. Return success response
    return NextResponse.json(
      {
        message: 'Document deleted successfully',
        data: {
          id: documentId,
          deletedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[DOCUMENTS Delete] Error', {
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

    // Handle authorization errors
    if (
      error instanceof Error &&
      error.message.includes('Unauthorized')
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have permission to delete this document',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Handle not found errors
    if (
      error instanceof Error &&
      error.message.includes('not found')
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
