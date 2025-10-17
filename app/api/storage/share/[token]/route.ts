// ═══════════════════════════════════════════════════════════
// API Route - Access Shared File
// GET /api/storage/share/:token
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getStorageService } from '@/lib/storage';
import { StorageError, FileNotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/storage';

/**
 * GET /api/storage/share/:token
 *
 * Accede a un archivo compartido mediante token
 * Este endpoint NO requiere autenticación (el token es el acceso)
 *
 * Query Parameters:
 * - password?: string (si el share está protegido)
 *
 * Params:
 * - token: string (share token)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // 1. Validar token
    const token = params.token;
    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    // 2. Obtener password si existe
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password') || undefined;

    // 3. Obtener información del share
    const storageService = getStorageService();
    const result = await storageService.accessSharedFile(token, password);

    // 4. Retornar respuesta
    return NextResponse.json({
      success: true,
      data: {
        file: result.file,
        permissions: {
          canDownload: result.canDownload,
          canView: result.canView,
        },
      },
    });

  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
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

    console.error('Access shared file error:', error);
    return NextResponse.json(
      { error: 'Failed to access shared file' },
      { status: 500 }
    );
  }
}
