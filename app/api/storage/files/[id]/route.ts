// ═══════════════════════════════════════════════════════════
// API Route - File Info & Delete
// GET /api/storage/files/:id
// DELETE /api/storage/files/:id
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { getStorageService } from '@/lib/storage';
import { checkStorageAccess } from '@/lib/storage/middleware';
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

    // 4. Obtener información del archivo
    const storageService = getStorageService();
    const file = await storageService.getFileInfo(fileId, userId);

    // 5. Retornar respuesta
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

    // 4. Eliminar archivo
    const storageService = getStorageService();
    await storageService.delete(fileId, userId);

    // 5. Retornar respuesta
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
