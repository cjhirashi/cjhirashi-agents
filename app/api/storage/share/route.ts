// ═══════════════════════════════════════════════════════════
// API Route - Create Share Link
// POST /api/storage/share
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { getStorageService } from '@/lib/storage';
import type { ShareType } from '@prisma/client';
import { StorageError, FileNotFoundError, ForbiddenError } from '@/lib/storage';

/**
 * POST /api/storage/share
 *
 * Crea un link de compartición para un archivo
 *
 * Body (JSON):
 * {
 *   fileId: string (requerido)
 *   shareType?: ShareType (default: LINK)
 *   password?: string (opcional)
 *   maxDownloads?: number (opcional)
 *   allowDownload?: boolean (default: true)
 *   allowView?: boolean (default: true)
 *   expiresAt?: ISO 8601 string (opcional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parsear body
    const body = await request.json();
    const {
      fileId,
      shareType = 'LINK',
      password,
      maxDownloads,
      allowDownload = true,
      allowView = true,
      expiresAt,
    } = body;

    // 3. Validar campos requeridos
    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // 4. Validar expiresAt si se proporciona
    let expiresAtDate: Date | undefined;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiresAt format. Use ISO 8601 date string.' },
          { status: 400 }
        );
      }
      // Validar que no esté en el pasado
      if (expiresAtDate < new Date()) {
        return NextResponse.json(
          { error: 'expiresAt cannot be in the past' },
          { status: 400 }
        );
      }
    }

    // 5. Llamar al servicio
    const storageService = getStorageService();
    const result = await storageService.createShare({
      fileId,
      userId,
      shareType,
      password,
      maxDownloads,
      allowDownload,
      allowView,
      expiresAt: expiresAtDate,
    });

    // 6. Retornar respuesta
    return NextResponse.json({
      success: true,
      data: {
        share: result.share,
        shareUrl: result.shareUrl,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Create share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
