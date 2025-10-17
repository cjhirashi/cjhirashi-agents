# Storage System - Quick Start Guide

**Guía rápida para testing en desarrollo y deployment a producción**

---

## 🚀 INICIO RÁPIDO (5 minutos)

### 1️⃣ Iniciar Desarrollo

```bash
npm run dev
```

Luego abre: `http://localhost:3000`

### 2️⃣ Login

- Click "Login with Google"
- Selecciona tu cuenta
- Autoriza

### 3️⃣ Accede a Storage

```
URL: http://localhost:3000/admin
    → Click Storage
    → (O donde esté montado el Storage)
```

**Notas importantes**:
- ✅ Necesitas ser SUPER_ADMIN, ADMIN, o INVITED_STORAGE
- ❌ Si eres INVITED_AGENT o SUBSCRIBER: acceso denegado

### 4️⃣ Prueba Upload

```
1. Drag & drop un archivo
   (Imagen, PDF, documento < 5 MB)
2. Espera a que suba
3. Verifica que aparece en lista
```

---

## ✅ Testing Completo (30 minutos)

### Lista de Tests

- [ ] **Upload**: Archivo pequeño (< 1 MB)
- [ ] **Download**: Descarga y compara con original
- [ ] **Share**: Crea link compartido y accede sin auth
- [ ] **RBAC**: Test cada rol
  - [ ] ADMIN puede acceder ✅
  - [ ] INVITED_STORAGE puede acceder ✅
  - [ ] INVITED_AGENT no puede acceder ❌
  - [ ] SUBSCRIBER con cuota ✅

### Crear Usuarios de Prueba

```bash
# Terminal
npx prisma studio

# En Prisma Studio:
# 1. Go to User table
# 2. Click "+" para crear
# 3. Set fields:
#    - email: test-admin@example.com
#    - role: ADMIN
# 4. Click "Save"

# Repeat para cada rol:
# - INVITED_STORAGE
# - INVITED_AGENT
# - SUBSCRIBER
```

### Test de RBAC

```
Para cada usuario creado:
1. Login con ese usuario
2. Intenta acceder a Storage
3. Verifica resultado esperado
```

---

## 🌍 Deployment a Producción (1 hora)

### Pre-Requisitos

```bash
# 1. Tener CLI de Vercel
npm i -g vercel

# 2. Login en Vercel
vercel login

# 3. Estar en repo con git remoto
git remote -v
# Debe mostrar origin a tu repo de Vercel
```

### Paso 1: Crear Vercel Blob Storage

```bash
# Opción A: Dashboard (más fácil)
# 1. Ir a: https://vercel.com/dashboard
# 2. Click tu proyecto
# 3. Settings → Storage → Create Blob
# 4. Copiar BLOB_READ_WRITE_TOKEN

# Opción B: CLI
vercel env add BLOB_READ_WRITE_TOKEN
# Pega el token cuando pida
```

### Paso 2: Generar Master Key Segura

```bash
# Este comando genera una key segura de 64 hex chars
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: abc123def456... (copiar todo)
```

### Paso 3: Agregar Variables a Vercel

```bash
# Dashboard → Settings → Environment Variables
# Agregar estas 4:

STORAGE_PROVIDER          VERCEL_BLOB
BLOB_READ_WRITE_TOKEN     <token copiado en Paso 1>
BLOB_STORE_URL            https://<tu-account>.public.blob.vercel-storage.com
STORAGE_MASTER_KEY        <key generada en Paso 2>
```

**Donde encontrar BLOB_STORE_URL:**
- Vercel Dashboard → Storage → Blob → Click el blob
- URL está en la página

### Paso 4: Deploy

```bash
# Build local para verificar
npm run build
# Si sale ✅ sin errores → está bien

# Push a main branch (auto-deploy)
git add .
git commit -m "chore: prepare for production deployment"
git push origin main

# O deploy manual
vercel --prod
```

### Paso 5: Verificar en Producción

```
1. Go to: https://tu-app.vercel.app
2. Login
3. Go to Storage
4. Upload archivo pequeño
5. Download y verifica
6. Resultado: ✅ Funciona
```

---

## 📊 Monitoreo

### Ver Logs

```bash
vercel logs https://tu-app.vercel.app --follow
```

### Ver Storage Files

```
Dashboard → Storage → Blob
- Ver archivos subidos
- Ver tamaño total
- Ver límites
```

### Ver Database

```
Neon Dashboard → Query
SELECT COUNT(*) FROM "File" WHERE "context" = 'OTHER';
```

---

## 🆘 Quick Fixes

| Problema | Solución |
|----------|----------|
| "Storage access denied" | ✅ Verifica tu rol (debe ser ADMIN o INVITED_STORAGE) |
| Upload no funciona | 🔧 Verifica archivo < 5 MB |
| Download falla | 🔧 Verifica el archivo existe en BD |
| Producción: token error | 🔧 Regenera BLOB_READ_WRITE_TOKEN |
| Logs muestran error | 📝 `vercel logs` para ver detalles completos |

---

## 📚 Documentación Completa

Para más detalles, ver: `system-docs/STORAGE-DEPLOYMENT.md`

Incluye:
- Testing detallado
- Troubleshooting avanzado
- Configuración avanzada
- Monitoreo
- Seguridad

---

## ✨ Resumen

```
Desarrollo:    30 min (testing)
Producción:    1 hora (setup + deploy)
Total:         1.5 horas
```

**Estados**:
- ✅ Local: Lista para testing
- ✅ Producción: Lista para deployment
- ✅ RBAC: Completamente funcional
- ✅ Documentación: Completa

---

**¡Listo para empezar!** 🚀

Próximo paso: `npm run dev` y valida Storage localmente.

Luego: Sigue pasos de "Deployment a Producción" para ir a Vercel.
