# Storage System - Step by Step Testing & Deployment

**Guía paso a paso exacta con comandos y validaciones**

---

## 🟢 PARTE 1: TESTING LOCAL (30-45 minutos)

### PASO 1: Iniciar el servidor de desarrollo

```bash
cd c:\PROYECTOS\AGENTTS AI\cjhirashi-agents
npm run dev
```

**Esperar output similar a:**
```
  ▲ Next.js 15.5.5
  - Local:        http://localhost:3000
  - Environments: .env.local, .env
  ✓ Ready in 2.5s
```

✅ **Validación**: App cargando en `http://localhost:3000`

---

### PASO 2: Login en la aplicación

```
1. Abre: http://localhost:3000
2. Click "Login with Google"
3. Selecciona tu cuenta Google
4. Autoriza permisos
5. Verás dashboard
```

✅ **Validación**: Logueado y en dashboard

---

### PASO 3: Obtener tu ID de usuario

```
Opción A: Desde console del navegador:
1. F12 → Console
2. Pega: console.log(JSON.stringify(JSON.parse(document.cookie.match(/.*\s*next-auth.*session\s*=\s*([^;]*)/)?.[1] || '{}').user), null, 2))
3. Busca tu "id"

Opción B: Directamente desde URL de verificación:
1. Cualquier endpoint debería mostrarte info
2. O verifica en Neon dashboard
```

Copiar tu **user ID** (lo necesitarás después)

---

### PASO 4: Crear usuarios de prueba (si es necesario)

```bash
# Opción A: Prisma Studio (más fácil)
npx prisma studio

# Se abrirá: http://localhost:5555
```

**En Prisma Studio:**

```
1. Click tabla "User"
2. Click "+" para crear nuevo
3. Completa campos:
   Email: test-admin@example.com
   Role: ADMIN
   isActive: true
4. Click "Save"

5. Repite para:
   - Email: test-invited-storage@example.com
     Role: INVITED_STORAGE

   - Email: test-invited-agent@example.com
     Role: INVITED_AGENT

   - Email: test-subscriber@example.com
     Role: SUBSCRIBER
```

✅ **Validación**: 4 usuarios nuevos en DB

---

### PASO 5: Test 1 - Upload de archivo

**Con usuario ADMIN/SUPER_ADMIN:**

```
1. URL: http://localhost:3000/storage
   (o donde esté montado Storage en tu app)

2. Selecciona un archivo para upload:
   - Type: Image (JPG), PDF, o Documento
   - Size: 1-5 MB

3. Drag & drop al área de upload

4. Observa:
   - ✅ Progress bar aparece
   - ✅ "Upload successful" message
   - ✅ Archivo en lista

5. Verifica en Prisma Studio:
   - Tabla "File"
   - Busca tu archivo
   - Estado: "ACTIVE"
```

✅ **Validación**: Archivo en DB y en `.storage/` local

---

### PASO 6: Test 2 - Download de archivo

```
1. En Storage UI, selecciona el archivo subido

2. Click botón "Download"

3. Verifica:
   - ✅ File descarga automáticamente
   - ✅ Nombre correcto
   - ✅ Tamaño igual a original

4. Compara:
   - Original vs Descargado
   - ✅ Contenido idéntico
```

✅ **Validación**: Archivo descargado correctamente

---

### PASO 7: Test 3 - Share Link

```
1. En Storage UI, selecciona archivo

2. Click botón "Share"

3. Configure (opcional):
   - [ ] Password: "test123"
   - [ ] Max downloads: 5
   - [ ] Expires in: 7 days

4. Click "Generate Link"

5. Copia el link compartido
   (Algo como: http://localhost:3000/api/storage/share/token123)

6. Abre en nueva ventana/navegador:
   - Incógnito mode (sin autenticación)
   - Pega el link

7. Verifica:
   - ✅ Puedes ver info del archivo
   - ✅ Si hay password, pide contraseña
   - ✅ Puedes descargar sin estar logueado
```

✅ **Validación**: Share link funciona sin autenticación

---

### PASO 8: Test 4 - RBAC (Role-based access)

**Test 4a: ADMIN puede acceder**

```
1. Login como ADMIN (test-admin@example.com)
2. Navega a Storage
3. Verifica: ✅ Storage cargue sin errores
4. Puedes upload/download
```

**Test 4b: INVITED_STORAGE puede acceder**

```
1. Logout (click tu perfil → Logout)
2. Login como INVITED_STORAGE (test-invited-storage@example.com)
3. Navega a Storage
4. Verifica: ✅ Storage cargue sin errores
5. Puedes upload/download (mismas funciones que ADMIN)
```

**Test 4c: INVITED_AGENT NO puede acceder**

```
1. Logout
2. Login como INVITED_AGENT (test-invited-agent@example.com)
3. Navega a Storage
4. Verifica: ❌ Mensaje "Storage access denied"
5. No aparece Storage UI
```

**Test 4d: SUBSCRIBER con cuota limitada**

```
1. Logout
2. Login como SUBSCRIBER (test-subscriber@example.com)
3. Navega a Storage
4. Verifica: ✅ Storage cargue (según tier)
5. Intenta upload archivo > cuota restante
6. Verifica: ❌ Error "Quota exceeded"
```

✅ **Validación**: Todos los roles se comportan esperado

---

### PASO 9: Test 5 - Encriptación (HEALTH/FINANCE)

```
1. Con usuario ADMIN, upload un archivo como "HEALTH"

2. En `.storage/` revisa el archivo:
   - ✅ Contenido debe estar encriptado (gibberish)
   - ❌ No debe ser legible

3. Download el archivo desde UI:
   - ✅ Download debe estar desencriptado
   - ✅ Debe ser el archivo original
```

✅ **Validación**: Encriptación funcionando

---

### PASO 10: Test 6 - Cuota y límites

```
1. Verifica Storage UI muestra:
   - "Used: X MB"
   - "Total: Y MB"
   - Progress bar %

2. Intenta upload archivo que:
   - Size > cuota restante

3. Verifica: ❌ Error "Quota exceeded"

4. En DB (Prisma Studio):
   - Tabla "StorageQuota"
   - Busca por userId
   - Verifica "usedStorage" está actualizado
```

✅ **Validación**: Cuota funciona

---

## 🟡 Resumen Testing Local

| Test | Status | Validación |
|------|--------|-----------|
| Upload | ✅ | Archivo en DB y filesystem |
| Download | ✅ | Archivo original intacto |
| Share Link | ✅ | Accesible sin auth |
| RBAC (ADMIN) | ✅ | Acceso permitido |
| RBAC (INVITED_STORAGE) | ✅ | Acceso permitido |
| RBAC (INVITED_AGENT) | ❌ | Acceso denegado |
| RBAC (SUBSCRIBER) | ✅ | Acceso con cuota |
| Encriptación | ✅ | HEALTH/FINANCE encriptados |
| Cuota | ✅ | Límites aplicados |

✅ **Si todos los tests pasan → Listo para producción**

---

## 🟠 PARTE 2: DEPLOYMENT A PRODUCCIÓN (1 hora)

### PRE-REQUISITO: Verificar build local

```bash
# En terminal, en la carpeta del proyecto:
npm run build

# Esperar output exitoso:
# ✓ Compiled successfully
# ✓ Static files included
```

✅ **Si build pasa → Continuar**

---

### PASO 11: Ir a Vercel Dashboard

```
1. Abre: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Click "Settings"
4. Click "Storage" en el sidebar
```

---

### PASO 12: Crear Vercel Blob Storage

```
1. Click "Create Database" o "Create Blob"

2. Selecciona "Blob"

3. Configura:
   Name: "cjhirashi-storage" (o similar)
   Region: Selecciona tu región

4. Click "Create"

5. Verás tabla con info:
   - Name: cjhirashi-storage
   - Status: Ready ✅
   - Token: [oculto]
```

✅ **Validación**: Blob storage creado

---

### PASO 13: Copiar Token Vercel Blob

**En Dashboard → Storage → Blob:**

```
1. Click el nombre del blob "cjhirashi-storage"
2. Encontrarás:
   - BLOB_READ_WRITE_TOKEN: [copiable]
   - BLOB_STORE_URL: https://[account].public.blob.vercel-storage.com

3. Copy BLOB_READ_WRITE_TOKEN
   (va a parecer: vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx)

4. Copy BLOB_STORE_URL
   (va a parecer: https://abc123.public.blob.vercel-storage.com)

5. Guardar ambos valores seguros
```

⚠️ **IMPORTANTE**: Guarda estos valores en un lugar seguro (LastPass, 1Password, etc.)

---

### PASO 14: Generar Master Key Segura

**En terminal/PowerShell:**

```bash
# Generar key segura (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Salida será algo como:
# a3f8d2c1e4b9f7a2c8d1e4b9f7a2c8d1e4b9f7a2c8d1e4b9f7a2c8d1e4b9f7

# COPIAR TODO (no incluir el salto de línea)
```

✅ **Validación**: Key de 64 caracteres copiada

---

### PASO 15: Agregar Variables de Entorno

**En Vercel Dashboard → Settings → Environment Variables:**

```
1. Click "Add Environment Variable"

2. Primera variable:
   Name: STORAGE_PROVIDER
   Value: VERCEL_BLOB
   Environment: Production (check)
   Click "Add"

3. Segunda variable:
   Name: BLOB_READ_WRITE_TOKEN
   Value: [Pega el token del PASO 13]
   Environment: Production (check)
   Click "Add"

4. Tercera variable:
   Name: BLOB_STORE_URL
   Value: [Pega la URL del PASO 13]
   Environment: Production (check)
   Click "Add"

5. Cuarta variable:
   Name: STORAGE_MASTER_KEY
   Value: [Pega la key del PASO 14]
   Environment: Production (check)
   Click "Add"
```

✅ **Validación**: 4 variables agregadas

---

### PASO 16: Verificar variables

**En terminal, si tienes Vercel CLI instalado:**

```bash
vercel env list

# Debe mostrar:
# STORAGE_PROVIDER          ✓ Production
# BLOB_READ_WRITE_TOKEN     ✓ Production
# BLOB_STORE_URL            ✓ Production
# STORAGE_MASTER_KEY        ✓ Production
```

O simplemente verifica en el Dashboard que aparezcan las 4 variables

✅ **Validación**: Variables visibles en Dashboard

---

### PASO 17: Deploy a Producción

**Opción A: Auto-deploy (recomendado)**

```bash
# En tu máquina local:
cd c:\PROYECTOS\AGENTTS AI\cjhirashi-agents

# Asegúrate que todo está committedl
git status
# Debe decir: "nothing to commit, working tree clean"

# Push a main branch
git push origin main

# Espera ~5 minutos a que Vercel compile
# Verás en Dashboard: "Building..."
# Luego: "Ready ✅"
```

**Opción B: Deploy manual**

```bash
# Si tienes Vercel CLI
vercel --prod

# Seguir instrucciones interactivas
```

✅ **Validación**: Vercel dashboard muestra "Ready ✅"

---

### PASO 18: Verificar Deployment

**En Dashboard:**

```
1. Click "Deployments" tab
2. Selecciona el más reciente
3. Verifica:
   - Status: "Ready" ✅
   - Logs sin errores rojo
```

**En tu app:**

```
1. URL: https://tu-app.vercel.app
   (Reemplaza con tu URL real)

2. Click Storage
3. Verifica: ✅ Carga sin errores
```

✅ **Validación**: App en producción carga correctamente

---

### PASO 19: Test Upload en Producción

```
1. En app producción: https://tu-app.vercel.app
2. Login
3. Navega a Storage
4. Upload archivo pequeño (1 MB)
5. Verifica:
   - ✅ Upload exitoso
   - ✅ Archivo en lista
   - ✅ En Vercel Storage → Blob: archivo visible
```

✅ **Validación**: Upload funciona en producción

---

### PASO 20: Test Download en Producción

```
1. En Storage, selecciona archivo
2. Click Download
3. Verifica:
   - ✅ Descarga automáticamente
   - ✅ Contenido correcto
```

✅ **Validación**: Download funciona

---

### PASO 21: Test Share Link en Producción

```
1. En Storage, selecciona archivo
2. Click Share
3. Generate link
4. Copy link
5. Abre en otra ventana/navegador (incógnito)
6. Verifica:
   - ✅ Link accesible
   - ✅ Puedes descargar sin autenticación
```

✅ **Validación**: Share links funcionan

---

### PASO 22: Monitoreo

**Ver logs:**

```bash
vercel logs https://tu-app.vercel.app --follow

# Verifica que no hay errores rojo
```

**Ver Storage files:**

```
Dashboard → Storage → Blob
- Ver archivos subidos
- Ver tamaño total
- Ver fecha de creación
```

✅ **Validación**: Archivos guardados en Vercel Blob

---

## 🟢 Resumen Final

```
✅ Testing Local:        Completado (9 tests)
✅ Build verification:   Exitoso
✅ Vercel Blob:         Creado
✅ Env variables:       Configuradas
✅ Deployment:          Exitoso
✅ Production tests:    Todos pasan
✅ Monitoring:          Configurado
```

---

## 📋 Checklist Final

- [ ] ✅ npm run dev funciona
- [ ] ✅ Storage local carga
- [ ] ✅ Upload/Download funciona
- [ ] ✅ Share links funcionan
- [ ] ✅ RBAC validado (todos los roles)
- [ ] ✅ npm run build sin errores
- [ ] ✅ Variables env en Vercel
- [ ] ✅ Deploy a Vercel exitoso
- [ ] ✅ App en producción carga
- [ ] ✅ Storage en producción funciona

**Si todos están marcados ✅ → LISTO PARA PRODUCCIÓN** 🎉

---

## 🆘 Problemas Comunes

| Problema | Solución |
|----------|----------|
| "Storage access denied" | Verifica tu rol (debe ser ADMIN o INVITED_STORAGE) |
| Upload no funciona local | Verifica archivo < 5 MB |
| Vercel: "token not found" | Verifica variable BLOB_READ_WRITE_TOKEN existe |
| Vercel: "Storage URL error" | Verifica variable BLOB_STORE_URL correcta |
| Download falla | Verifica archivo en `.storage/` (local) o en Vercel Blob (prod) |
| Build falla | `npm run build` localmente, fix errores, push again |

---

## 📞 Contacto y Soporte

Si algo falla:
1. Ver logs: `vercel logs [url]`
2. Revisar documentación: `system-docs/STORAGE-DEPLOYMENT.md`
3. Contactar: cjhirashi@gmail.com

---

**¡Listo para comenzar!** 🚀

Próximo paso: Ejecuta `npm run dev` en tu terminal.
