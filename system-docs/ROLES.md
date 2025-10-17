# Sistema de Roles y Acceso - CJHIRASHI Agents

**Versión**: 1.0.0
**Última actualización**: 2025-10-16
**Estado**: ✅ Implementado

---

## Descripción General

CJHIRASHI Agents utiliza un **sistema de roles basado en control de acceso** (RBAC - Role Based Access Control) para gestionar diferentes tipos de usuarios con permisos específicos.

**Propósito**: Permitir 3 tipos de usuarios con diferentes necesidades:
1. **Administradores** (SUPER_ADMIN, ADMIN) - Control total del sistema
2. **Usuarios Invitados** (INVITED_AGENT, INVITED_STORAGE) - Acceso limitado por invitación
3. **Usuarios por Suscripción** (SUBSCRIBER) - Acceso según plan contratado

---

## Roles Disponibles

### 1. SUPER_ADMIN
**Descripción**: Control total del sistema. Solo cjhirashi@gmail.com

**Permisos**:
- ✅ Ver y gestionar todos los usuarios
- ✅ Crear y eliminar usuarios
- ✅ Cambiar roles de otros usuarios
- ✅ Ver todas las métricas globales
- ✅ Gestionar tickets de soporte
- ✅ Acceso completo a Storage
- ✅ Ver Storage de otros usuarios
- ✅ Crear agentes
- ✅ Usar todos los agentes
- ✅ Personalización de tema (white-label)
- ✅ Gestión de invitaciones
- ✅ Audit logs completos

**Casos de uso**:
- Administración general del sistema
- Gestión de cuentas de usuarios
- Asignación de roles
- Auditoría y seguridad

---

### 2. ADMIN
**Descripción**: Gestión de usuarios y permisos. Casi todos los privilegios de SUPER_ADMIN.

**Permisos**:
- ✅ Ver y gestionar usuarios (excepto SUPER_ADMIN)
- ✅ Crear usuarios (con limitaciones)
- ✅ Eliminar usuarios (excepto SUPER_ADMIN)
- ⚠️ Cambiar roles (solo a roles inferiores)
- ✅ Ver todas las métricas globales
- ✅ Gestionar tickets de soporte
- ✅ Acceso completo a Storage
- ✅ Ver Storage de otros usuarios
- ✅ Crear agentes
- ✅ Usar todos los agentes
- ✅ Gestión de invitaciones
- ✅ Audit logs

**Restricciones**:
- ❌ No puede cambiar el rol de SUPER_ADMIN
- ❌ No puede personalizar tema (white-label)
- ❌ No puede eliminar otros ADMIN

**Casos de uso**:
- Gestión diaria de usuarios
- Soporte a usuarios
- Gestión de invitaciones
- Monitoreo de uso

---

### 3. INVITED_AGENT
**Descripción**: Usuario invitado con acceso a agentes específicos asignados por admin.

**Permisos**:
- ✅ Usar agentes asignados por admin (acceso restringido)
- ✅ Ver propios datos
- ✅ Crear conversaciones/mensajes en agentes autorizados
- ❌ Ver otros usuarios
- ❌ Crear usuarios
- ❌ Acceso a Storage
- ❌ Ver métricas globales
- ❌ Crear agentes propios
- ❌ Ver agentes públicos (solo autorizados)

**Limitaciones**:
- Acceso solo a agentes que el admin específicamente asignó
- No puede ver o usar otros agentes
- No puede interactuar con Storage
- No puede crear nuevos usuarios o agentes

**Casos de uso**:
- Invitados de clientes para usar agentes específicos
- Colaboradores con acceso limitado
- Usuarios de demostración

---

### 4. INVITED_STORAGE
**Descripción**: Usuario invitado con acceso exclusivo a Storage. Guests del sistema.

**Permisos**:
- ✅ Acceso completo a Storage (upload, download, delete, share)
- ✅ Ver propios archivos
- ✅ Compartir archivos con links
- ✅ Ver cuota de almacenamiento
- ❌ Ver otros usuarios
- ❌ Ver métricas globales
- ❌ Acceso a agentes
- ❌ Ver tickets de soporte
- ❌ Crear usuarios o agentes

**Limitaciones**:
- Acceso exclusivo a Storage
- No puede acceder a ningún agente
- No puede ver información de otros usuarios
- Cuota limitada según tier

**Casos de uso**:
- Guests externos con acceso a almacenamiento
- Colaboradores para compartir archivos
- Proveedores o consultores

---

### 5. SUBSCRIBER
**Descripción**: Usuario que se suscribe a un plan de renta. Acceso normal según tier.

**Permisos**:
- ✅ Usar agentes según su tier
- ✅ Acceso a Storage según cuota de tier
- ✅ Crear agentes propios (según tier)
- ✅ Ver propios datos y métricas
- ✅ Crear conversaciones con agentes
- ⚠️ Permisos limitados según SubscriptionTier
- ❌ Ver otros usuarios
- ❌ Cambiar roles
- ❌ Gestionar otros usuarios

**Tiers de Suscripción**:
- **FREE**: Límites básicos, 1 agente, 100 MB storage
- **BASIC**: Más agentes (5), 1 GB storage
- **PRO**: 20 agentes, 10 GB storage
- **ENTERPRISE**: 100 agentes, 100 GB storage
- **UNLIMITED**: Sin límites

**Casos de uso**:
- Usuarios de pago normales
- Clientes con planes de suscripción
- Usuarios corporativos

---

### 6-9. MANAGER, DEVELOPER, USER, GUEST (Futuro)

Estos roles están reservados para implementación futura. Por ahora, la plataforma se enfoca en los 5 roles anteriores.

---

## Matriz de Permisos

| Acción | SUPER_ADMIN | ADMIN | INVITED_AGENT | INVITED_STORAGE | SUBSCRIBER |
|--------|:---:|:---:|:---:|:---:|:---:|
| **Administración** |
| Ver usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cambiar roles | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Ver métricas globales | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar tickets | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear invitaciones | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Storage** |
| Usar Storage | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| Upload/Download | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| Compartir archivos | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| Ver Storage otros | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Agentes** |
| Crear agentes | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| Usar agentes propios | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Usar agentes públicos | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Ver propios datos | ✅ | ✅ | ✅ | ✅ | ✅ |

**Leyenda:**
- ✅ = Permitido
- ❌ = Denegado
- ⚠️ = Limitado/Condicional

---

## Implementación Técnica

### 1. Definición de Roles (Prisma Schema)

```typescript
// prisma/schema.prisma
enum UserRole {
  // Administración
  SUPER_ADMIN
  ADMIN

  // Usuarios por Invitación
  INVITED_AGENT
  INVITED_STORAGE

  // Usuarios por Suscripción
  SUBSCRIBER

  // Futuro
  MANAGER
  DEVELOPER
  USER
  GUEST
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  role      UserRole @default(USER)
  // ... otros campos
}
```

### 2. NextAuth Configuration

```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  // ...
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Obtener rol del usuario desde BD
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Copiar rol a la sesión
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
}
```

### 3. Type Definitions

```typescript
// src/types/next-auth.d.ts
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
```

### 4. Validación en API Routes

```typescript
// src/lib/storage/middleware.ts
import type { UserRole } from "@prisma/client";

const ALLOWED_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'INVITED_STORAGE'];

export async function checkStorageAccess(): Promise<AccessCheckResult> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return { allowed: false, error: 'Not authenticated' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true },
  });

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return {
      allowed: false,
      error: `Access denied. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
    };
  }

  return { allowed: true, userId: user.id, role: user.role };
}
```

### 5. Frontend Hook

```typescript
// src/hooks/useStorageAccess.ts
import { useSession } from 'next-auth/react';
import type { UserRole } from '@prisma/client';

const ALLOWED_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'INVITED_STORAGE'];

export function useStorageAccess() {
  const { data: session, status } = useSession();

  const canAccessStorage =
    status === 'authenticated' &&
    session?.user?.role &&
    ALLOWED_ROLES.includes(session.user.role as UserRole);

  return {
    canAccessStorage,
    isLoading: status === 'loading',
    userRole: session?.user?.role,
    allowedRoles: ALLOWED_ROLES,
  };
}
```

---

## Flujo de Validación de Roles

### 1. Login
```
Usuario hace login con Google
    ↓
Google OAuth valida
    ↓
NextAuth crea JWT sin rol
    ↓
JWT callback:
  - Busca usuario en BD
  - Lee user.role
  - Agrega role al token
    ↓
Session callback:
  - Copia role del token a session.user
    ↓
Session enviada al cliente
  - Session contiene user.role
```

### 2. Frontend Access Check
```
useStorageAccess() hook
    ↓
Lee session.user.role
    ↓
Compara contra ALLOWED_ROLES
    ↓
✅ Si role está permitido:
   - canAccessStorage = true
   - Muestra Storage UI
    ↓
❌ Si role no está permitido:
   - canAccessStorage = false
   - Muestra access denied message
```

### 3. API Request
```
Cliente hace request a /api/storage/upload
    ↓
NextAuth middleware autentica
    ↓
checkStorageAccess():
  - Obtiene sesión del request
  - Lee user.id
  - Busca usuario en BD
  - Lee user.role
  - Valida contra ALLOWED_ROLES
    ↓
✅ Si role permitido:
   - Continúa con lógica del endpoint
   - Retorna resultado
    ↓
❌ Si role no permitido:
   - Retorna 403 Forbidden
   - Mensaje: "Storage access denied"
```

---

## Cómo Asignar Roles

### Via Script

```bash
# Hacer ADMIN a un usuario
npm run set-admin -- user@example.com

# Hacer SUPER_ADMIN a un usuario (solo para cjhirashi@gmail.com)
npm run set-super-admin -- user@example.com
```

### Via Admin Panel (Futuro)

1. Ir a `/admin/users`
2. Seleccionar usuario
3. Cambiar rol en dropdown
4. Guardar

---

## Limitaciones y Restricciones

### SUPER_ADMIN
- Solo 1 usuario puede tener este rol (cjhirashi@gmail.com)
- No se puede cambiar el rol de SUPER_ADMIN

### ADMIN
- No puede eliminar otro ADMIN
- No puede cambiar rol de SUPER_ADMIN
- No puede cambiar rol de otro ADMIN a SUPER_ADMIN

### INVITED_AGENT
- Roles asignados manualmente por admin
- Permisos específicos por agente
- No puede cambiar su propio rol
- No puede crear agentes

### INVITED_STORAGE
- Acceso exclusivo a Storage
- No puede acceder a agentes
- Cuota limitada
- No puede cambiar su propio rol

### SUBSCRIBER
- Permisos limitados por tier
- Cuota limitada por tier
- Puede crear agentes (según tier)
- No puede cambiar su propio rol

---

## Casos de Uso Comunes

### Caso 1: Admin quiere invitar a un cliente para usar Storage

1. Admin crea usuario con rol `INVITED_STORAGE`
2. Admin comparte link de login con cliente
3. Cliente accede solo a Storage
4. Cliente puede upload/download/share archivos
5. Cliente NO puede acceder a agentes

### Caso 2: Admin quiere dar acceso a un agente específico

1. Admin crea usuario con rol `INVITED_AGENT`
2. Admin asigna permisos al agente específico
3. Usuario puede usar SOLO ese agente
4. Usuario NO puede ver otros agentes
5. Usuario NO puede acceder a Storage

### Caso 3: Cliente se suscribe

1. Cliente entra a plataforma sin rol
2. Cliente elige plan de suscripción
3. Sistema asigna rol `SUBSCRIBER`
4. Rol incluye permisos según tier
5. Cliente puede usar agentes según tier
6. Cliente tiene cuota de Storage según tier

---

## Próximos Pasos

### Corto Plazo
- [x] Definir roles en Prisma ✅
- [x] Implementar NextAuth role propagation ✅
- [x] Validar Storage access ✅
- [ ] Crear usuarios de prueba para cada rol
- [ ] Testear permisos completos

### Mediano Plazo
- [ ] Implementar middleware INVITED_AGENT
- [ ] Integrar SUBSCRIBER con sistema de cuotas
- [ ] Admin UI para cambiar roles
- [ ] Audit logs de cambios de rol

### Largo Plazo
- [ ] Marketplace de roles/permisos
- [ ] Custom roles definidos por SUPER_ADMIN
- [ ] SSO integration
- [ ] MFA por rol

---

## Referencias

- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Enums](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#enum)
- [JWT.io](https://jwt.io)
- [OWASP RBAC](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)

---

**Última actualización**: 2025-10-16
**Versión**: 1.0.0
**Estado**: ✅ Implementado
**Mantenido por**: cjhirashi@gmail.com
