# Storage System - API Endpoints

Documentación de todos los endpoints REST para el Storage System.

## Base URL

```
/api/storage
```

---

## Endpoints

### 1. Upload File

**Endpoint**: `POST /api/storage/upload`

**Autenticación**: Requerida ✅ (NextAuth session)

**Content-Type**: `multipart/form-data`

**Parámetros**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | File | ✅ | Archivo a subir |
| `usageContext` | FileUsageContext | ✅ | Contexto de uso (THEME, AVATAR, TICKET, ARTIFACT, HEALTH, FINANCE, BACKUP, TEMP, OTHER) |
| `accessLevel` | FileAccessLevel | ❌ | Nivel de acceso (PRIVATE, INTERNAL, PUBLIC, SHARED). Default: PRIVATE |
| `folderId` | string | ❌ | ID de carpeta contenedora |
| `encrypt` | boolean | ❌ | Forzar encriptación. Se auto-encrypta para HEALTH/FINANCE |
| `generateThumbnail` | boolean | ❌ | Generar thumbnail (solo imágenes) |
| `metadata` | JSON string | ❌ | Metadata personalizada |

**Ejemplo de Request**:

```bash
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@avatar.jpg" \
  -F "usageContext=AVATAR" \
  -F "accessLevel=PRIVATE"
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "file": {
      "id": "uuid",
      "filename": "avatar_1729117200000_abc123.jpg",
      "originalName": "avatar.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "usageContext": "AVATAR",
      "accessLevel": "PRIVATE",
      "encrypted": false,
      "createdAt": "2024-10-16T10:00:00Z"
    },
    "url": "https://example.vercel-storage.com/..."
  }
}
```

---

### 2. List Files

**Endpoint**: `GET /api/storage/files`

**Autenticación**: Requerida ✅

**Query Parameters**:

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `folderId` | string | - | Filtrar por carpeta |
| `usageContext` | FileUsageContext | - | Filtrar por contexto |
| `accessLevel` | FileAccessLevel | - | Filtrar por nivel de acceso |
| `limit` | number | 50 | Items por página (max: 100) |
| `offset` | number | 0 | Desplazamiento |
| `sortBy` | string | createdAt | Campo de ordenamiento (createdAt, updatedAt, size, filename) |
| `sortOrder` | string | desc | Orden (asc, desc) |
| `search` | string | - | Búsqueda en filename |

**Ejemplo**:

```bash
curl "http://localhost:3000/api/storage/files?usageContext=AVATAR&limit=10&offset=0"
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid",
        "filename": "avatar.jpg",
        "originalName": "avatar.jpg",
        "size": 1024000,
        "mimeType": "image/jpeg",
        "createdAt": "2024-10-16T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

### 3. Get File Info

**Endpoint**: `GET /api/storage/files/:id`

**Autenticación**: Requerida ✅

**Parámetros**:

| Parámetro | Descripción |
|-----------|-------------|
| `id` | File ID (en la URL) |

**Ejemplo**:

```bash
curl http://localhost:3000/api/storage/files/abc-123-def
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "abc-123-def",
    "filename": "avatar.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg",
    "encrypted": false,
    "usageContext": "AVATAR",
    "createdAt": "2024-10-16T10:00:00Z"
  }
}
```

---

### 4. Download File

**Endpoint**: `GET /api/storage/download/:id`

**Autenticación**: Requerida ✅

**Parámetros**:

| Parámetro | Descripción |
|-----------|-------------|
| `id` | File ID (en la URL) |

**Headers Retornados**:

```
Content-Type: application/json (o el tipo del archivo)
Content-Length: 1024000
Content-Disposition: attachment; filename="avatar.jpg"
```

**Ejemplo**:

```bash
curl http://localhost:3000/api/storage/download/abc-123-def \
  -o downloaded_file.jpg
```

**Response (200 OK)**: Binary stream del archivo

---

### 5. Delete File

**Endpoint**: `DELETE /api/storage/files/:id`

**Autenticación**: Requerida ✅

**Parámetros**:

| Parámetro | Descripción |
|-----------|-------------|
| `id` | File ID (en la URL) |

**Ejemplo**:

```bash
curl -X DELETE http://localhost:3000/api/storage/files/abc-123-def
```

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### 6. Create Share Link

**Endpoint**: `POST /api/storage/share`

**Autenticación**: Requerida ✅

**Content-Type**: `application/json`

**Body**:

```json
{
  "fileId": "abc-123-def",
  "shareType": "LINK",
  "password": "optional-password",
  "maxDownloads": 10,
  "allowDownload": true,
  "allowView": true,
  "expiresAt": "2024-10-23T10:00:00Z"
}
```

**Campos**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `fileId` | string | ✅ | ID del archivo |
| `shareType` | ShareType | ❌ | Tipo de share (LINK, EMAIL, USER). Default: LINK |
| `password` | string | ❌ | Protección con contraseña |
| `maxDownloads` | number | ❌ | Límite de descargas |
| `allowDownload` | boolean | ❌ | Permitir descargar. Default: true |
| `allowView` | boolean | ❌ | Permitir ver. Default: true |
| `expiresAt` | ISO 8601 | ❌ | Fecha de expiración |

**Ejemplo**:

```bash
curl -X POST http://localhost:3000/api/storage/share \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "abc-123-def",
    "password": "secret123",
    "maxDownloads": 5,
    "expiresAt": "2024-10-23T10:00:00Z"
  }'
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "share": {
      "id": "share-uuid",
      "fileId": "abc-123-def",
      "shareToken": "abc123xyz...",
      "maxDownloads": 5,
      "downloadCount": 0,
      "allowDownload": true,
      "allowView": true,
      "expiresAt": "2024-10-23T10:00:00Z",
      "createdAt": "2024-10-16T10:00:00Z"
    },
    "shareUrl": "http://localhost:3000/api/storage/share/abc123xyz..."
  }
}
```

---

### 7. Access Shared File

**Endpoint**: `GET /api/storage/share/:token`

**Autenticación**: ❌ No requerida (el token es el acceso)

**Parámetros**:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `token` | string | Share token (en la URL) |
| `password` | string | Contraseña (query param, si está protegido) |

**Ejemplo**:

```bash
# Sin contraseña
curl http://localhost:3000/api/storage/share/abc123xyz

# Con contraseña
curl "http://localhost:3000/api/storage/share/abc123xyz?password=secret123"
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "file": {
      "id": "abc-123-def",
      "filename": "avatar.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "createdAt": "2024-10-16T10:00:00Z"
    },
    "permissions": {
      "canDownload": true,
      "canView": true
    }
  }
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "File is required"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden (Quota Exceeded)

```json
{
  "error": "Storage quota exceeded"
}
```

### 404 Not Found

```json
{
  "error": "File not found: abc-123-def"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to upload file"
}
```

---

## Status Codes

| Código | Significado |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Validación falla |
| 401 | Unauthorized - Autenticación requerida |
| 403 | Forbidden - Acceso denegado / Cuota excedida |
| 404 | Not Found - Recurso no existe |
| 500 | Internal Server Error - Error del servidor |

---

## Ejemplos de Uso

### Ejemplo 1: Upload y crear share link

```typescript
// 1. Upload archivo
const uploadRes = await fetch('/api/storage/upload', {
  method: 'POST',
  body: formData, // con file, usageContext, etc.
});
const { data: { file } } = await uploadRes.json();

// 2. Crear share link
const shareRes = await fetch('/api/storage/share', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileId: file.id,
    password: 'secret',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }),
});
const { data: { shareUrl } } = await shareRes.json();

// 3. Enviar link
console.log('Compartir este link:', shareUrl);
```

### Ejemplo 2: Acceder a archivo compartido

```typescript
// Acceder sin contraseña
const res = await fetch(`/api/storage/share/abc123xyz`);
const { data: { file, permissions } } = await res.json();

// Si requiere contraseña
const resWithPassword = await fetch(
  `/api/storage/share/abc123xyz?password=secret`
);
```

---

## Notas Importantes

1. **Encriptación Automática**: Los contextos HEALTH y FINANCE se encriptan automáticamente
2. **Cuotas**: Las cuotas se aplican automáticamente según el tier del usuario
3. **Soft Delete**: Los archivos se eliminan de forma blanda (no se borran físicamente)
4. **Access Control**: Los permisos se verifican automáticamente en cada operación
5. **Audit Logs**: Todas las operaciones se registran en la base de datos

---

## Testing Local

### 1. Configurar `.env.local`

```bash
STORAGE_PROVIDER=LOCAL
STORAGE_MASTER_KEY=3f8dade6a3130b70fcdab28ec57748d2b5e5e27b9b7e336d314282a413149b43
LOCAL_STORAGE_DIR=./.storage
```

### 2. Iniciar servidor

```bash
npm run dev
```

### 3. Testear endpoints con curl o Postman

```bash
# Login primero (asumiendo NextAuth está configurado)
# Luego probar endpoints arriba
```

---

## Roadmap Futuro

- [ ] Paginated downloads con resumable
- [ ] Batch operations (upload/delete múltiples)
- [ ] File versioning
- [ ] Advanced search con elasticsearc
- [ ] Rate limiting por usuario
- [ ] Webhook notifications
