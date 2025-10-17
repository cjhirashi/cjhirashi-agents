// ═══════════════════════════════════════════════════════════
// API Route - Download File
// GET /api/storage/download/:id
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { getStorageService } from '@/lib/storage';
import { checkStorageAccess } from '@/lib/storage/middleware';
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Desempaquetar params (Next.js 15 requiere Promise)
    const { id } = await params;

    // 2. Verificar acceso al Storage (solo SUPER_ADMIN, ADMIN e INVITED_STORAGE)
    const accessCheck = await checkStorageAccess();
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.error || 'Storage access denied' },
        { status: 403 }
      );
    }

    const userId = accessCheck.userId!;
    const fileId = id;

    // 3. Validar ID
    if (!fileId || fileId.trim().length === 0) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // 4. Obtener y descargar el archivo
    const storageService = getStorageService();
    const downloadResult = await storageService.download(fileId, userId);

    // 5. Preparar headers
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

    // 6. Retornar stream como response
    return new NextResponse(downloadResult.stream as any, {
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
