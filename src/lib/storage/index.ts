// ═══════════════════════════════════════════════════════════
// Storage System - Public API
// Punto de entrada principal para el sistema de almacenamiento
// ═══════════════════════════════════════════════════════════

// Core Service
export { StorageService, getStorageService } from './storage-service';

// Middleware
export { checkStorageAccess, getStorageUserIdOrThrow } from './middleware';
export type { AccessCheckResult } from './middleware';

// Types
export type {
  // Core types
  FileMetadata,
  FolderMetadata,
  QuotaInfo,
  ShareInfo,
  // Upload
  UploadOptions,
  UploadResult,
  // List
  ListFilesOptions,
  ListFilesResult,
  // Download
  DownloadResult,
  // Share
  CreateShareOptions,
  ShareLinkResult,
  // Adapter
  StorageAdapter,
  UploadAdapterOptions,
  UploadAdapterResult,
  DownloadAdapterResult,
  FileAdapterMetadata,
} from './types';

// Errors
export {
  StorageError,
  QuotaExceededError,
  FileNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InvalidFileError,
  VirusDetectedError,
} from './types';

// Constants
export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  QUOTA_LIMITS,
} from './types';

// Adapters (nota: Los adapters se deben importar directamente si se necesita, no desde este archivo)
// Ya que LocalStorageAdapter tiene dependencias de node (fs)
// export { LocalStorageAdapter } from './adapters/local-adapter';
// export { VercelBlobAdapter } from './adapters/vercel-blob-adapter';
// export {
//   createStorageAdapter,
//   getStorageAdapter,
//   validateProviderConfig,
//   getAvailableProviders,
//   getCurrentProvider,
// } from './adapters/factory';

// Para uso del adapter factory (server-side only)
// import { createStorageAdapter } from '@/lib/storage/adapters/factory';

// Validation utilities
export {
  validateMimeType,
  validateFileSize,
  validateQuota,
  validateFilename,
  validateFolderPath,
  sanitizeFilename,
  generateUniqueFilename,
  getFileExtension,
  getAllowedMimeTypesForContext,
  getQuotaLimits,
  calculateStorageUsagePercentage,
  formatBytes,
  normalizePath,
} from './utils/validation';

// Encryption utilities
export {
  encryptFile,
  decryptFile,
  encryptMetadata,
  decryptMetadata,
  calculateChecksum,
  verifyChecksum,
  generateShareToken,
  hashPassword,
  verifyPassword,
  isEncryptionEnabled,
  requiresEncryption,
  generateEncryptionKey,
  getMasterKey,
  keyToHex,
  hexToKey,
} from './utils/encryption';
