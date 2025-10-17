// ═══════════════════════════════════════════════════════════
// Storage System - TypeScript Types
// ═══════════════════════════════════════════════════════════

import type {
  StorageProvider,
  FileAccessLevel,
  FileUsageContext,
  FileAction,
  ShareType,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  storagePath: string;
  storageProvider: StorageProvider;
  mimeType: string;
  size: bigint;
  checksum: string;
  userId: string;
  folderId?: string | null;
  accessLevel: FileAccessLevel;
  usageContext: FileUsageContext;
  encrypted: boolean;
  encryptionKeyId?: string | null;
  isProcessed: boolean;
  processingStatus?: string | null;
  thumbnailPath?: string | null;
  metadata?: Record<string, any> | null;
  virusScanStatus?: string | null;
  virusScanDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  expiresAt?: Date | null;
}

export interface FolderMetadata {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  path: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaInfo {
  id: string;
  userId: string;
  maxStorage: bigint;
  maxFileSize: bigint;
  maxFiles: number;
  usedStorage: bigint;
  fileCount: number;
  usageBreakdown?: Record<string, number> | null;
  subscriptionTier: string;
  lastCalculated: Date;
}

export interface ShareInfo {
  id: string;
  fileId: string;
  sharedBy: string;
  shareType: ShareType;
  shareToken: string;
  password?: string | null;
  maxDownloads?: number | null;
  downloadCount: number;
  allowDownload: boolean;
  allowView: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  lastAccessed?: Date | null;
  revokedAt?: Date | null;
}

// ═══════════════════════════════════════════════════════════
// UPLOAD OPTIONS
// ═══════════════════════════════════════════════════════════

export interface UploadOptions {
  file: File | Buffer;
  filename: string;
  userId: string;
  mimeType: string;
  usageContext: FileUsageContext;
  accessLevel?: FileAccessLevel;
  folderId?: string;
  encrypt?: boolean;
  generateThumbnail?: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  file: FileMetadata;
  url?: string; // Public URL if applicable
}

// ═══════════════════════════════════════════════════════════
// LIST OPTIONS
// ═══════════════════════════════════════════════════════════

export interface ListFilesOptions {
  userId: string;
  folderId?: string;
  usageContext?: FileUsageContext;
  accessLevel?: FileAccessLevel;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'size' | 'filename';
  sortOrder?: 'asc' | 'desc';
  search?: string; // Search in filename
}

export interface ListFilesResult {
  files: FileMetadata[];
  total: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════
// DOWNLOAD OPTIONS
// ═══════════════════════════════════════════════════════════

export interface DownloadResult {
  stream: ReadableStream | NodeJS.ReadableStream;
  file: FileMetadata;
  contentType: string;
  contentLength: number;
}

// ═══════════════════════════════════════════════════════════
// SHARE OPTIONS
// ═══════════════════════════════════════════════════════════

export interface CreateShareOptions {
  fileId: string;
  userId: string;
  shareType?: ShareType;
  password?: string;
  maxDownloads?: number;
  allowDownload?: boolean;
  allowView?: boolean;
  expiresAt?: Date;
}

export interface ShareLinkResult {
  share: ShareInfo;
  shareUrl: string;
}

// ═══════════════════════════════════════════════════════════
// STORAGE ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════

export interface StorageAdapter {
  /**
   * Upload a file to storage
   */
  upload(
    file: File | Buffer,
    path: string,
    options?: UploadAdapterOptions
  ): Promise<UploadAdapterResult>;

  /**
   * Download a file from storage
   */
  download(path: string): Promise<DownloadAdapterResult>;

  /**
   * Delete a file from storage
   */
  delete(path: string): Promise<void>;

  /**
   * Get file metadata from storage
   */
  getMetadata(path: string): Promise<FileAdapterMetadata>;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get public URL for a file (if applicable)
   */
  getPublicUrl?(path: string): string;

  /**
   * Get signed URL for temporary access
   */
  getSignedUrl?(path: string, expiresIn: number): Promise<string>;
}

export interface UploadAdapterOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface UploadAdapterResult {
  path: string;
  size: number;
  checksum?: string;
  url?: string;
}

export interface DownloadAdapterResult {
  stream: ReadableStream | NodeJS.ReadableStream;
  contentType: string;
  contentLength: number;
  lastModified?: Date;
}

export interface FileAdapterMetadata {
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
}

// ═══════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════

export class StorageError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message);
    this.name = 'StorageError';
  }
}

export class QuotaExceededError extends StorageError {
  constructor(message: string = 'Storage quota exceeded') {
    super(message, 'QUOTA_EXCEEDED', 403);
    this.name = 'QuotaExceededError';
  }
}

export class FileNotFoundError extends StorageError {
  constructor(message: string = 'File not found') {
    super(message, 'FILE_NOT_FOUND', 404);
    this.name = 'FileNotFoundError';
  }
}

export class UnauthorizedError extends StorageError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends StorageError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class InvalidFileError extends StorageError {
  constructor(message: string = 'Invalid file') {
    super(message, 'INVALID_FILE', 400);
    this.name = 'InvalidFileError';
  }
}

export class VirusDetectedError extends StorageError {
  constructor(message: string = 'Virus detected in file') {
    super(message, 'VIRUS_DETECTED', 400);
    this.name = 'VirusDetectedError';
  }
}

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

export const ALLOWED_MIME_TYPES = {
  // Images
  IMAGE: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  // Documents
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  // Archives
  ARCHIVE: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  // Videos
  VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
  // Audio
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
} as const;

export const MAX_FILE_SIZES = {
  // By usage context (in bytes)
  THEME: 5 * 1024 * 1024, // 5MB (logos, favicons)
  AVATAR: 2 * 1024 * 1024, // 2MB
  TICKET: 10 * 1024 * 1024, // 10MB
  ARTIFACT: 50 * 1024 * 1024, // 50MB
  HEALTH: 20 * 1024 * 1024, // 20MB
  FINANCE: 20 * 1024 * 1024, // 20MB
  BACKUP: 1024 * 1024 * 1024, // 1GB
  TEMP: 100 * 1024 * 1024, // 100MB
  OTHER: 20 * 1024 * 1024, // 20MB
} as const;

export const QUOTA_LIMITS = {
  // By subscription tier (in bytes)
  FREE: {
    maxStorage: 100 * 1024 * 1024, // 100MB
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 50,
  },
  BASIC: {
    maxStorage: 1024 * 1024 * 1024, // 1GB
    maxFileSize: 20 * 1024 * 1024, // 20MB
    maxFiles: 500,
  },
  PRO: {
    maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 5000,
  },
  ENTERPRISE: {
    maxStorage: 100 * 1024 * 1024 * 1024, // 100GB
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxFiles: 50000,
  },
  CUSTOM: {
    maxStorage: Number.MAX_SAFE_INTEGER,
    maxFileSize: Number.MAX_SAFE_INTEGER,
    maxFiles: Number.MAX_SAFE_INTEGER,
  },
  UNLIMITED: {
    maxStorage: Number.MAX_SAFE_INTEGER,
    maxFileSize: Number.MAX_SAFE_INTEGER,
    maxFiles: Number.MAX_SAFE_INTEGER,
  },
} as const;
