// ═══════════════════════════════════════════════════════════
// Storage System - Adapter Factory
// Selecciona el adapter apropiado según configuración
// ═══════════════════════════════════════════════════════════

import type { StorageProvider } from '@prisma/client';
import type { StorageAdapter } from '../types';
import { StorageError } from '../types';
import { LocalStorageAdapter } from './local-adapter';
import { VercelBlobAdapter } from './vercel-blob-adapter';

// ═══════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════

/**
 * Crea una instancia del adapter apropiado según el provider
 */
export function createStorageAdapter(provider?: StorageProvider): StorageAdapter {
  // Determinar provider desde variable de entorno si no se especifica
  const selectedProvider = provider || getProviderFromEnv();

  switch (selectedProvider) {
    case 'LOCAL':
      return new LocalStorageAdapter();

    case 'VERCEL_BLOB':
      return new VercelBlobAdapter();

    case 'AWS_S3':
      throw new StorageError(
        'AWS S3 adapter not yet implemented',
        'NOT_IMPLEMENTED',
        501
      );

    case 'CLOUDFLARE_R2':
      throw new StorageError(
        'Cloudflare R2 adapter not yet implemented',
        'NOT_IMPLEMENTED',
        501
      );

    default:
      throw new StorageError(
        `Unknown storage provider: ${selectedProvider}`,
        'INVALID_PROVIDER',
        400
      );
  }
}

/**
 * Obtiene el provider desde variables de entorno
 */
function getProviderFromEnv(): StorageProvider {
  const envProvider = process.env.STORAGE_PROVIDER;

  if (!envProvider) {
    // Default a LOCAL en desarrollo, VERCEL_BLOB en producción
    return process.env.NODE_ENV === 'production' ? 'VERCEL_BLOB' : 'LOCAL';
  }

  // Validar que el provider es válido
  const validProviders: StorageProvider[] = [
    'LOCAL',
    'VERCEL_BLOB',
    'AWS_S3',
    'CLOUDFLARE_R2',
  ];

  if (!validProviders.includes(envProvider as StorageProvider)) {
    throw new StorageError(
      `Invalid STORAGE_PROVIDER: ${envProvider}. Valid options: ${validProviders.join(', ')}`,
      'INVALID_PROVIDER',
      400
    );
  }

  return envProvider as StorageProvider;
}

/**
 * Valida que el provider esté configurado correctamente
 */
export function validateProviderConfig(provider: StorageProvider): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  switch (provider) {
    case 'LOCAL':
      // LOCAL no requiere configuración especial
      // Opcionalmente puede tener LOCAL_STORAGE_DIR
      break;

    case 'VERCEL_BLOB':
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        errors.push('BLOB_READ_WRITE_TOKEN environment variable is required');
      }
      break;

    case 'AWS_S3':
      if (!process.env.AWS_ACCESS_KEY_ID) {
        errors.push('AWS_ACCESS_KEY_ID environment variable is required');
      }
      if (!process.env.AWS_SECRET_ACCESS_KEY) {
        errors.push('AWS_SECRET_ACCESS_KEY environment variable is required');
      }
      if (!process.env.AWS_S3_BUCKET) {
        errors.push('AWS_S3_BUCKET environment variable is required');
      }
      if (!process.env.AWS_REGION) {
        errors.push('AWS_REGION environment variable is required');
      }
      break;

    case 'CLOUDFLARE_R2':
      if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
        errors.push('CLOUDFLARE_ACCOUNT_ID environment variable is required');
      }
      if (!process.env.CLOUDFLARE_ACCESS_KEY_ID) {
        errors.push('CLOUDFLARE_ACCESS_KEY_ID environment variable is required');
      }
      if (!process.env.CLOUDFLARE_SECRET_ACCESS_KEY) {
        errors.push('CLOUDFLARE_SECRET_ACCESS_KEY environment variable is required');
      }
      if (!process.env.CLOUDFLARE_R2_BUCKET) {
        errors.push('CLOUDFLARE_R2_BUCKET environment variable is required');
      }
      break;

    default:
      errors.push(`Unknown provider: ${provider}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Obtiene información sobre todos los providers disponibles
 */
export function getAvailableProviders(): Array<{
  provider: StorageProvider;
  name: string;
  description: string;
  implemented: boolean;
  requiresConfig: boolean;
  configValid: boolean;
}> {
  return [
    {
      provider: 'LOCAL',
      name: 'Local File System',
      description: 'Store files on the local file system (development only)',
      implemented: true,
      requiresConfig: false,
      configValid: validateProviderConfig('LOCAL').valid,
    },
    {
      provider: 'VERCEL_BLOB',
      name: 'Vercel Blob Storage',
      description: 'Store files on Vercel Blob Storage (production)',
      implemented: true,
      requiresConfig: true,
      configValid: validateProviderConfig('VERCEL_BLOB').valid,
    },
    {
      provider: 'AWS_S3',
      name: 'Amazon S3',
      description: 'Store files on Amazon S3',
      implemented: false,
      requiresConfig: true,
      configValid: false,
    },
    {
      provider: 'CLOUDFLARE_R2',
      name: 'Cloudflare R2',
      description: 'Store files on Cloudflare R2',
      implemented: false,
      requiresConfig: true,
      configValid: false,
    },
  ];
}

/**
 * Obtiene el provider actualmente configurado
 */
export function getCurrentProvider(): {
  provider: StorageProvider;
  isValid: boolean;
  errors: string[];
} {
  const provider = getProviderFromEnv();
  const validation = validateProviderConfig(provider);

  return {
    provider,
    isValid: validation.valid,
    errors: validation.errors,
  };
}

// ═══════════════════════════════════════════════════════════
// SINGLETON (opcional)
// ═══════════════════════════════════════════════════════════

let adapterInstance: StorageAdapter | null = null;

/**
 * Obtiene una instancia singleton del adapter
 */
export function getStorageAdapter(): StorageAdapter {
  if (!adapterInstance) {
    adapterInstance = createStorageAdapter();
  }
  return adapterInstance;
}

/**
 * Reinicia la instancia singleton (útil para testing)
 */
export function resetStorageAdapter(): void {
  adapterInstance = null;
}
