/**
 * Single Image API Endpoint
 *
 * DELETE /api/v1/images/[id] - Delete a generated image
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guards';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// DELETE HANDLER
// ═══════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const { id: imageId } = await params;

    logger.info('[Image API] Deleting image', { imageId, userId });

    // 2. Fetch image
    const image = await prisma.generated_images.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      logger.warn('[Image API] Image not found', { imageId });

      return NextResponse.json(
        {
          error: 'Image not found',
        },
        { status: 404 }
      );
    }

    // 3. Verify ownership
    if (image.userId !== userId) {
      logger.warn('[Image API] Unauthorized access attempt', {
        imageId,
        userId,
        ownerId: image.userId,
      });

      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to delete this image',
        },
        { status: 403 }
      );
    }

    // 4. Delete image from database
    await prisma.generated_images.delete({
      where: { id: imageId },
    });

    logger.info('[Image API] Image deleted', { imageId, userId });

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Image deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to delete images',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Image API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete image',
      },
      { status: 500 }
    );
  }
}
