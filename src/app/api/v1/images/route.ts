/**
 * Images API Endpoint
 *
 * GET /api/v1/images - List user's generated images
 * DELETE /api/v1/images/[id] - Delete a generated image
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guards';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// GET HANDLER - List Images
// ═══════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    logger.info('[Images API] Fetching images', { userId, limit, offset });

    // 3. Fetch images
    const [images, total] = await Promise.all([
      prisma.generatedImage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          size: true,
          quality: true,
          style: true,
          createdAt: true,
        },
      }),
      prisma.generatedImage.count({
        where: { userId },
      }),
    ]);

    logger.info('[Images API] Images fetched', {
      userId,
      count: images.length,
      total,
    });

    // 4. Return response
    return NextResponse.json(
      {
        images,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + images.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to view images',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Images API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch images',
      },
      { status: 500 }
    );
  }
}
