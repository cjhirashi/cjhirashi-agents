# Migración: De Modelos a Agentes

## Resumen de Cambios

El sistema de permisos ha sido actualizado para gestionar **agentes** en lugar de modelos de IA genéricos. Ahora los administradores pueden:

- Conceder/revocar acceso a agentes específicos por usuario
- Marcar agentes como públicos (accesibles para todos)
- Ver qué usuario creó cada agente

## Cambios Realizados

### 1. Esquema de Base de Datos (Prisma)

**Modelo `User`:**
- ✅ Agregado campo `role` (ADMIN/USER)
- ✅ Agregado campo `isActive` (activar/desactivar usuarios)
- ✅ Cambiado `modelPermissions` → `agentPermissions`

**Modelo `Agent`:**
- ✅ Cambiado `userId` → `createdBy` (más descriptivo)
- ✅ Agregado `isPublic` (booleano para acceso público)
- ✅ Relación actualizada con permisos

**Nuevos Modelos:**
- ✅ `UserAgentPermission` - Permisos individuales por agente

**Modelos Eliminados:**
- ❌ `AIModel` - Ya no se necesita
- ❌ `UserModelPermission` - Reemplazado por `UserAgentPermission`

### 2. APIs Actualizadas

**`/api/admin/users`** - Sin cambios en funcionalidad
- Ahora retorna `agentPermissions` en lugar de `modelPermissions`

**`/api/admin/agents`** (Nueva API)
- `GET` - Lista todos los agentes del sistema
- `PATCH` - Actualiza visibilidad pública de un agente

**`/api/admin/permissions`**
- Actualizado para trabajar con `agentId` en lugar de `modelId`
- `POST` - Concede acceso a un agente
- `DELETE` - Revoca acceso a un agente

### 3. Interfaz de Administración

**Pestaña "Usuarios":**
- Muestra agentes asignados en lugar de modelos
- Diálogo de permisos lista todos los agentes disponibles

**Pestaña "Agentes"** (Nueva):
- Lista todos los agentes del sistema
- Muestra quién creó cada agente
- Permite marcar agentes como públicos/privados

### 4. Sistema de Permisos

**Niveles de acceso:**
1. **ADMIN** - Acceso a todos los agentes automáticamente
2. **Agentes Públicos** - Accesibles para todos los usuarios activos
3. **Agentes Privados** - Solo accesibles con permiso explícito
4. **Agentes Propios** - El creador siempre tiene acceso

## Instrucciones para Aplicar los Cambios

### Paso 1: Aplicar Migración de Base de Datos

```bash
npx prisma db push
```

**Nota:** Este comando:
- Eliminará las tablas `ai_models` y `user_model_permissions`
- Creará la tabla `user_agent_permissions`
- Actualizará la tabla `agents` con los nuevos campos

⚠️ **IMPORTANTE:** Esto eliminará los datos de los modelos que creaste anteriormente. Los agentes NO se verán afectados.

### Paso 2: Regenerar Cliente de Prisma

```bash
npx prisma generate
```

### Paso 3: Eliminar Script de Modelos (Ya no se necesita)

```bash
rm scripts/seed-models.ts
```

O actualiza tu `package.json` para eliminar el script `seed-models`.

### Paso 4: Reiniciar el Servidor

```bash
npm run dev
```

## Nuevas Funcionalidades

### 1. Agentes Públicos

Como administrador, puedes marcar cualquier agente como "público":
- Ve a `/dashboard/admin`
- Pestaña "Agentes"
- Click en el botón "Público/Privado"

Los agentes públicos son accesibles automáticamente para todos los usuarios activos.

### 2. Permisos Granulares

Para agentes privados, puedes asignar acceso individualmente:
- Ve a `/dashboard/admin`
- Pestaña "Usuarios"
- Click en "Gestionar Permisos"
- Selecciona los agentes específicos

### 3. Verificación de Acceso

El sistema ahora verifica automáticamente el acceso a agentes:
- Admins: Acceso total
- Agentes públicos: Acceso para usuarios activos
- Agentes propios: El creador siempre tiene acceso
- Permisos explícitos: Según lo configurado

## Utilidades Disponibles

### En el Código

```typescript
import { hasAgentAccess, getAccessibleAgents } from "@/lib/auth-utils";

// Verificar si el usuario actual tiene acceso a un agente
const canAccess = await hasAgentAccess(agentId);

// Obtener todos los agentes accesibles para el usuario actual
const agents = await getAccessibleAgents();
```

## Notas Adicionales

- Los errores de TypeScript en `auth-utils.ts` y `permissions/route.ts` son normales hasta que ejecutes `npx prisma generate`
- El archivo `seed-models.ts` ya no es necesario
- Los agentes existentes en tu base de datos seguirán funcionando
- Por defecto, todos los agentes son privados (`isPublic: false`)

## Próximos Pasos Sugeridos

1. Aplicar la migración cuando tengas acceso a la base de datos
2. Probar el panel de administración
3. Marcar algunos agentes como públicos si lo deseas
4. Asignar permisos específicos a usuarios de prueba
