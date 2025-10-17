// ═══════════════════════════════════════════════════════════
// API Route - Download File
// GET /api/storage/download/:id
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { getStorageService } from '@/lib/storage';
import { StorageError, FileNotFoundError, ForbiddenError } from '@/lib/storage';

/**
 * GET /api/storage/download/:id
 *
 * Descarga un archivo
 *
 * Params:
 * - id: string (file ID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fileId = params.id;

    // 2. Validar ID
    if (!fileId || fileId.trim().length === 0) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // 3. Llamar al servicio
    const storageService = getStorageService();
    const downloadResult = await storageService.download(fileId, userId);

    // 4. Preparar headers
    const headers = new Headers();
    headers.set('Content-Type', downloadResult.contentType);
    headers.set('Content-Length', downloadResult.contentLength.toString());
    headers.set(
      'Content-Disposition',
      `attachment; filename="${downloadResult.file.originalName}"`
    );

    // Cache headers
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // 5. Retornar stream como response
    return new NextResponse(downloadResult.stream, {
      status: 200,
      headers,
    });

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

    console.error('Download file error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
