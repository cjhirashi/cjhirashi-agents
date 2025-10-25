// ═══════════════════════════════════════════════════════════
// Storage System - Encryption Utilities
// ═══════════════════════════════════════════════════════════

import crypto from 'crypto';
import { StorageError } from '../types';

// ═══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

// ═══════════════════════════════════════════════════════════
// KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Genera una clave de encriptación a partir de una contraseña
 */
export function deriveKeyFromPassword(
  password: string,
  salt?: Buffer
): { key: Buffer; salt: Buffer } {
  const keySalt = salt || crypto.randomBytes(SALT_LENGTH);

  const key = crypto.pbkdf2Sync(
    password,
    keySalt,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );

  return { key, salt: keySalt };
}

/**
 * Genera una clave de encriptación aleatoria
 */
export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Convierte una clave a formato hex string
 */
export function keyToHex(key: Buffer): string {
  return key.toString('hex');
}

/**
 * Convierte una hex string a clave Buffer
 */
export function hexToKey(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

/**
 * Obtiene la clave maestra desde variables de entorno
 */
export function getMasterKey(): Buffer {
  const masterKeyHex = process.env.STORAGE_MASTER_KEY;

  if (!masterKeyHex) {
    throw new StorageError(
      'STORAGE_MASTER_KEY environment variable not set',
      'ENCRYPTION_ERROR',
      500
    );
  }

  try {
    const key = hexToKey(masterKeyHex);

    if (key.length !== KEY_LENGTH) {
      throw new Error('Invalid key length');
    }

    return key;
  } catch (error) {
    throw new StorageError(
      'Invalid STORAGE_MASTER_KEY format',
      'ENCRYPTION_ERROR',
      500
    );
  }
}

// ═══════════════════════════════════════════════════════════
// FILE ENCRYPTION
// ═══════════════════════════════════════════════════════════

export interface EncryptedData {
  data: Buffer;
  iv: string;
  authTag: string;
  keyId: string;
}

/**
 * Encripta un archivo usando AES-256-GCM
 */
export function encryptFile(
  fileBuffer: Buffer,
  key?: Buffer
): EncryptedData {
  try {
    // Usar clave proporcionada o la clave maestra
    const encryptionKey = key || getMasterKey();

    // Generar IV aleatorio
    const iv = crypto.randomBytes(IV_LENGTH);

    // Crear cipher
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

    // Encriptar
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);

    // Obtener authentication tag
    const authTag = cipher.getAuthTag();

    // Generar keyId (hash del key para identificación)
    const keyId = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest('hex')
      .substring(0, 16);

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyId,
    };
  } catch (error) {
    throw new StorageError(
      'Failed to encrypt file',
      'ENCRYPTION_ERROR',
      500
    );
  }
}

/**
 * Desencripta un archivo usando AES-256-GCM
 */
export function decryptFile(
  encryptedData: Buffer,
  iv: string,
  authTag: string,
  key?: Buffer
): Buffer {
  try {
    // Usar clave proporcionada o la clave maestra
    const decryptionKey = key || getMasterKey();

    // Convertir IV y auth tag de hex a Buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    // Crear decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      decryptionKey,
      ivBuffer
    );

    // Configurar authentication tag
    decipher.setAuthTag(authTagBuffer);

    // Desencriptar
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    throw new StorageError(
      'Failed to decrypt file - invalid key or corrupted data',
      'DECRYPTION_ERROR',
      500
    );
  }
}

// ═══════════════════════════════════════════════════════════
// METADATA ENCRYPTION
// ═══════════════════════════════════════════════════════════

/**
 * Encripta metadata sensible (JSON)
 */
export function encryptMetadata(
  metadata: Record<string, unknown>,
  key?: Buffer
): string {
  try {
    const jsonString = JSON.stringify(metadata);
    const buffer = Buffer.from(jsonString, 'utf8');

    const encrypted = encryptFile(buffer, key);

    // Combinar todo en un formato serializado
    return JSON.stringify({
      data: encrypted.data.toString('base64'),
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyId: encrypted.keyId,
    });
  } catch (error) {
    throw new StorageError(
      'Failed to encrypt metadata',
      'ENCRYPTION_ERROR',
      500
    );
  }
}

/**
 * Desencripta metadata sensible
 */
export function decryptMetadata(
  encryptedString: string,
  key?: Buffer
): Record<string, unknown> {
  try {
    const encrypted = JSON.parse(encryptedString);

    const dataBuffer = Buffer.from(encrypted.data, 'base64');

    const decrypted = decryptFile(
      dataBuffer,
      encrypted.iv,
      encrypted.authTag,
      key
    );

    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    throw new StorageError(
      'Failed to decrypt metadata',
      'DECRYPTION_ERROR',
      500
    );
  }
}

// ═══════════════════════════════════════════════════════════
// CHECKSUM & HASHING
// ═══════════════════════════════════════════════════════════

/**
 * Calcula SHA-256 checksum de un archivo
 */
export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verifica el checksum de un archivo
 */
export function verifyChecksum(buffer: Buffer, expectedChecksum: string): boolean {
  const actualChecksum = calculateChecksum(buffer);
  return actualChecksum === expectedChecksum;
}

/**
 * Genera un token seguro para compartición
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hashea una contraseña para share links
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica una contraseña contra su hash
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return hash === verifyHash;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// STREAM ENCRYPTION (para archivos grandes)
// ═══════════════════════════════════════════════════════════

/**
 * Crea un stream de encriptación
 */
export function createEncryptStream(key?: Buffer): {
  stream: crypto.Cipher;
  iv: string;
  keyId: string;
} {
  const encryptionKey = key || getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  const keyId = crypto
    .createHash('sha256')
    .update(encryptionKey)
    .digest('hex')
    .substring(0, 16);

  return {
    stream: cipher,
    iv: iv.toString('hex'),
    keyId,
  };
}

/**
 * Crea un stream de desencriptación
 */
export function createDecryptStream(
  iv: string,
  authTag: string,
  key?: Buffer
): crypto.Decipher {
  const decryptionKey = key || getMasterKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    decryptionKey,
    ivBuffer
  );

  decipher.setAuthTag(authTagBuffer);

  return decipher;
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Verifica si la encriptación está habilitada en el sistema
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.STORAGE_MASTER_KEY;
}

/**
 * Determina si un contexto requiere encriptación obligatoria
 */
export function requiresEncryption(usageContext: string): boolean {
  const sensitiveContexts = ['HEALTH', 'FINANCE'];
  return sensitiveContexts.includes(usageContext);
}

/**
 * Genera un ID único para una clave de encriptación
 */
export function generateKeyId(): string {
  return crypto.randomBytes(8).toString('hex');
}
