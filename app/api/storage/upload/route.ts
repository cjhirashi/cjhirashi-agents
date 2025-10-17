// ═══════════════════════════════════════════════════════════
// API Route - File Upload
// POST /api/storage/upload
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getStorageService } from '@/lib/storage';
import type { FileUsageContext, FileAccessLevel } from '@prisma/client';
import { InvalidFileError, QuotaExceededError, StorageError } from '@/lib/storage';

/**
 * POST /api/storage/upload
 *
 * Sube un archivo al almacenamiento
 *
 * Body (multipart/form-data):
 * - file: File (requerido)
 * - usageContext: FileUsageContext (requerido)
 * - accessLevel?: FileAccessLevel (default: PRIVATE)
 * - folderId?: string
 * - encrypt?: boolean
 * - generateThumbnail?: boolean
 * - metadata?: JSON string
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

    // 2. Parsear form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const usageContext = formData.get('usageContext') as FileUsageContext | null;
    const accessLevel = (formData.get('accessLevel') as FileAccessLevel) || 'PRIVATE';
    const folderId = formData.get('folderId') as string | null;
    const encrypt = formData.get('encrypt') === 'true';
    const generateThumbnail = formData.get('generateThumbnail') === 'true';
    const metadataStr = formData.get('metadata') as string | null;

    // 3. Validar campos requeridos
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!usageContext) {
      return NextResponse.json(
        { error: 'usageContext is required' },
        { status: 400 }
      );
    }

    // 4. Parsear metadata si existe
    let metadata: Record<string, any> | undefined;
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        return NextResponse.json(
          { error: 'Invalid metadata JSON' },
          { status: 400 }
        );
      }
    }

    // 5. Llamar al servicio de storage
    const storageService = getStorageService();

    const result = await storageService.upload({
      file,
      filename: file.name,
      userId,
      mimeType: file.type || 'application/octet-stream',
      usageContext,
      accessLevel,
      folderId: folderId || undefined,
      encrypt,
      generateThumbnail,
      metadata,
    });

    // 6. Retornar respuesta exitosa
    return NextResponse.json({
      success: true,
      data: {
        file: result.file,
        url: result.url,
      },
    }, { status: 201 });

  } catch (error) {
    // Manejo de errores específicos
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error instanceof InvalidFileError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof StorageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    // Error genérico
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
