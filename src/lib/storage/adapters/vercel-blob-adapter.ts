// ═══════════════════════════════════════════════════════════
// Storage System - Vercel Blob Storage Adapter
// Para producción
// ═══════════════════════════════════════════════════════════

import { put, del, head, type PutBlobResult } from '@vercel/blob';
import type {
  StorageAdapter,
  UploadAdapterOptions,
  UploadAdapterResult,
  DownloadAdapterResult,
  FileAdapterMetadata,
} from '../types';
import { FileNotFoundError, StorageError } from '../types';
import { calculateChecksum } from '../utils/encryption';

// ═══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════

export class VercelBlobAdapter implements StorageAdapter {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN || '';

    if (!this.token) {
      throw new StorageError(
        'BLOB_READ_WRITE_TOKEN environment variable not set',
        'STORAGE_INIT_ERROR',
        500
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // IMPLEMENTACIÓN DEL ADAPTER
  // ═══════════════════════════════════════════════════════════

  /**
   * Sube un archivo a Vercel Blob Storage
   */
  async upload(
    file: File | Buffer,
    storagePath: string,
    options?: UploadAdapterOptions
  ): Promise<UploadAdapterResult> {
    try {
      // Convertir File a Buffer si es necesario para calcular checksum
      let buffer: Buffer;
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        buffer = file;
      }

      // Calcular checksum antes de subir
      const checksum = calculateChecksum(buffer);

      // Preparar opciones de upload
      const uploadOptions: Record<string, unknown> = {
        access: 'public', // Podría ser configurable según accessLevel
        token: this.token,
      };

      // Agregar content type si existe
      if (options?.contentType) {
        uploadOptions.contentType = options.contentType;
      }

      // Agregar cache control si existe
      if (options?.cacheControl) {
        uploadOptions.cacheControlMaxAge = parseInt(
          options.cacheControl.replace(/\D/g, ''),
          10
        );
      }

      // Agregar metadata personalizada
      if (options?.metadata) {
        uploadOptions.addRandomSuffix = false; // Usar pathname exacto
      }

      // Subir a Vercel Blob
      let blob: PutBlobResult;
      if (file instanceof File) {
        blob = await put(storagePath, file, uploadOptions);
      } else {
        blob = await put(storagePath, buffer, uploadOptions);
      }

      return {
        path: storagePath,
        size: buffer.length,
        checksum,
        url: blob.url,
      };
    } catch (error) {
      throw new StorageError(
        `Failed to upload file to Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_ERROR',
        500
      );
    }
  }

  /**
   * Descarga un archivo de Vercel Blob Storage
   */
  async download(storagePath: string): Promise<DownloadAdapterResult> {
    try {
      // Obtener metadata primero para verificar existencia
      const metadata = await this.getMetadata(storagePath);

      // Construir URL del blob
      const url = this.getPublicUrl(storagePath);

      // Descargar el blob
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new FileNotFoundError(`File not found: ${storagePath}`);
        }
        throw new StorageError(
          `Failed to download file: HTTP ${response.status}`,
          'DOWNLOAD_ERROR',
          response.status
        );
      }

      // Verificar que body existe
      if (!response.body) {
        throw new StorageError(
          'Response body is null',
          'DOWNLOAD_ERROR',
          500
        );
      }

      return {
        stream: response.body as ReadableStream<Uint8Array>, // ReadableStream
        contentType: metadata.contentType,
        contentLength: metadata.size,
        lastModified: metadata.lastModified,
      };
    } catch (error) {
      if (error instanceof FileNotFoundError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to download file from Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOWNLOAD_ERROR',
        500
      );
    }
  }

  /**
   * Elimina un archivo de Vercel Blob Storage
   */
  async delete(storagePath: string): Promise<void> {
    try {
      // Construir URL del blob
      const url = this.getPublicUrl(storagePath);

      // Eliminar de Vercel Blob
      await del(url, {
        token: this.token,
      });
    } catch (error) {
      throw new StorageError(
        `Failed to delete file from Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR',
        500
      );
    }
  }

  /**
   * Obtiene metadata de un archivo en Vercel Blob
   */
  async getMetadata(storagePath: string): Promise<FileAdapterMetadata> {
    try {
      // Construir URL del blob
      const url = this.getPublicUrl(storagePath);

      // Obtener metadata usando head
      const blob = await head(url, {
        token: this.token,
      });

      if (!blob) {
        throw new FileNotFoundError(`File not found: ${storagePath}`);
      }

      return {
        size: blob.size,
        contentType: blob.contentType || 'application/octet-stream',
        lastModified: blob.uploadedAt,
        etag: undefined, // Vercel Blob no proporciona ETags directamente
      };
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new StorageError(
        `Failed to get metadata from Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_ERROR',
        500
      );
    }
  }

  /**
   * Verifica si un archivo existe en Vercel Blob
   */
  async exists(storagePath: string): Promise<boolean> {
    try {
      await this.getMetadata(storagePath);
      return true;
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   */
  getPublicUrl(storagePath: string): string {
    // Formato de URL de Vercel Blob
    // https://<account>.public.blob.vercel-storage.com/<path>
    const baseUrl = process.env.BLOB_STORE_URL || this.extractBaseUrlFromToken();

    // Sanitizar path
    const sanitizedPath = storagePath.replace(/^\/+/, '');

    return `${baseUrl}/${sanitizedPath}`;
  }

  /**
   * Genera una signed URL para acceso temporal
   * NOTA: Vercel Blob actualmente no soporta signed URLs nativamente
   * Esta implementación retorna la URL pública
   */
  async getSignedUrl(storagePath: string, expiresIn: number): Promise<string> {
    // Por ahora, Vercel Blob no soporta signed URLs
    // Retornamos la URL pública
    // En el futuro, se podría implementar un sistema de tokens temporal
    return this.getPublicUrl(storagePath);
  }

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════

  /**
   * Extrae la URL base del token de Vercel Blob
   */
  private extractBaseUrlFromToken(): string {
    try {
      // El token de Vercel incluye la URL en su estructura
      // Formato: vercel_blob_rw_<random>_<base64url>
      // La URL está codificada en el token
      const parts = this.token.split('_');
      if (parts.length >= 4) {
        const encoded = parts[parts.length - 1];
        const decoded = Buffer.from(encoded, 'base64url').toString();
        const urlMatch = decoded.match(/https:\/\/[^\/]+/);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
    } catch {
      // Si falla la extracción, usar default
    }

    // Fallback a variable de entorno o default
    return (
      process.env.BLOB_STORE_URL ||
      'https://your-account.public.blob.vercel-storage.com'
    );
  }

  /**
   * Lista archivos con un prefijo (útil para listar carpetas)
   * NOTA: Vercel Blob SDK no tiene list() nativo aún
   * Esta es una implementación placeholder
   */
  async listFiles(prefix?: string): Promise<string[]> {
    throw new StorageError(
      'List operation not yet supported by Vercel Blob SDK',
      'NOT_SUPPORTED',
      501
    );
  }

  /**
   * Copia un archivo dentro de Vercel Blob
   * NOTA: Vercel Blob no tiene copy nativo, requiere download + upload
   */
  async copy(sourcePath: string, destPath: string): Promise<void> {
    try {
      // Descargar archivo fuente
      const download = await this.download(sourcePath);

      // Convertir stream a buffer
      const chunks: Uint8Array[] = [];
      // @ts-expect-error - ReadableStream type mismatch
      const reader = download.stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks);

      // Subir a destino
      await this.upload(buffer, destPath, {
        contentType: download.contentType,
      });
    } catch (error) {
      throw new StorageError(
        `Failed to copy file in Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COPY_ERROR',
        500
      );
    }
  }

  /**
   * Mueve un archivo (copy + delete)
   */
  async move(sourcePath: string, destPath: string): Promise<void> {
    try {
      await this.copy(sourcePath, destPath);
      await this.delete(sourcePath);
    } catch (error) {
      throw new StorageError(
        `Failed to move file in Vercel Blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MOVE_ERROR',
        500
      );
    }
  }
}
