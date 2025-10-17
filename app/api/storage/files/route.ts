// ═══════════════════════════════════════════════════════════
// API Route - List Files
// GET /api/storage/files
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { getStorageService } from '@/lib/storage';
import type { FileUsageContext, FileAccessLevel } from '@prisma/client';
import { StorageError } from '@/lib/storage';

/**
 * GET /api/storage/files
 *
 * Lista archivos del usuario con paginación y filtros
 *
 * Query Parameters:
 * - folderId?: string
 * - usageContext?: FileUsageContext
 * - accessLevel?: FileAccessLevel
 * - limit?: number (default: 50, max: 100)
 * - offset?: number (default: 0)
 * - sortBy?: 'createdAt' | 'updatedAt' | 'size' | 'filename' (default: createdAt)
 * - sortOrder?: 'asc' | 'desc' (default: desc)
 * - search?: string (busca en filename y originalName)
 */
export async function GET(request: NextRequest) {
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

    // 2. Parsear query parameters
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId') || undefined;
    const usageContext = (searchParams.get('usageContext') as FileUsageContext) || undefined;
    const accessLevel = (searchParams.get('accessLevel') as FileAccessLevel) || undefined;
    const search = searchParams.get('search') || undefined;

    // Paginación
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    let offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validar limites
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;

    // Ordenamiento
    const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

    // Validar sortBy
    const validSortBy = ['createdAt', 'updatedAt', 'size', 'filename'];
    if (!validSortBy.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy. Valid options: ${validSortBy.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar sortOrder
    if (!['asc', 'desc'].includes(sortOrder)) {
      return NextResponse.json(
        { error: 'sortOrder must be "asc" or "desc"' },
        { status: 400 }
      );
    }

    // 3. Llamar al servicio de storage
    const storageService = getStorageService();

    const result = await storageService.listFiles({
      userId,
      folderId,
      usageContext,
      accessLevel,
      limit,
      offset,
      sortBy,
      sortOrder,
      search,
    });

    // 4. Retornar respuesta
    return NextResponse.json({
      success: true,
      data: {
        files: result.files,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: result.hasMore,
        },
      },
    });

  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('List files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}
