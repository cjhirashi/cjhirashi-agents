/**
 * GET /api/v1/documents
 *
 * List user's uploaded documents with pagination
 *
 * Rate Limited: 100/min (all tiers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { withRateLimit } from '@/lib/rate-limit';
import { ListDocumentsSchema } from '@/lib/validations/document';
import { ApiError } from '@/lib/errors/ApiError';
import prisma from '@/lib/db/prisma';
import logger from '@/lib/logging/logger';
import { z } from 'zod';

/**
 * GET /api/v1/documents
 *
 * List user's documents with filtering and pagination
 * Rate Limited: 100/min (all tiers)
 */
async function listDocumentsHandler(request: NextRequest) {
  try {
    // 1. Require authentication
    const user = await requireAuth();
    const userId = user.id;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      status: searchParams.get('status'),
      contentType: searchParams.get('contentType'),
      sortBy: searchParams.get('sortBy'),
      order: searchParams.get('order'),
    };

    // 3. Validate query parameters
    const validated = ListDocumentsSchema.parse(queryParams);

    logger.info('[DOCUMENTS List] Request received', {
      userId,
      params: validated,
    });

    // 4. Build query filters
    const where: any = {
      userId,
      deletedAt: null, // Exclude soft-deleted documents
    };

    if (validated.status) {
      where.status = validated.status;
    }

    if (validated.contentType) {
      where.contentType = validated.contentType;
    }

    // 5. Query documents
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          _count: {
            select: {
              chunks: true,
            },
          },
        },
        orderBy: {
          [validated.sortBy]: validated.order,
        },
        skip: validated.offset,
        take: validated.limit,
      }),
      prisma.document.count({ where }),
    ]);

    logger.info('[DOCUMENTS List] Query completed', {
      found: documents.length,
      totalCount,
      userId,
    });

    // 6. Format response
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      filename: doc.originalName,
      size: Number(doc.size),
      mimeType: doc.mimeType,
      status: doc.status,
      totalChunks: doc._count.chunks,
      contentType: doc.contentType,
      language: doc.language,
      processingError: doc.processingError,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    // 7. Return response
    return NextResponse.json(
      {
        data: formattedDocuments,
        pagination: {
          total: totalCount,
          limit: validated.limit,
          offset: validated.offset,
          hasMore: validated.offset + validated.limit < totalCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[DOCUMENTS List] Error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            statusCode: 400,
            timestamp: new Date().toISOString(),
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    // API errors
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
          message: 'An unexpected error occurred',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Export GET with rate limiting wrapper
 *
 * Rate limits: 100/min (all tiers)
 */
export const GET = withRateLimit('documents:list', listDocumentsHandler);
