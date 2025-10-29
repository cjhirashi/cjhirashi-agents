/**
 * Image Generation API Endpoint
 *
 * POST /api/v1/images/generate
 *
 * Generates images using DALL-E 3
 *
 * Features:
 * - DALL-E 3 integration
 * - Tier-based limits
 * - Cost tracking
 * - Image storage
 * - Error handling
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guards';
import {
  createDALLE3Client,
  calculateCost,
  canGenerateImage,
  getRemainingImages,
  ContentPolicyViolationError,
  RateLimitError,
} from '@/lib/ai/dalle3';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const ImageGenerationRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
});

type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;

// ═══════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();
    const userId = user.id;

    logger.info('[Image Generation] Generating image', { userId });

    // 2. Parse and validate request
    const body: unknown = await request.json();
    const validationResult = ImageGenerationRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[Image Generation] Validation failed', {
        errors: validationResult.error.issues,
      });

      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { prompt, size, quality, style } = validationResult.data;

    // 3. Get user tier
    const userWithTier = await prisma.users.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!userWithTier) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userTier = userWithTier.subscriptionTier;

    // 4. Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const imagesGeneratedToday = await prisma.generated_images.count({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });

    if (!canGenerateImage(userTier, imagesGeneratedToday)) {
      const remaining = getRemainingImages(userTier, imagesGeneratedToday);

      logger.warn('[Image Generation] Tier limit exceeded', {
        userId,
        tier: userTier,
        generatedToday: imagesGeneratedToday,
        remaining,
      });

      return NextResponse.json(
        {
          error: 'Daily image generation limit reached',
          tier: userTier,
          generatedToday: imagesGeneratedToday,
          remaining,
        },
        { status: 429 }
      );
    }

    // 5. Generate image with DALL-E 3
    const dalle3 = createDALLE3Client();

    let result;
    try {
      result = await dalle3.generateImage({
        prompt,
        size,
        quality,
        style,
        user: userId,
      });
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return NextResponse.json(
          {
            error: 'Content policy violation',
            message: error.message,
          },
          { status: 400 }
        );
      }

      if (error instanceof RateLimitError) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: error.message,
          },
          { status: 429 }
        );
      }

      throw error;
    }

    // 6. Calculate cost
    const cost = calculateCost(size, quality);

    // 7. Save to database
    const generatedImage = await prisma.generated_images.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        prompt,
        imageUrl: result.url,
        size,
        quality,
        style,
        cost,
      },
    });

    logger.info('[Image Generation] Image generated successfully', {
      imageId: generatedImage.id,
      userId,
      cost,
      size,
      quality,
    });

    // 8. Return response
    const remaining = getRemainingImages(userTier, imagesGeneratedToday + 1);

    return NextResponse.json(
      {
        image: {
          id: generatedImage.id,
          prompt: generatedImage.prompt,
          url: generatedImage.imageUrl,
          size: generatedImage.size,
          quality: generatedImage.quality,
          style: generatedImage.style,
          createdAt: generatedImage.createdAt,
        },
        cost,
        remaining,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to generate images',
        },
        { status: 401 }
      );
    }

    // Log unexpected errors
    logger.error('[Image Generation] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}
