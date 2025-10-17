# Storage System - Testing & Production Deployment Guide

**Versión**: 1.0.0
**Fecha**: 2025-10-16
**Estado**: 📋 Guía para implementación

---

## Tabla de Contenidos

1. [Desarrollo Local](#desarrollo-local)
2. [Testing en Desarrollo](#testing-en-desarrollo)
3. [Preparación para Producción](#preparación-para-producción)
4. [Configuración de Vercel Blob](#configuración-de-vercel-blob)
5. [Deployment a Producción](#deployment-a-producción)
6. [Validación en Producción](#validación-en-producción)
7. [Troubleshooting](#troubleshooting)

---

## FASE 1: Desarrollo Local

### Requisitos

✅ Ya está implementado:
- [x] Storage System core (`src/lib/storage/`)
- [x] API endpoints (`/api/storage/*`)
- [x] React components (`src/components/storage/`)
- [x] RBAC middleware
- [x] Local adapter (para desarrollo)
- [x] Database schema

**Variables de entorno ya configuradas en `.env.local`:**
```bash
STORAGE_PROVIDER=LOCAL
STORAGE_MASTER_KEY=3f8dade6a3130b70fcdab28ec57748d2b5e5e27b9b7e336d314282a413149b43
LOCAL_STORAGE_DIR=./.storage
```

### Estructura de Directorios

```
.storage/
├── theme/
├── avatar/
├── ticket/
├── artifact/
├── health/
├── finance/
├── backup/
├── temp/
└── other/
```

---

## FASE 2: Testing en Desarrollo

### 2.1 Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Verás output similar a:
```
  ▲ Next.js 15.5.5
  - Local:        http://localhost:3000
  - Environments: .env.local, .env
```

### 2.2 Acceder a la UI de Storage

**URL**: `http://localhost:3000/admin/storage` (o donde esté montado)

**Roles que pueden acceder**:
- ✅ SUPER_ADMIN
- ✅ ADMIN
- ✅ INVITED_STORAGE

**Roles que NO pueden acceder**:
- ❌ INVITED_AGENT
- ❌ SUBSCRIBER
- ❌ USER

### 2.3 Testing de Upload

**Paso 1**: Loguéate con Google OAuth
```
1. Click "Login with Google"
2. Selecciona tu cuenta
3. Autoriza la aplicación
```

**Paso 2**: Verifica tu rol
```
1. Ve a Admin Dashboard
2. Busca tu usuario
3. Verifica que tengas rol SUPER_ADMIN o ADMIN
```

**Paso 3**: Upload de archivo
```
1. Ve a Storage
2. Drag & drop un archivo
   - Archivo de prueba: PDF, Imagen, o Documento
   - Size: < 5 MB
   - Type: Image, PDF, Office doc
3. Observa: Progress bar → Upload success
4. Verifica: Archivo aparece en lista
```

### 2.4 Testing de Download

**Paso 1**: Click en un archivo de la lista
**Paso 2**: Click en "Download"
**Paso 3**: Verifica que el archivo se descarga
**Paso 4**: Compara: Original vs Descargado (deben ser idénticos)

### 2.5 Testing de Share Links

**Paso 1**: Selecciona un archivo
**Paso 2**: Click en "Share"
**Paso 3**: Configure:
- [ ] Password protection (opcional)
- [ ] Download limit (ej: 5 descargas)
- [ ] Expiration (ej: 7 días)
**Paso 4**: Click "Generate Link"
**Paso 5**: Copia el link
**Paso 6**: Abre en otra ventana/navegador sin autenticación
**Paso 7**: Verifica que puedas acceder el archivo

### 2.6 Testing de RBAC

#### Test 1: SUPER_ADMIN/ADMIN puede acceder

```bash
# Usuario: cualquier ADMIN o SUPER_ADMIN
1. Login
2. Go to Storage
3. Resultado: ✅ Storage visible
```

#### Test 2: INVITED_STORAGE puede acceder

```bash
# Usuario: INVITED_STORAGE (necesitas crear uno)
1. Login
2. Go to Storage
3. Resultado: ✅ Storage visible
```

#### Test 3: INVITED_AGENT NO puede acceder

```bash
# Usuario: INVITED_AGENT (necesitas crear uno)
1. Login
2. Go to Storage
3. Resultado: ❌ "Storage access denied"
```

### 2.7 Testing de Cuotas

**Verificar cuota del tier actual**:
```
Storage UI debe mostrar:
- Used: X MB
- Total: Y MB
- Progress bar con porcentaje
```

**Test de límite**:
```
1. Llena storage hasta ~95% de cuota
2. Intenta upload archivo > espacio restante
3. Resultado: ❌ "Quota exceeded" error
```

### 2.8 Testing de Contextos Diferentes

Storage valida MIME types según contexto. Prueba cada uno:

```
THEME:
  ✅ Allowed: .jpg, .png, .gif, .webp
  ❌ Rejected: .pdf, .doc, .mp4

AVATAR:
  ✅ Allowed: .jpg, .png, .gif, .webp
  ❌ Rejected: .pdf, .doc, .zip

HEALTH:
  ✅ Allowed: .jpg, .pdf, .doc
  ✅ Encrypted: AES-256-GCM
  ❌ Rejected: .mp4, .exe

FINANCE:
  ✅ Allowed: .jpg, .pdf, .doc
  ✅ Encrypted: AES-256-GCM
  ❌ Rejected: .mp4, .exe

BACKUP:
  ✅ Allowed: .zip, .tar, .7z, .rar
  ❌ Rejected: .exe
```

### 2.9 Verificar Base de Datos

**Abrir Prisma Studio**:
```bash
npx prisma studio
```

Verifica tablas:
- `File` - Archivos subidos
- `FileAccessLog` - Auditoría de acceso
- `StorageQuota` - Cuotas por usuario

---

## FASE 3: Preparación para Producción

### 3.1 Checklist Pre-Producción

- [ ] ✅ Todos los tests locales pasan
- [ ] ✅ RBAC validado (todos los roles)
- [ ] ✅ Encriptación funcionando (HEALTH/FINANCE)
- [ ] ✅ Cuotas funcionando correctamente
- [ ] ✅ Share links funcionan
- [ ] ✅ Build sin errores: `npm run build`

### 3.2 Crear Vercel Blob Storage

**Opción 1: Desde Vercel Dashboard**

```
1. Go to: https://vercel.com/dashboard
2. Click "Settings"
3. Click "Storage" tab
4. Click "Create Database" → "Blob"
5. Name: "cjhirashi-storage" (o similar)
6. Click "Create"
7. Copy tokens a `.env.production`
```

**Opción 2: Desde CLI**

```bash
vercel env add BLOB_READ_WRITE_TOKEN
# Seguir instrucciones interactivas
```

### 3.3 Obtener Vercel Blob Tokens

**Variables necesarias:**

```bash
BLOB_READ_WRITE_TOKEN=<token aquí>
BLOB_STORE_URL=https://<account>.public.blob.vercel-storage.com
```

**Dónde encontrarlas:**
- Dashboard → Storage → Blob → Copy token

### 3.4 Generar Nueva Master Key para Producción

**⚠️ IMPORTANTE**: No uses la misma key de desarrollo en producción.

```bash
# Generar nueva key de 64 caracteres (hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el output y guárdalo de forma segura.

---

## FASE 4: Configuración de Vercel Blob

### 4.1 Actualizar `.env.production`

```bash
# Vercel dashboard → Settings → Environment Variables
# Agregar estas variables:

STORAGE_PROVIDER=VERCEL_BLOB
BLOB_READ_WRITE_TOKEN=<tu_token_aqui>
BLOB_STORE_URL=https://<account>.public.blob.vercel-storage.com
STORAGE_MASTER_KEY=<nueva_key_hex_64_chars>
```

### 4.2 Verificar Configuración

```bash
# Ver variables en Vercel
vercel env list

# Output debe mostrar:
# STORAGE_PROVIDER        ✓ Production
# BLOB_READ_WRITE_TOKEN   ✓ Production
# BLOB_STORE_URL          ✓ Production
# STORAGE_MASTER_KEY      ✓ Production
```

### 4.3 Deploy a Vercel

```bash
# Option A: Push a main branch (auto-deploy)
git push origin main

# Option B: Deploy manual
vercel --prod

# Esperar a que compile...
# Logs disponibles en: https://vercel.com/dashboard/[project]/logs
```

---

## FASE 5: Validación en Producción

### 5.1 Verificar Deployment

```
1. Go to: https://tu-app.vercel.app
2. Verifica que carga sin errores
3. Check console para warnings
```

### 5.2 Testing en Producción

#### Test 1: Storage Accesible

```
1. Login con Google
2. Go to Storage
3. Resultado: ✅ UI carga correctamente
```

#### Test 2: Upload

```
1. Sube un archivo pequeño (< 1 MB)
2. Verifica progress bar
3. Resultado: ✅ Archivo aparece en lista
4. Comprueba en Vercel dashboard → Storage que el blob existe
```

#### Test 3: Download

```
1. Descarga el archivo subido
2. Compara con original
3. Resultado: ✅ Son idénticos
```

#### Test 4: Compartir

```
1. Generate share link
2. Abre link en incógnito
3. Descarga archivo
4. Resultado: ✅ Funciona sin autenticación
```

#### Test 5: RBAC

```
1. Testing mismo que en desarrollo
2. Crear users con diferentes roles
3. Validar permisos
```

### 5.3 Monitoreo

**Vercel Analytics:**
```
Dashboard → Logs
- Ver requests a /api/storage/*
- Buscar errores 403, 500
- Verificar performance
```

**Database:**
```
Neon Dashboard → Query
- SELECT COUNT(*) FROM "File";
- Verificar archivos están almacenados
```

---

## FASE 6: Configuración Avanzada (Producción)

### 6.1 Habilitar Compresión

Vercel lo maneja automáticamente, pero puedes verificar:

```bash
# En next.config.ts
const nextConfig: NextConfig = {
  compress: true, // Por defecto habilitado
};
```

### 6.2 CDN Cache

Archivos compartidos pueden ser cacheados:

```
// api/storage/download/[id]/route.ts
headers.set('Cache-Control', 'public, max-age=3600'); // 1 hora
```

### 6.3 Rate Limiting

Implementar después, basado en uso real:

```typescript
// Futuro: src/lib/storage/rate-limiter.ts
const MAX_UPLOADS_PER_HOUR = 100;
const MAX_DOWNLOADS_PER_HOUR = 500;
```

---

## FASE 7: Troubleshooting

### Problema: "BLOB_READ_WRITE_TOKEN not found"

**Solución**:
```bash
1. Vercel Dashboard → Settings → Environment Variables
2. Verificar que BLOB_READ_WRITE_TOKEN existe
3. Rebuild: vercel --prod
```

### Problema: "Quota exceeded" en todos los uploads

**Solución**:
```
1. Check en DB que StorageQuota no esté corrupta
2. Reset quota:
   npx prisma studio
   → StorageQuota table
   → Edit el usuario
   → Set usedStorage = 0
3. Rebuild y test
```

### Problema: Upload funciona local, falla en producción

**Causas comunes**:
- [ ] Token expirado
- [ ] Key incorrecta
- [ ] Network timeout
- [ ] File size > limit

**Debug**:
```bash
# Ver logs en Vercel
vercel logs https://tu-app.vercel.app
# Buscar en /api/storage/upload
```

### Problema: Download devuelve 404

**Solución**:
```
1. Verificar fileId es correcto
2. Verificar archivo existe en Vercel Blob
3. Verificar user tiene permisos
4. Check DB: SELECT * FROM "File" WHERE id = '...';
```

---

## Cronograma Recomendado

```
Semana 1:
- Lunes-Martes: Testing local (FASE 2)
- Miércoles: Fix bugs encontrados
- Jueves: Preparación producción (FASE 3)

Semana 2:
- Lunes: Configurar Vercel Blob (FASE 4)
- Martes: Deploy (FASE 5a)
- Miércoles-Jueves: Validación (FASE 5b)
- Viernes: Monitoring y optimizaciones
```

---

## Checklist Final

### Antes de Deploy

- [ ] ✅ Tests locales completos
- [ ] ✅ RBAC validado
- [ ] ✅ Encriptación funciona
- [ ] ✅ Build sin errores
- [ ] ✅ Variables env preparadas
- [ ] ✅ Vercel Blob creado
- [ ] ✅ Master key generada

### Después de Deploy

- [ ] ✅ App carga sin errores
- [ ] ✅ Upload funciona
- [ ] ✅ Download funciona
- [ ] ✅ Share links funcionan
- [ ] ✅ RBAC validado en producción
- [ ] ✅ Logs sin errores
- [ ] ✅ DB sincronizada
- [ ] ✅ Monitoring configurado

---

## Referencia Rápida

### Comandos Útiles

```bash
# Desarrollo
npm run dev                  # Start dev server
npx prisma studio          # Open DB UI
npm run build              # Verify build

# Producción
vercel deploy              # Deploy preview
vercel --prod              # Deploy production
vercel logs [url]          # View logs
vercel env list            # List environment variables
```

### URLs Importantes

```
Local: http://localhost:3000
Staging: https://[branch].vercel.app
Production: https://tu-app.vercel.app
Dashboard: https://vercel.com/dashboard
Blob Storage: https://vercel.com/dashboard/[project]/storage
```

---

**Última actualización**: 2025-10-16
**Mantenido por**: cjhirashi@gmail.com
