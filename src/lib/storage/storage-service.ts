// ═══════════════════════════════════════════════════════════
// Storage System - Core Service
// Servicio principal de gestión de almacenamiento
// ═══════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import type {
  StorageProvider,
  FileAccessLevel,
  FileUsageContext,
  FileAction,
  ShareType,
} from '@prisma/client';
import type {
  StorageAdapter,
  UploadOptions,
  UploadResult,
  ListFilesOptions,
  ListFilesResult,
  DownloadResult,
  CreateShareOptions,
  ShareLinkResult,
  FileMetadata,
  QuotaInfo,
} from './types';
import {
  FileNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  QuotaExceededError,
  StorageError,
} from './types';
import { createStorageAdapter } from './adapters/factory';
import {
  validateFile,
  generateUniqueFilename,
  sanitizeFilename,
  getQuotaLimits,
} from './utils/validation';
import {
  encryptFile,
  decryptFile,
  calculateChecksum,
  generateShareToken,
  hashPassword,
  verifyPassword,
  requiresEncryption,
} from './utils/encryption';

// ═══════════════════════════════════════════════════════════
// STORAGE SERVICE
// ═══════════════════════════════════════════════════════════

export class StorageService {
  private adapter: StorageAdapter;
  private provider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.provider = provider || this.getDefaultProvider();
    this.adapter = createStorageAdapter(this.provider);
  }

  /**
   * Obtiene el provider por defecto según el entorno
   */
  private getDefaultProvider(): StorageProvider {
    return process.env.NODE_ENV === 'production' ? 'VERCEL_BLOB' : 'LOCAL';
  }

  // ═══════════════════════════════════════════════════════════
  // UPLOAD
  // ═══════════════════════════════════════════════════════════

  /**
   * Sube un archivo al almacenamiento
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const {
      file,
      filename,
      userId,
      mimeType,
      usageContext,
      accessLevel = 'PRIVATE',
      folderId,
      encrypt: shouldEncrypt,
      generateThumbnail,
      expiresAt,
      metadata: customMetadata,
    } = options;

    // 1. Obtener cuota del usuario
    const quota = await this.getOrCreateQuota(userId);

    // 2. Validar archivo
    await validateFile(file, {
      filename,
      mimeType,
      usageContext,
      quota,
    });

    // 3. Determinar si debe encriptarse
    const mustEncrypt = shouldEncrypt ?? requiresEncryption(usageContext);

    // 4. Preparar archivo para subida
    let fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    let encryptionData: { iv: string; authTag: string; keyId: string } | undefined;

    if (mustEncrypt) {
      const encrypted = encryptFile(fileBuffer);
      fileBuffer = encrypted.data;
      encryptionData = {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
      };
    }

    // 5. Calcular checksum
    const checksum = calculateChecksum(fileBuffer);

    // 6. Generar nombre único y path
    const uniqueFilename = generateUniqueFilename(filename);
    const storagePath = this.generateStoragePath(userId, usageContext, uniqueFilename);

    // 7. Subir al adapter
    const uploadResult = await this.adapter.upload(fileBuffer, storagePath, {
      contentType: mimeType,
      metadata: customMetadata,
    });

    // 8. Crear registro en base de datos
    const fileRecord = await prisma.storageFile.create({
      data: {
        filename: uniqueFilename,
        originalName: sanitizeFilename(filename),
        storagePath: uploadResult.path,
        storageProvider: this.provider,
        mimeType,
        size: BigInt(uploadResult.size),
        checksum,
        userId,
        folderId,
        accessLevel,
        usageContext,
        encrypted: mustEncrypt,
        encryptionKeyId: encryptionData?.keyId,
        metadata: encryptionData
          ? {
              ...customMetadata,
              encryption: {
                iv: encryptionData.iv,
                authTag: encryptionData.authTag,
              },
            }
          : customMetadata,
        expiresAt,
      },
    });

    // 9. Actualizar cuota del usuario
    await this.updateQuotaAfterUpload(userId, uploadResult.size, usageContext);

    // 10. Registrar acceso
    await this.logFileAccess(fileRecord.id, userId, 'UPLOAD');

    // 11. Procesar thumbnail si se solicita (async, no bloqueante)
    if (generateThumbnail && mimeType.startsWith('image/')) {
      this.generateThumbnailAsync(fileRecord.id).catch(console.error);
    }

    return {
      file: this.mapToFileMetadata(fileRecord),
      url: uploadResult.url,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════

  /**
   * Descarga un archivo del almacenamiento
   */
  async download(
    fileId: string,
    userId: string,
    options?: { skipAccessCheck?: boolean }
  ): Promise<DownloadResult> {
    // 1. Obtener registro del archivo
    const fileRecord = await prisma.storageFile.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord || fileRecord.deletedAt) {
      throw new FileNotFoundError(`File not found: ${fileId}`);
    }

    // 2. Verificar acceso (a menos que se indique lo contrario)
    if (!options?.skipAccessCheck) {
      await this.checkFileAccess(fileRecord, userId, 'download');
    }

    // 3. Descargar del adapter
    const downloadResult = await this.adapter.download(fileRecord.storagePath);

    // 4. Desencriptar si es necesario
    let stream = downloadResult.stream;
    if (fileRecord.encrypted && fileRecord.metadata) {
      const encryptionData = (fileRecord.metadata as any).encryption;
      if (encryptionData?.iv && encryptionData?.authTag) {
        // Para streams, necesitaríamos implementar decryptStream
        // Por ahora, convertir a buffer (no óptimo para archivos grandes)
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const encryptedBuffer = Buffer.concat(chunks);
        const decryptedBuffer = decryptFile(
          encryptedBuffer,
          encryptionData.iv,
          encryptionData.authTag
        );

        // Crear nuevo stream desde buffer desencriptado
        stream = new ReadableStream({
          start(controller) {
            controller.enqueue(decryptedBuffer);
            controller.close();
          },
        }) as any;
      }
    }

    // 5. Registrar acceso
    await this.logFileAccess(fileId, userId, 'DOWNLOAD');

    return {
      stream,
      file: this.mapToFileMetadata(fileRecord),
      contentType: fileRecord.mimeType,
      contentLength: Number(fileRecord.size),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════

  /**
   * Elimina un archivo (soft delete)
   */
  async delete(fileId: string, userId: string): Promise<void> {
    // 1. Obtener registro del archivo
    const fileRecord = await prisma.storageFile.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord || fileRecord.deletedAt) {
      throw new FileNotFoundError(`File not found: ${fileId}`);
    }

    // 2. Verificar acceso
    await this.checkFileAccess(fileRecord, userId, 'delete');

    // 3. Soft delete en base de datos
    await prisma.storageFile.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // 4. Actualizar cuota del usuario
    await this.updateQuotaAfterDelete(userId, Number(fileRecord.size), fileRecord.usageContext);

    // 5. Registrar acceso
    await this.logFileAccess(fileId, userId, 'DELETE');

    // 6. Eliminar físicamente del storage (async, no bloqueante)
    this.deletePhysicalFileAsync(fileRecord.storagePath).catch(console.error);
  }

  /**
   * Elimina permanentemente un archivo del storage
   */
  private async deletePhysicalFileAsync(storagePath: string): Promise<void> {
    try {
      await this.adapter.delete(storagePath);
    } catch (error) {
      console.error(`Failed to delete physical file: ${storagePath}`, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LIST & SEARCH
  // ═══════════════════════════════════════════════════════════

  /**
   * Lista archivos del usuario
   */
  async listFiles(options: ListFilesOptions): Promise<ListFilesResult> {
    const {
      userId,
      folderId,
      usageContext,
      accessLevel,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = options;

    // Construir filtros
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (folderId !== undefined) {
      where.folderId = folderId;
    }

    if (usageContext) {
      where.usageContext = usageContext;
    }

    if (accessLevel) {
      where.accessLevel = accessLevel;
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Obtener archivos
    const [files, total] = await Promise.all([
      prisma.storageFile.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.storageFile.count({ where }),
    ]);

    return {
      files: files.map((f) => this.mapToFileMetadata(f)),
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Obtiene información de un archivo
   */
  async getFileInfo(fileId: string, userId: string): Promise<FileMetadata> {
    const fileRecord = await prisma.storageFile.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord || fileRecord.deletedAt) {
      throw new FileNotFoundError(`File not found: ${fileId}`);
    }

    await this.checkFileAccess(fileRecord, userId, 'view');

    return this.mapToFileMetadata(fileRecord);
  }

  // ═══════════════════════════════════════════════════════════
  // SHARING
  // ═══════════════════════════════════════════════════════════

  /**
   * Crea un link de compartición
   */
  async createShare(options: CreateShareOptions): Promise<ShareLinkResult> {
    const {
      fileId,
      userId,
      shareType = 'LINK',
      password,
      maxDownloads,
      allowDownload = true,
      allowView = true,
      expiresAt,
    } = options;

    // 1. Verificar que el archivo existe y el usuario es el propietario
    const fileRecord = await prisma.storageFile.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord || fileRecord.deletedAt) {
      throw new FileNotFoundError(`File not found: ${fileId}`);
    }

    if (fileRecord.userId !== userId) {
      throw new ForbiddenError('Only file owner can create share links');
    }

    // 2. Generar token único
    const shareToken = generateShareToken();

    // 3. Hashear contraseña si existe
    const hashedPassword = password ? hashPassword(password) : null;

    // 4. Crear registro de compartición
    const share = await prisma.fileShare.create({
      data: {
        fileId,
        sharedBy: userId,
        shareType,
        shareToken,
        password: hashedPassword,
        maxDownloads,
        allowDownload,
        allowView,
        expiresAt,
      },
    });

    // 5. Generar URL de compartición
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/api/storage/share/${shareToken}`;

    // 6. Registrar acción
    await this.logFileAccess(fileId, userId, 'SHARE');

    return {
      share: {
        id: share.id,
        fileId: share.fileId,
        sharedBy: share.sharedBy,
        shareType: share.shareType,
        shareToken: share.shareToken,
        password: share.password,
        maxDownloads: share.maxDownloads,
        downloadCount: share.downloadCount,
        allowDownload: share.allowDownload,
        allowView: share.allowView,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
        lastAccessed: share.lastAccessed,
        revokedAt: share.revokedAt,
      },
      shareUrl,
    };
  }

  /**
   * Accede a un archivo mediante token de compartición
   */
  async accessSharedFile(
    shareToken: string,
    password?: string
  ): Promise<{ file: FileMetadata; canDownload: boolean; canView: boolean }> {
    // 1. Buscar share
    const share = await prisma.fileShare.findUnique({
      where: { shareToken },
      include: { file: true },
    });

    if (!share) {
      throw new FileNotFoundError('Share link not found');
    }

    // 2. Validaciones
    if (share.revokedAt) {
      throw new ForbiddenError('Share link has been revoked');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenError('Share link has expired');
    }

    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      throw new ForbiddenError('Download limit reached');
    }

    if (share.password) {
      if (!password) {
        throw new UnauthorizedError('Password required');
      }
      if (!verifyPassword(password, share.password)) {
        throw new UnauthorizedError('Invalid password');
      }
    }

    if (!share.file || share.file.deletedAt) {
      throw new FileNotFoundError('File not found');
    }

    // 3. Actualizar último acceso
    await prisma.fileShare.update({
      where: { id: share.id },
      data: { lastAccessed: new Date() },
    });

    return {
      file: this.mapToFileMetadata(share.file),
      canDownload: share.allowDownload,
      canView: share.allowView,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // QUOTA MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtiene o crea la cuota de un usuario
   */
  async getOrCreateQuota(userId: string): Promise<QuotaInfo> {
    let quota = await prisma.storageQuota.findUnique({
      where: { userId },
    });

    if (!quota) {
      // Obtener tier del usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      const tier = user?.subscriptionTier || 'FREE';
      const limits = getQuotaLimits(tier);

      quota = await prisma.storageQuota.create({
        data: {
          userId,
          maxStorage: limits.maxStorage,
          maxFileSize: limits.maxFileSize,
          maxFiles: limits.maxFiles,
          subscriptionTier: tier,
        },
      });
    }

    return this.mapToQuotaInfo(quota);
  }

  /**
   * Actualiza la cuota después de una subida
   */
  private async updateQuotaAfterUpload(
    userId: string,
    fileSize: number,
    usageContext: FileUsageContext
  ): Promise<void> {
    const quota = await prisma.storageQuota.findUnique({
      where: { userId },
    });

    if (!quota) return;

    const usageBreakdown = (quota.usageBreakdown as Record<string, number>) || {};
    usageBreakdown[usageContext] = (usageBreakdown[usageContext] || 0) + fileSize;

    await prisma.storageQuota.update({
      where: { userId },
      data: {
        usedStorage: { increment: BigInt(fileSize) },
        fileCount: { increment: 1 },
        usageBreakdown,
        lastCalculated: new Date(),
      },
    });
  }

  /**
   * Actualiza la cuota después de una eliminación
   */
  private async updateQuotaAfterDelete(
    userId: string,
    fileSize: number,
    usageContext: FileUsageContext
  ): Promise<void> {
    const quota = await prisma.storageQuota.findUnique({
      where: { userId },
    });

    if (!quota) return;

    const usageBreakdown = (quota.usageBreakdown as Record<string, number>) || {};
    usageBreakdown[usageContext] = Math.max(0, (usageBreakdown[usageContext] || 0) - fileSize);

    await prisma.storageQuota.update({
      where: { userId },
      data: {
        usedStorage: { decrement: BigInt(fileSize) },
        fileCount: { decrement: 1 },
        usageBreakdown,
        lastCalculated: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════

  /**
   * Verifica si un usuario tiene acceso a un archivo
   */
  private async checkFileAccess(
    file: any,
    userId: string,
    action: 'view' | 'download' | 'delete'
  ): Promise<void> {
    // Propietario siempre tiene acceso
    if (file.userId === userId) {
      return;
    }

    // PRIVATE: solo propietario
    if (file.accessLevel === 'PRIVATE') {
      throw new ForbiddenError('Access denied to private file');
    }

    // INTERNAL: usuarios autenticados
    if (file.accessLevel === 'INTERNAL') {
      // Si llegamos aquí, el usuario está autenticado
      return;
    }

    // PUBLIC: todos pueden ver/descargar
    if (file.accessLevel === 'PUBLIC') {
      if (action === 'delete') {
        throw new ForbiddenError('Only owner can delete public files');
      }
      return;
    }

    // SHARED: verificar share específico
    if (file.accessLevel === 'SHARED') {
      // Implementar lógica de shares específicos por usuario
      throw new ForbiddenError('Access denied to shared file');
    }

    throw new ForbiddenError('Access denied');
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════════════════════

  /**
   * Registra un acceso a archivo
   */
  private async logFileAccess(
    fileId: string,
    userId: string,
    action: FileAction
  ): Promise<void> {
    try {
      await prisma.fileAccessLog.create({
        data: {
          fileId,
          userId,
          action,
        },
      });
    } catch (error) {
      console.error('Failed to log file access:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Genera path de almacenamiento
   */
  private generateStoragePath(
    userId: string,
    usageContext: FileUsageContext,
    filename: string
  ): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `${userId}/${usageContext.toLowerCase()}/${year}/${month}/${filename}`;
  }

  /**
   * Genera thumbnail (placeholder)
   */
  private async generateThumbnailAsync(fileId: string): Promise<void> {
    // TODO: Implementar generación de thumbnails
    console.log(`Generating thumbnail for file ${fileId}`);
  }

  /**
   * Mapea registro de DB a FileMetadata
   */
  private mapToFileMetadata(record: any): FileMetadata {
    return {
      id: record.id,
      filename: record.filename,
      originalName: record.originalName,
      storagePath: record.storagePath,
      storageProvider: record.storageProvider,
      mimeType: record.mimeType,
      size: record.size,
      checksum: record.checksum,
      userId: record.userId,
      folderId: record.folderId,
      accessLevel: record.accessLevel,
      usageContext: record.usageContext,
      encrypted: record.encrypted,
      encryptionKeyId: record.encryptionKeyId,
      isProcessed: record.isProcessed,
      processingStatus: record.processingStatus,
      thumbnailPath: record.thumbnailPath,
      metadata: record.metadata as Record<string, any> | null,
      virusScanStatus: record.virusScanStatus,
      virusScanDate: record.virusScanDate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Mapea registro de DB a QuotaInfo
   */
  private mapToQuotaInfo(record: any): QuotaInfo {
    return {
      id: record.id,
      userId: record.userId,
      maxStorage: record.maxStorage,
      maxFileSize: record.maxFileSize,
      maxFiles: record.maxFiles,
      usedStorage: record.usedStorage,
      fileCount: record.fileCount,
      usageBreakdown: record.usageBreakdown as Record<string, number> | null,
      subscriptionTier: record.subscriptionTier,
      lastCalculated: record.lastCalculated,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════

let storageServiceInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}
