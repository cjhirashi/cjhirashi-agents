# Storage System - Documentación

Sistema completo de gestión de almacenamiento de archivos con soporte multi-provider, cuotas, encriptación y compartición.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [API Reference](#api-reference)
- [Providers](#providers)
- [Seguridad](#seguridad)
- [Testing](#testing)

## ✨ Características

### Core Features
- ✅ Upload/Download de archivos
- ✅ Multi-provider (Local, Vercel Blob, AWS S3, Cloudflare R2)
- ✅ Sistema de cuotas por usuario
- ✅ Validación de tipos MIME y tamaños
- ✅ Organización en carpetas jerárquicas
- ✅ Soft delete
- ✅ Metadata customizada

### Seguridad
- ✅ Encriptación AES-256-GCM
- ✅ Checksums SHA-256
- ✅ Control de acceso (PRIVATE, INTERNAL, PUBLIC, SHARED)
- ✅ Audit logs de acceso
- ✅ Virus scanning (placeholder)

### Compartición
- ✅ Share links con tokens únicos
- ✅ Protección con contraseña
- ✅ Límite de descargas
- ✅ Expiración temporal
- ✅ Permisos granulares (view/download)

### Optimizaciones
- ✅ Generación de thumbnails (placeholder)
- ✅ Compresión de imágenes (placeholder)
- ✅ Stream processing para archivos grandes

## 🏗️ Arquitectura

```
src/lib/storage/
├── types.ts                  # Interfaces y tipos
├── storage-service.ts        # Servicio principal
├── index.ts                  # Exports públicos
├── adapters/
│   ├── factory.ts            # Factory pattern
│   ├── local-adapter.ts      # Filesystem local
│   └── vercel-blob-adapter.ts # Vercel Blob Storage
└── utils/
    ├── validation.ts         # Validaciones
    └── encryption.ts         # Encriptación
```

### Flujo de datos

```
User Request
    ↓
StorageService (Business Logic)
    ↓
Adapter (Storage Provider)
    ↓
Physical Storage (Local/Vercel/S3/R2)
```

## 📦 Instalación

Las dependencias ya están instaladas:

```bash
npm install @vercel/blob
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` con:

```bash
# ═══════════════════════════════════════════════════════════
# STORAGE SYSTEM CONFIGURATION
# ═══════════════════════════════════════════════════════════

# Storage Provider
# Options: LOCAL | VERCEL_BLOB | AWS_S3 | CLOUDFLARE_R2
STORAGE_PROVIDER=LOCAL

# Encriptación (REQUERIDO para contextos sensibles: HEALTH, FINANCE)
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
STORAGE_MASTER_KEY=your_64_char_hex_key_here

# ─────────────────────────────────────────────────────────────
# LOCAL STORAGE (Desarrollo)
# ─────────────────────────────────────────────────────────────
LOCAL_STORAGE_DIR=./.storage

# ─────────────────────────────────────────────────────────────
# VERCEL BLOB STORAGE (Producción)
# ─────────────────────────────────────────────────────────────
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
BLOB_STORE_URL=https://your-account.public.blob.vercel-storage.com

# ─────────────────────────────────────────────────────────────
# AWS S3 (Futuro)
# ─────────────────────────────────────────────────────────────
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
# AWS_REGION=

# ─────────────────────────────────────────────────────────────
# CLOUDFLARE R2 (Futuro)
# ─────────────────────────────────────────────────────────────
# CLOUDFLARE_ACCOUNT_ID=
# CLOUDFLARE_ACCESS_KEY_ID=
# CLOUDFLARE_SECRET_ACCESS_KEY=
# CLOUDFLARE_R2_BUCKET=

# ─────────────────────────────────────────────────────────────
# APP CONFIGURATION
# ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Generar Master Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Base de datos

Ya ejecutada la migración:

```bash
npx prisma db push
npx prisma generate
```

## 🚀 Uso

### Upload de archivo

```typescript
import { getStorageService } from '@/lib/storage';

const storageService = getStorageService();

// Upload desde File API (browser)
const result = await storageService.upload({
  file: formFile, // File object
  filename: 'avatar.jpg',
  userId: user.id,
  mimeType: 'image/jpeg',
  usageContext: 'AVATAR',
  accessLevel: 'PRIVATE',
  encrypt: false, // Opcional, auto para HEALTH/FINANCE
});

console.log('Uploaded:', result.file.id);
console.log('Public URL:', result.url);
```

### Download de archivo

```typescript
const download = await storageService.download(
  fileId,
  userId
);

// Stream del archivo
const stream = download.stream;
const file = download.file;

// Enviar al cliente
return new Response(stream, {
  headers: {
    'Content-Type': file.mimeType,
    'Content-Disposition': `attachment; filename="${file.originalName}"`,
  },
});
```

### Listar archivos

```typescript
const result = await storageService.listFiles({
  userId: user.id,
  usageContext: 'TICKET',
  limit: 20,
  offset: 0,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  search: 'invoice',
});

console.log(`Found ${result.total} files`);
result.files.forEach(file => {
  console.log(`- ${file.originalName} (${file.size} bytes)`);
});
```

### Crear share link

```typescript
const share = await storageService.createShare({
  fileId: file.id,
  userId: user.id,
  password: 'optional-password',
  maxDownloads: 10,
  allowDownload: true,
  allowView: true,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
});

console.log('Share URL:', share.shareUrl);
console.log('Token:', share.share.shareToken);
```

### Acceder a archivo compartido

```typescript
const { file, canDownload, canView } = await storageService.accessSharedFile(
  shareToken,
  'password-if-required'
);

if (canDownload) {
  // Permitir descarga
}
```

### Verificar cuota

```typescript
const quota = await storageService.getOrCreateQuota(userId);

console.log(`Used: ${quota.usedStorage} / ${quota.maxStorage} bytes`);
console.log(`Files: ${quota.fileCount} / ${quota.maxFiles}`);
console.log(`Usage by context:`, quota.usageBreakdown);
```

## 📚 API Reference

### StorageService

#### `upload(options: UploadOptions): Promise<UploadResult>`

Sube un archivo al almacenamiento.

**Opciones:**
- `file: File | Buffer` - Archivo a subir
- `filename: string` - Nombre del archivo
- `userId: string` - ID del usuario propietario
- `mimeType: string` - Tipo MIME
- `usageContext: FileUsageContext` - Contexto de uso
- `accessLevel?: FileAccessLevel` - Nivel de acceso (default: PRIVATE)
- `folderId?: string` - ID de carpeta contenedora
- `encrypt?: boolean` - Forzar encriptación
- `generateThumbnail?: boolean` - Generar thumbnail (imágenes)
- `expiresAt?: Date` - Fecha de expiración
- `metadata?: Record<string, any>` - Metadata adicional

**Retorna:**
```typescript
{
  file: FileMetadata,
  url?: string // URL pública si el provider lo soporta
}
```

#### `download(fileId: string, userId: string): Promise<DownloadResult>`

Descarga un archivo.

**Retorna:**
```typescript
{
  stream: ReadableStream,
  file: FileMetadata,
  contentType: string,
  contentLength: number
}
```

#### `delete(fileId: string, userId: string): Promise<void>`

Elimina un archivo (soft delete).

#### `listFiles(options: ListFilesOptions): Promise<ListFilesResult>`

Lista archivos del usuario.

**Retorna:**
```typescript
{
  files: FileMetadata[],
  total: number,
  hasMore: boolean
}
```

#### `createShare(options: CreateShareOptions): Promise<ShareLinkResult>`

Crea un link de compartición.

## 🔐 Seguridad

### Encriptación

Archivos en contextos `HEALTH` y `FINANCE` se encriptan automáticamente con AES-256-GCM.

```typescript
// Se encripta automáticamente
await storageService.upload({
  // ...
  usageContext: 'HEALTH', // Auto-encrypt
});

// Forzar encriptación
await storageService.upload({
  // ...
  usageContext: 'AVATAR',
  encrypt: true, // Forzar
});
```

### Niveles de Acceso

- **PRIVATE**: Solo el propietario
- **INTERNAL**: Usuarios autenticados del sistema
- **PUBLIC**: Acceso público con URL
- **SHARED**: Compartido con usuarios específicos

### Audit Logs

Todos los accesos se registran en `FileAccessLog`:

```typescript
{
  fileId: string,
  userId: string,
  action: 'UPLOAD' | 'DOWNLOAD' | 'VIEW' | 'DELETE' | 'SHARE',
  timestamp: Date,
  ipAddress?: string,
  userAgent?: string
}
```

## 🎯 Contextos de Uso

| Contexto | Max Size | MIME Types Permitidos | Encriptación |
|----------|----------|----------------------|--------------|
| THEME | 5 MB | Imágenes | No |
| AVATAR | 2 MB | Imágenes | No |
| TICKET | 10 MB | Imágenes, Docs, Archives | No |
| ARTIFACT | 50 MB | Casi todo | No |
| HEALTH | 20 MB | Imágenes, Docs | **Sí** |
| FINANCE | 20 MB | Imágenes, Docs | **Sí** |
| BACKUP | 1 GB | Archives | No |
| TEMP | 100 MB | Todo | No |
| OTHER | 20 MB | Todo | No |

## 📊 Cuotas por Tier

| Tier | Max Storage | Max File Size | Max Files |
|------|-------------|---------------|-----------|
| FREE | 100 MB | 5 MB | 50 |
| BASIC | 1 GB | 20 MB | 500 |
| PRO | 10 GB | 100 MB | 5,000 |
| ENTERPRISE | 100 GB | 500 MB | 50,000 |
| UNLIMITED | ∞ | ∞ | ∞ |

## 🧪 Testing

### Local Storage (Desarrollo)

```bash
# Usar local storage para desarrollo
STORAGE_PROVIDER=LOCAL
LOCAL_STORAGE_DIR=./.storage
```

Los archivos se guardan en `./.storage/` (agregado a `.gitignore`).

### Limpiar storage local

```typescript
import { LocalStorageAdapter } from '@/lib/storage';

const adapter = new LocalStorageAdapter();
await adapter.clear(); // Elimina todo
```

## 🔌 Providers

### Local (Desarrollo)

```typescript
import { LocalStorageAdapter } from '@/lib/storage';

const adapter = new LocalStorageAdapter('./.storage');
```

**Pros:**
- No requiere configuración externa
- Rápido para desarrollo
- Útil para testing

**Contras:**
- No escalable
- No persistente en deploys
- No URLs públicas

### Vercel Blob (Producción)

```typescript
import { VercelBlobAdapter } from '@/lib/storage';

const adapter = new VercelBlobAdapter(process.env.BLOB_READ_WRITE_TOKEN);
```

**Pros:**
- Integración perfecta con Vercel
- URLs públicas automáticas
- CDN global
- Escalable

**Contras:**
- Requiere cuenta Vercel
- Costos por GB transferido

### AWS S3 (Futuro)

Pendiente de implementación.

### Cloudflare R2 (Futuro)

Pendiente de implementación.

## 🛠️ Utilidades

### Validación

```typescript
import { validateFile, validateMimeType, formatBytes } from '@/lib/storage';

// Validar archivo completo
await validateFile(file, {
  filename: 'doc.pdf',
  mimeType: 'application/pdf',
  usageContext: 'TICKET',
  quota: userQuota,
});

// Validar solo MIME type
const result = validateMimeType('image/png', 'AVATAR');
if (!result.valid) {
  console.error(result.error);
}

// Formatear bytes
console.log(formatBytes(1024)); // "1 KB"
console.log(formatBytes(1048576)); // "1 MB"
```

### Encriptación

```typescript
import { encryptFile, decryptFile, calculateChecksum } from '@/lib/storage';

// Encriptar
const encrypted = encryptFile(buffer);
// { data: Buffer, iv: string, authTag: string, keyId: string }

// Desencriptar
const decrypted = decryptFile(
  encrypted.data,
  encrypted.iv,
  encrypted.authTag
);

// Checksum
const hash = calculateChecksum(buffer);
console.log('SHA-256:', hash);
```

## 📝 TODO

### Fase 2 - Access Control & Security
- [ ] Implementar RBAC completo
- [ ] Sistema de cuotas activo con alerts
- [ ] Rate limiting por usuario
- [ ] Integración de virus scanning (ClamAV)

### Fase 3 - File Processing
- [ ] Optimización de imágenes (Sharp)
- [ ] Generación de thumbnails
- [ ] Extracción de metadata EXIF
- [ ] Compresión automática

### Fase 4 - API Endpoints
- [ ] POST /api/storage/upload
- [ ] GET /api/storage/files
- [ ] GET /api/storage/files/:id
- [ ] GET /api/storage/download/:id
- [ ] DELETE /api/storage/files/:id
- [ ] POST /api/storage/share
- [ ] GET /api/storage/share/:token

### Fase 5 - Advanced Features
- [ ] Versionamiento de archivos
- [ ] Recuperación de archivos eliminados
- [ ] Migración entre providers
- [ ] Deduplicación por checksum
- [ ] Compresión transparente

## 🤝 Contribuir

Este es un sistema interno. Ver `CLAUDE.md` para guías de desarrollo.

## 📄 Licencia

Propiedad de CJHIRASHI Agents.
