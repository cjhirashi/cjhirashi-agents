// ═══════════════════════════════════════════════════════════
// API Route - File Info & Delete
// GET /api/storage/files/:id
// DELETE /api/storage/files/:id
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { getStorageService } from '@/lib/storage';
import { StorageError, FileNotFoundError, ForbiddenError } from '@/lib/storage';

/**
 * GET /api/storage/files/:id
 *
 * Obtiene información detallada de un archivo
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
    const file = await storageService.getFileInfo(fileId, userId);

    // 4. Retornar respuesta
    return NextResponse.json({
      success: true,
      data: file,
    });

  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Get file info error:', error);
    return NextResponse.json(
      { error: 'Failed to get file info' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/files/:id
 *
 * Elimina un archivo (soft delete)
 *
 * Params:
 * - id: string (file ID)
 */
export async function DELETE(
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
    await storageService.delete(fileId, userId);

    // 4. Retornar respuesta
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
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

    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
