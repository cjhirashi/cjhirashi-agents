// ═══════════════════════════════════════════════════════════
// Storage System - Local File System Adapter
// Para desarrollo y testing
// ═══════════════════════════════════════════════════════════

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Readable } from 'stream';
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

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), '.storage');

export class LocalStorageAdapter implements StorageAdapter {
  private storageDir: string;

  constructor(storageDir?: string) {
    this.storageDir = storageDir || process.env.LOCAL_STORAGE_DIR || DEFAULT_STORAGE_DIR;
    this.ensureStorageDirectory();
  }

  /**
   * Asegura que el directorio de almacenamiento exista
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      throw new StorageError(
        `Failed to create storage directory: ${this.storageDir}`,
        'STORAGE_INIT_ERROR',
        500
      );
    }
  }

  /**
   * Obtiene la ruta completa del archivo
   */
  private getFullPath(storagePath: string): string {
    // Sanitizar path para prevenir path traversal
    const sanitized = storagePath.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.storageDir, sanitized);
  }

  /**
   * Asegura que el directorio del archivo exista
   */
  private async ensureFileDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════════
  // IMPLEMENTACIÓN DEL ADAPTER
  // ═══════════════════════════════════════════════════════════

  /**
   * Sube un archivo al sistema de archivos local
   */
  async upload(
    file: File | Buffer,
    storagePath: string,
    options?: UploadAdapterOptions
  ): Promise<UploadAdapterResult> {
    try {
      const fullPath = this.getFullPath(storagePath);

      // Asegurar que el directorio existe
      await this.ensureFileDirectory(fullPath);

      // Convertir File a Buffer si es necesario
      let buffer: Buffer;
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        buffer = file;
      }

      // Escribir archivo
      await fs.writeFile(fullPath, buffer);

      // Calcular checksum
      const checksum = calculateChecksum(buffer);

      // Escribir metadata si existe
      if (options?.metadata) {
        const metadataPath = `${fullPath}.metadata.json`;
        await fs.writeFile(
          metadataPath,
          JSON.stringify({
            contentType: options.contentType,
            metadata: options.metadata,
            cacheControl: options.cacheControl,
            uploadedAt: new Date().toISOString(),
          })
        );
      }

      return {
        path: storagePath,
        size: buffer.length,
        checksum,
        url: undefined, // Local adapter no genera URLs públicas
      };
    } catch (error) {
      throw new StorageError(
        `Failed to upload file to local storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_ERROR',
        500
      );
    }
  }

  /**
   * Descarga un archivo del sistema de archivos local
   */
  async download(storagePath: string): Promise<DownloadAdapterResult> {
    try {
      const fullPath = this.getFullPath(storagePath);

      // Verificar que el archivo existe
      const exists = await this.exists(storagePath);
      if (!exists) {
        throw new FileNotFoundError(`File not found: ${storagePath}`);
      }

      // Obtener metadata del archivo
      const stats = await fs.stat(fullPath);

      // Leer metadata adicional si existe
      let contentType = 'application/octet-stream';
      const metadataPath = `${fullPath}.metadata.json`;
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        contentType = metadata.contentType || contentType;
      } catch {
        // Metadata no existe, usar default
      }

      // Crear stream de lectura
      const stream = fsSync.createReadStream(fullPath);

      return {
        stream: Readable.from(stream),
        contentType,
        contentLength: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new StorageError(
        `Failed to download file from local storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOWNLOAD_ERROR',
        500
      );
    }
  }

  /**
   * Elimina un archivo del sistema de archivos local
   */
  async delete(storagePath: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(storagePath);

      // Verificar que el archivo existe
      const exists = await this.exists(storagePath);
      if (!exists) {
        throw new FileNotFoundError(`File not found: ${storagePath}`);
      }

      // Eliminar archivo
      await fs.unlink(fullPath);

      // Eliminar metadata si existe
      const metadataPath = `${fullPath}.metadata.json`;
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata no existe, continuar
      }
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new StorageError(
        `Failed to delete file from local storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR',
        500
      );
    }
  }

  /**
   * Obtiene metadata de un archivo
   */
  async getMetadata(storagePath: string): Promise<FileAdapterMetadata> {
    try {
      const fullPath = this.getFullPath(storagePath);

      // Verificar que el archivo existe
      const exists = await this.exists(storagePath);
      if (!exists) {
        throw new FileNotFoundError(`File not found: ${storagePath}`);
      }

      // Obtener stats del archivo
      const stats = await fs.stat(fullPath);

      // Leer metadata adicional si existe
      let contentType = 'application/octet-stream';
      const metadataPath = `${fullPath}.metadata.json`;
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        contentType = metadata.contentType || contentType;
      } catch {
        // Metadata no existe, usar default
      }

      return {
        size: stats.size,
        contentType,
        lastModified: stats.mtime,
        etag: undefined, // Local adapter no genera ETags
      };
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      throw new StorageError(
        `Failed to get metadata from local storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_ERROR',
        500
      );
    }
  }

  /**
   * Verifica si un archivo existe
   */
  async exists(storagePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(storagePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Local adapter no soporta URLs públicas
   */
  getPublicUrl(storagePath: string): string {
    throw new StorageError(
      'Local storage adapter does not support public URLs',
      'NOT_SUPPORTED',
      501
    );
  }

  /**
   * Local adapter no soporta signed URLs
   */
  async getSignedUrl(storagePath: string, expiresIn: number): Promise<string> {
    throw new StorageError(
      'Local storage adapter does not support signed URLs',
      'NOT_SUPPORTED',
      501
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════

  /**
   * Lista todos los archivos en el almacenamiento (útil para desarrollo)
   */
  async listFiles(): Promise<string[]> {
    try {
      const files: string[] = [];

      async function walk(dir: string, prefix: string = ''): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(prefix, entry.name);

          if (entry.isDirectory()) {
            await walk(fullPath, relativePath);
          } else if (!entry.name.endsWith('.metadata.json')) {
            files.push(relativePath);
          }
        }
      }

      await walk(this.storageDir);
      return files;
    } catch (error) {
      throw new StorageError(
        'Failed to list files in local storage',
        'LIST_ERROR',
        500
      );
    }
  }

  /**
   * Limpia el directorio de almacenamiento (útil para testing)
   */
  async clear(): Promise<void> {
    try {
      await fs.rm(this.storageDir, { recursive: true, force: true });
      await this.ensureStorageDirectory();
    } catch (error) {
      throw new StorageError(
        'Failed to clear local storage',
        'CLEAR_ERROR',
        500
      );
    }
  }

  /**
   * Obtiene el tamaño total usado en el almacenamiento
   */
  async getTotalSize(): Promise<number> {
    try {
      let totalSize = 0;

      async function calculateSize(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await calculateSize(fullPath);
          } else if (!entry.name.endsWith('.metadata.json')) {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }
      }

      await calculateSize(this.storageDir);
      return totalSize;
    } catch (error) {
      throw new StorageError(
        'Failed to calculate total size in local storage',
        'SIZE_ERROR',
        500
      );
    }
  }
}
