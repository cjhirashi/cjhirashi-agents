// ═══════════════════════════════════════════════════════════
// Storage System - Validation Utilities
// ═══════════════════════════════════════════════════════════

import type { FileUsageContext } from '@prisma/client';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  QUOTA_LIMITS,
  InvalidFileError,
  QuotaExceededError,
  type QuotaInfo,
} from '../types';

// ═══════════════════════════════════════════════════════════
// MIME TYPE VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Valida que el MIME type esté permitido para el contexto dado
 */
export function validateMimeType(
  mimeType: string,
  usageContext: FileUsageContext
): { valid: boolean; error?: string } {
  // Validar que el MIME type exista
  if (!mimeType || typeof mimeType !== 'string') {
    return { valid: false, error: 'MIME type is required' };
  }

  // Obtener tipos permitidos según el contexto
  const allowedTypes = getAllowedMimeTypesForContext(usageContext);

  // Verificar si el MIME type está permitido
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed for ${usageContext} context. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Obtiene los MIME types permitidos para un contexto específico
 */
export function getAllowedMimeTypesForContext(
  context: FileUsageContext
): string[] {
  switch (context) {
    case 'THEME':
    case 'AVATAR':
      // Solo imágenes
      return ALLOWED_MIME_TYPES.IMAGE;

    case 'TICKET':
      // Imágenes y documentos
      return [
        ...ALLOWED_MIME_TYPES.IMAGE,
        ...ALLOWED_MIME_TYPES.DOCUMENT,
        ...ALLOWED_MIME_TYPES.ARCHIVE,
      ];

    case 'ARTIFACT':
      // Casi todo excepto ejecutables
      return [
        ...ALLOWED_MIME_TYPES.IMAGE,
        ...ALLOWED_MIME_TYPES.DOCUMENT,
        ...ALLOWED_MIME_TYPES.ARCHIVE,
        ...ALLOWED_MIME_TYPES.VIDEO,
        ...ALLOWED_MIME_TYPES.AUDIO,
      ];

    case 'HEALTH':
    case 'FINANCE':
      // Solo documentos e imágenes (escaneos)
      return [...ALLOWED_MIME_TYPES.IMAGE, ...ALLOWED_MIME_TYPES.DOCUMENT];

    case 'BACKUP':
      // Principalmente archivos comprimidos
      return ALLOWED_MIME_TYPES.ARCHIVE;

    case 'TEMP':
    case 'OTHER':
    default:
      // Permitir todo excepto ejecutables peligrosos
      return [
        ...ALLOWED_MIME_TYPES.IMAGE,
        ...ALLOWED_MIME_TYPES.DOCUMENT,
        ...ALLOWED_MIME_TYPES.ARCHIVE,
        ...ALLOWED_MIME_TYPES.VIDEO,
        ...ALLOWED_MIME_TYPES.AUDIO,
      ];
  }
}

/**
 * Detecta el MIME type desde un Buffer usando magic numbers
 */
export function detectMimeType(buffer: Buffer): string | null {
  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }

  // WEBP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF: 25 50 44 46
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // ZIP: 50 4B 03 04 or 50 4B 05 06
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05)
  ) {
    return 'application/zip';
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// FILE SIZE VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Valida el tamaño del archivo según el contexto
 */
export function validateFileSize(
  size: number,
  usageContext: FileUsageContext
): { valid: boolean; error?: string } {
  const maxSize = MAX_FILE_SIZES[usageContext];

  if (size > maxSize) {
    return {
      valid: false,
      error: `File size ${formatBytes(size)} exceeds maximum allowed ${formatBytes(maxSize)} for ${usageContext} context`,
    };
  }

  if (size <= 0) {
    return { valid: false, error: 'File size must be greater than 0' };
  }

  return { valid: true };
}

/**
 * Formatea bytes a formato legible (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ═══════════════════════════════════════════════════════════
// QUOTA VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Valida si el usuario puede subir un archivo según su cuota
 */
export function validateQuota(
  fileSize: number,
  quota: QuotaInfo
): { valid: boolean; error?: string } {
  // Validar número máximo de archivos
  if (quota.fileCount >= quota.maxFiles) {
    return {
      valid: false,
      error: `Maximum file count reached (${quota.maxFiles} files)`,
    };
  }

  // Validar tamaño máximo por archivo
  if (fileSize > Number(quota.maxFileSize)) {
    return {
      valid: false,
      error: `File size ${formatBytes(fileSize)} exceeds maximum allowed per file ${formatBytes(Number(quota.maxFileSize))}`,
    };
  }

  // Validar almacenamiento total
  const newUsedStorage = Number(quota.usedStorage) + fileSize;
  if (newUsedStorage > Number(quota.maxStorage)) {
    const remaining = Number(quota.maxStorage) - Number(quota.usedStorage);
    return {
      valid: false,
      error: `Not enough storage. Available: ${formatBytes(remaining)}, needed: ${formatBytes(fileSize)}`,
    };
  }

  return { valid: true };
}

/**
 * Obtiene los límites de cuota para un tier de suscripción
 */
export function getQuotaLimits(tier: string): {
  maxStorage: bigint;
  maxFileSize: bigint;
  maxFiles: number;
} {
  const limits =
    QUOTA_LIMITS[tier as keyof typeof QUOTA_LIMITS] || QUOTA_LIMITS.FREE;

  return {
    maxStorage: BigInt(limits.maxStorage),
    maxFileSize: BigInt(limits.maxFileSize),
    maxFiles: limits.maxFiles,
  };
}

/**
 * Calcula el porcentaje de uso de almacenamiento
 */
export function calculateStorageUsagePercentage(quota: QuotaInfo): number {
  const used = Number(quota.usedStorage);
  const max = Number(quota.maxStorage);

  if (max === 0) return 0;
  return Math.round((used / max) * 100);
}

// ═══════════════════════════════════════════════════════════
// FILENAME VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Sanitiza un nombre de archivo
 */
export function sanitizeFilename(filename: string): string {
  // Remover caracteres peligrosos
  let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remover múltiples guiones bajos consecutivos
  sanitized = sanitized.replace(/_+/g, '_');

  // Remover guiones bajos al inicio y final
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // Limitar longitud
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, -(ext.length + 1));
    sanitized = nameWithoutExt.slice(0, 250 - ext.length) + '.' + ext;
  }

  return sanitized || 'unnamed_file';
}

/**
 * Genera un nombre de archivo único
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = getFileExtension(originalName);
  const nameWithoutExt = originalName.slice(0, -(ext.length + 1));

  return `${sanitizeFilename(nameWithoutExt)}_${timestamp}_${random}.${ext}`;
}

/**
 * Obtiene la extensión de un archivo
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Valida que el nombre de archivo sea válido
 */
export function validateFilename(filename: string): {
  valid: boolean;
  error?: string;
} {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: 'Filename cannot be empty' };
  }

  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename too long (max 255 characters)',
    };
  }

  // Caracteres prohibidos en nombres de archivo
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  if (invalidChars.test(filename)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    };
  }

  // Nombres reservados en Windows
  const reserved = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  const nameWithoutExt = filename.split('.')[0];
  if (reserved.test(nameWithoutExt)) {
    return { valid: false, error: 'Filename uses a reserved name' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// PATH VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Valida que una ruta de carpeta sea válida
 */
export function validateFolderPath(path: string): {
  valid: boolean;
  error?: string;
} {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Path is required' };
  }

  // Debe empezar con /
  if (!path.startsWith('/')) {
    return { valid: false, error: 'Path must start with /' };
  }

  // No debe terminar con / (excepto root)
  if (path.length > 1 && path.endsWith('/')) {
    return { valid: false, error: 'Path must not end with /' };
  }

  // Validar cada segmento del path
  const segments = path.split('/').filter(Boolean);
  for (const segment of segments) {
    const segmentValidation = validateFilename(segment);
    if (!segmentValidation.valid) {
      return {
        valid: false,
        error: `Invalid path segment "${segment}": ${segmentValidation.error}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Normaliza una ruta de carpeta
 */
export function normalizePath(path: string): string {
  // Remover espacios
  let normalized = path.trim();

  // Asegurar que empieza con /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Remover / final (excepto root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Remover múltiples / consecutivos
  normalized = normalized.replace(/\/+/g, '/');

  // Remover . y .. para prevenir path traversal
  const segments = normalized
    .split('/')
    .filter((s) => s && s !== '.' && s !== '..');
  normalized = '/' + segments.join('/');

  return normalized || '/';
}

// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE FILE VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Valida un archivo completamente
 */
export async function validateFile(
  file: File | Buffer,
  options: {
    filename: string;
    mimeType: string;
    usageContext: FileUsageContext;
    quota: QuotaInfo;
  }
): Promise<void> {
  const { filename, mimeType, usageContext, quota } = options;

  // 1. Validar nombre de archivo
  const filenameValidation = validateFilename(filename);
  if (!filenameValidation.valid) {
    throw new InvalidFileError(filenameValidation.error);
  }

  // 2. Validar MIME type
  const mimeValidation = validateMimeType(mimeType, usageContext);
  if (!mimeValidation.valid) {
    throw new InvalidFileError(mimeValidation.error);
  }

  // 3. Obtener tamaño del archivo
  const size = file instanceof File ? file.size : file.length;

  // 4. Validar tamaño según contexto
  const sizeValidation = validateFileSize(size, usageContext);
  if (!sizeValidation.valid) {
    throw new InvalidFileError(sizeValidation.error);
  }

  // 5. Validar cuota del usuario
  const quotaValidation = validateQuota(size, quota);
  if (!quotaValidation.valid) {
    throw new QuotaExceededError(quotaValidation.error);
  }

  // 6. Si es Buffer, validar magic numbers (detectar tipo real)
  if (Buffer.isBuffer(file)) {
    const detectedType = detectMimeType(file);
    if (detectedType && detectedType !== mimeType) {
      throw new InvalidFileError(
        `File content type (${detectedType}) does not match declared MIME type (${mimeType})`
      );
    }
  }
}
