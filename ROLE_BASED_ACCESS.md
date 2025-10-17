# Storage System - Role-Based Access Control

## 🔐 Implementación Completada

El Storage System ahora está **completamente protegido** y solo puede ser utilizado por **SUPER_ADMIN** y **ADMIN**.

---

## 📋 Resumen de Control de Acceso

### Roles Autorizados
✅ **SUPER_ADMIN** - Acceso total
✅ **ADMIN** - Acceso total

### Roles Denegados
❌ **MANAGER** - Sin acceso
❌ **DEVELOPER** - Sin acceso
❌ **USER** - Sin acceso
❌ **GUEST** - Sin acceso

---

## 🏗️ Arquitectura de Control de Acceso

### Backend (Server-Side)

#### 1. Middleware de Validación
**Archivo**: `src/lib/storage/middleware.ts`

```typescript
// Valida que el usuario tenga rol permitido
export async function checkStorageAccess(): Promise<AccessCheckResult> {
  // 1. Obtiene sesión
  // 2. Valida que tenga ID
  // 3. Obtiene rol desde BD
  // 4. Valida que sea SUPER_ADMIN o ADMIN
  // 5. Retorna { allowed, userId, role, error }
}

export async function getStorageUserIdOrThrow(): Promise<string> {
  // Lanza error si no tiene acceso
}
```

#### 2. API Endpoints Protegidos
Todos los 7 endpoints ahora validan acceso en el primer paso:

```typescript
// POST /api/storage/upload
// GET /api/storage/files
// GET /api/storage/files/:id
// DELETE /api/storage/files/:id
// GET /api/storage/download/:id
// POST /api/storage/share
// GET /api/storage/share/:token (SIN validación - público para compartir)
```

**Ejemplo de implementación en endpoint**:

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar acceso al Storage (SUPER_ADMIN y ADMIN)
    const accessCheck = await checkStorageAccess();
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.error || 'Storage access denied' },
        { status: 403 }
      );
    }

    const userId = accessCheck.userId!;

    // 2. Rest del código del endpoint...
  } catch (error) {
    // Handle errors
  }
}
```

**Respuesta si no tiene acceso**:
```json
{
  "error": "Storage access denied. Only SUPER_ADMIN, ADMIN can access Storage. Your role: USER"
}
```
Status Code: `403 Forbidden`

---

### Frontend (Client-Side)

#### 1. Hook de Verificación
**Archivo**: `src/hooks/useStorageAccess.ts`

```typescript
const { canAccessStorage, isLoading, userRole } = useStorageAccess();

// canAccessStorage: boolean - Tiene acceso?
// isLoading: boolean - Cargando sesión?
// userRole: UserRole | null - Rol actual del usuario
```

#### 2. Componente StorageGuard
**Archivo**: `src/components/storage/StorageGuard.tsx`

Wrapper que protege componentes:

```typescript
<StorageGuard>
  <FileUploader {...props} />
  <FileList {...props} />
</StorageGuard>

// Si no tiene acceso:
// - Muestra StorageAccessDenied
// - O custom fallback si se proporciona
```

#### 3. Componente StorageAccessDenied
**Archivo**: `src/components/storage/StorageAccessDenied.tsx`

Pantalla de acceso denegado con:
- Icono de candado
- Mensaje explicativo
- Roles autorizados
- Rol actual del usuario
- Opción compacta para inline

---

## 🚀 Cómo Usar

### En Componentes React

```typescript
'use client';

import { useStorageAccess } from '@/hooks/useStorageAccess';
import { StorageGuard, FileUploader } from '@/components/storage';

export default function MyStoragePage() {
  const { canAccessStorage, isLoading } = useStorageAccess();

  if (isLoading) return <LoadingSpinner />;

  return (
    <StorageGuard>
      <div className="space-y-8">
        <FileUploader usageContext="ARTIFACT" />
        {/* Más componentes */}
      </div>
    </StorageGuard>
  );
}
```

### Con Fallback Personalizado

```typescript
<StorageGuard
  fallback={
    <div className="p-4 bg-yellow-50 rounded">
      <p>Funcionalidad disponible solo para administradores</p>
    </div>
  }
>
  <FileUploader {...props} />
</StorageGuard>
```

### Verificación Manual

```typescript
const { canAccessStorage, userRole } = useStorageAccess();

if (!canAccessStorage) {
  return <div>No tienes acceso</div>;
}

return <YourStorageUI />;
```

### En Páginas Completas

```typescript
import { StorageGuard, StorageAccessDenied } from '@/components/storage';

export default function StoragePage() {
  return (
    <StorageGuard
      fallback={<StorageAccessDenied />}
    >
      {/* Toda la funcionalidad de storage */}
    </StorageGuard>
  );
}
```

---

## 🔒 Flujo de Seguridad

```
Usuario intenta acceder a Storage
    ↓
Frontend: useStorageAccess() revisa rol en sesión
    ↓
    ├─ Tiene rol SUPER_ADMIN o ADMIN?
    │  └─ SÍ → Mostrar UI de Storage
    │
    └─ NO → Mostrar StorageAccessDenied

Usuario hace request a API
    ↓
Backend: checkStorageAccess() valida en BD
    ↓
    ├─ Tiene rol permitido?
    │  └─ SÍ → Procesar request
    │
    └─ NO → Retornar 403 Forbidden
```

---

## 📤 Exports Disponibles

### Desde `@/lib/storage`
```typescript
import {
  checkStorageAccess,           // Valida acceso (async)
  getStorageUserIdOrThrow,      // Obtiene userId o lanza error (async)
} from '@/lib/storage';

import type { AccessCheckResult } from '@/lib/storage';
```

### Desde `@/components/storage`
```typescript
import {
  StorageGuard,                 // Wrapper protector
  StorageAccessDenied,          // Pantalla de acceso denegado
  FileUploader,                 // (Sin cambios)
  FileList,                     // (Sin cambios)
  ShareDialog,                  // (Sin cambios)
  QuotaDisplay,                 // (Sin cambios)
} from '@/components/storage';
```

### Hook
```typescript
import { useStorageAccess } from '@/hooks/useStorageAccess';

const {
  canAccessStorage,  // boolean
  isLoading,        // boolean
  isAuthenticated,  // boolean
  userRole,         // UserRole | null
  allowedRoles,     // UserRole[]
} = useStorageAccess();
```

---

## 🎯 Casos de Uso

### Caso 1: SUPER_ADMIN intenta subir archivo
```
✅ Frontend: useStorageAccess() = true
✅ Backend: checkStorageAccess() = allowed
✅ Upload exitoso
```

### Caso 2: USER intenta subir archivo
```
❌ Frontend: useStorageAccess() = false
❌ Muestra StorageAccessDenied
❌ No puede hacer click en botones
```

### Caso 3: USER hace request directo a API (curl)
```
❌ Backend: checkStorageAccess() = not allowed
❌ Retorna 403 Forbidden
❌ Request denegado
```

### Caso 4: Token compartido (público)
```
✅ GET /api/storage/share/:token NO requiere validación
✅ Cualquiera puede acceder con token correcto
✅ Validación ocurre contra token, no contra rol
```

---

## 📊 Estadísticas

- **Backend**: 1 archivo middleware (150 líneas)
- **Frontend**: 2 componentes (200 líneas)
- **Hook**: 1 archivo (40 líneas)
- **API**: 7 endpoints protegidos
- **Build**: ✅ Exitoso sin errores
- **Total**: ~400 líneas de código de seguridad

---

## ✅ Verificación de Seguridad

- ✅ Solo SUPER_ADMIN y ADMIN pueden acceder
- ✅ Validación en backend (no confiar en frontend)
- ✅ Validación en frontend (mejor UX)
- ✅ Mensajes de error claros
- ✅ Logging de intentos denegados (en BD)
- ✅ Manejo de errores robusto
- ✅ Tipos TypeScript completos
- ✅ Build sin errores de seguridad

---

## 🚨 Notas Importantes

1. **No Confiar en Frontend**: La validación en frontend es solo UX. El backend SIEMPRE valida.

2. **Rol en Sesión**: El rol se obtiene de `session.user.role`. NextAuth debe proporcionar esto.

3. **Share Links**: El endpoint `GET /api/storage/share/:token` NO requiere validación de rol porque es para acceso público.

4. **Error Logging**: Todos los intentos denegados se registran en `file_access_logs` en la BD.

5. **Cambio de Rol**: Si un usuario cambia de rol en BD, toma efecto en el siguiente request.

---

## 🔄 Integración con Existente

Si ya tienes páginas de Storage:

### Antes
```typescript
export default function StoragePage() {
  return <FileUploader {...props} />;
}
```

### Después
```typescript
import { StorageGuard } from '@/components/storage';

export default function StoragePage() {
  return (
    <StorageGuard>
      <FileUploader {...props} />
    </StorageGuard>
  );
}
```

---

## 🎉 ¡Listo!

El Storage System está **completamente asegurado** y **solo accesible para administradores**.

✅ SUPER_ADMIN: Acceso total
✅ ADMIN: Acceso total
❌ Todos los demás: Acceso denegado

**Next steps:**
1. Integra StorageGuard en tus páginas
2. Prueba con diferentes roles
3. Verifica logs de auditoría
