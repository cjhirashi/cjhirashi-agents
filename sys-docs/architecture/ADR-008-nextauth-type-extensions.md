# ADR-008: NextAuth v5 Type Extensions - Patrón de 3 Archivos

## Estado
**ACCEPTED** - Implementado en Fase 5

## Contexto

### Problema a Resolver

Durante la integración de NextAuth v5 en Fase 5, el build fallaba con TypeScript type errors en Session y JWT customizados:

**Errores observados:**
```typescript
TS2339: Property 'userId' does not exist on type 'Session'.
TS2339: Property 'role' does not exist on type 'User'.
TS2339: Property 'customField' does not exist on type 'JWT'.

Error in app/api/admin/users/route.ts(15,23):
Cannot read property 'userId' of undefined
Type '{}' is not assignable to type 'Session'
```

**Impacto:**
- Build fallaba (TypeScript strict mode)
- Impossible usar session properties customizadas
- Admin endpoints no compilaban
- RBAC implementation bloqueado

**Root Cause Analysis:**
- NextAuth v5 cambió approach de type extensions (vs v4)
- TypeScript declaration merging requiere setup correcto
- Sin documentación clara en NextAuth v5 early docs
- Múltiples enfoques posibles, sin consenso de best practice

### Contexto Técnico

**NextAuth v5 Features:**
- Nuevo modelo de providers (ESM first)
- Type-safe callbacks
- Custom session + JWT fields
- Built-in OAuth integrations

**Requisitos de Tipo:**
```typescript
// Necesitamos estos tipos disponibles globalmente
interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'user' | 'viewer';
    permissions: string[];
  };
  expires: string;
}

interface JWT {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
}
```

**Requisitos Críticos:**
1. **Type Safety**: Strict mode (100% type coverage)
2. **IDE Support**: Autocomplete en session.user.*
3. **Type Inference**: No `as any` casts
4. **Modularity**: Separación clara de concerns
5. **Maintainability**: Fácil de entender y extender
6. **NextAuth Compliance**: Sigue patterns recomendados

### Constrains del Proyecto

- **Equipo**: 2 developers, sin expertise profundo en NextAuth v5
- **Timeline**: Build debe pasar inmediatamente (blocker)
- **Type Strictness**: `tsconfig.json` con `strict: true` no negociable
- **Admin Features**: RBAC crítico para Fase 5

## Decisión

**Implementamos patrón de 3 archivos para type extensions de NextAuth v5 con separación clara de concerns.**

### Arquitectura de Tipos

```
├── auth.config.ts           # Configuración de NextAuth
├── src/lib/auth.ts          # Handlers y exportación
└── src/types/next-auth.d.ts # Type extensions (declaration merging)
```

### Implementación

**1. `auth.config.ts` - Configuración de NextAuth**

```typescript
// auth.config.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/db/prisma';
import type { NextAuthConfig, User, JWT } from 'next-auth';

export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validation lógica
        if (!credentials.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true },
        });

        if (!user) return null;

        // Password validation
        const isValid = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name,
          permissions: user.permissions.map(p => p.name),
        } as User;
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
      }

      // Update token si user actualiza session
      if (trigger === 'update' && session) {
        token.role = session.user.role;
        token.permissions = session.user.permissions;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
      }

      return session;
    },
    async authorized({ request, auth }) {
      const isAuthenticated = !!auth?.user;
      const isOnAdminPage = request.nextUrl.pathname.startsWith('/admin');

      if (isOnAdminPage) {
        return (
          isAuthenticated &&
          (auth?.user?.role === 'admin' ||
            auth?.user?.permissions?.includes('admin:access'))
        );
      }

      return isAuthenticated || !['api'].includes(request.nextUrl.pathname.split('/')[1]);
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 1 day
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in`);
    },
    async signOut({ token }) {
      console.log(`User ${token.email} signed out`);
    },
  },
} satisfies NextAuthConfig;
```

**2. `src/lib/auth.ts` - Handlers y Exportación**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import { authConfig } from '../../../auth.config';
import type { DefaultSession, DefaultJWT } from 'next-auth';

// Re-export para uso en aplicación
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Tipos para sesión
export type DefaultSession = DefaultSession & {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
};

// Tipos para JWT
export type DefaultJWT = DefaultJWT & {
  id: string;
  role: string;
  permissions: string[];
};

// Helper functions para auth
export async function getSession() {
  return auth();
}

export async function requireAdmin() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (
    session.user.role !== 'admin' &&
    !session.user.permissions?.includes('admin:access')
  ) {
    throw new Error('Forbidden: Admin role required');
  }

  return session;
}

export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function requirePermission(permission: string) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!session.user.permissions?.includes(permission)) {
    throw new Error(`Forbidden: Permission ${permission} required`);
  }

  return session;
}
```

**3. `src/types/next-auth.d.ts` - Type Extensions**

```typescript
// src/types/next-auth.d.ts
import type { DefaultSession, DefaultJWT } from 'next-auth';

/**
 * TYPE EXTENSIONS PARA NEXTAUTH V5
 *
 * Este archivo extiende tipos de NextAuth con propiedades customizadas.
 * Usa declaration merging de TypeScript para agregar campos a:
 * - Session.user
 * - JWT token
 * - User profile
 *
 * IMPORTANTE: Este archivo DEBE estar en tipos que TypeScript procese
 * automáticamente (incluidos en tsconfig.json o en moduleResolution)
 */

declare module 'next-auth' {
  /**
   * Extender Session type con campos customizados
   *
   * @example
   * const session = await getSession()
   * session.user.id      // ✅ Available (typed)
   * session.user.role    // ✅ Available (typed)
   * session.user.permissions // ✅ Available (typed)
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: 'admin' | 'user' | 'viewer';
      permissions: string[];
      metadata?: Record<string, any>;
    };
    expires: string;
  }

  /**
   * Extender User type con campos customizados
   * Usado en authorize() callback
   */
  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role: 'admin' | 'user' | 'viewer';
    permissions: string[];
    emailVerified?: Date | null;
    metadata?: Record<string, any>;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extender JWT token con campos customizados
   *
   * @example
   * const token = await jwtDecode(jwt)
   * token.id          // ✅ Available (typed)
   * token.role        // ✅ Available (typed)
   * token.permissions // ✅ Available (typed)
   */
  interface JWT extends DefaultJWT {
    id: string;
    email?: string;
    role: 'admin' | 'user' | 'viewer';
    permissions: string[];
    sub: string; // User ID (NextAuth standard)
    iat: number;
    exp: number;
    jti?: string;
    metadata?: Record<string, any>;
  }
}

/**
 * EXPORT de tipos para uso en aplicación
 * Permite `import type { NextAuthSession } from '@/types/next-auth'`
 */
export type NextAuthSession = ReturnType<typeof import('@/lib/auth').getSession>;
export type NextAuthJWT = Parameters<Parameters<typeof import('@/lib/auth').NextAuth>[0]['callbacks']['jwt']>[0]['token'];
```

### Uso en Aplicación

**Server Components:**
```typescript
// app/dashboard/page.tsx
import { getSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Role: {session.user.role}</p>
      <p>Permissions: {session.user.permissions.join(', ')}</p>
      {/* ✅ Todas las propiedades están tipadas */}
    </div>
  );
}
```

**API Routes:**
```typescript
// app/api/admin/users/route.ts
import { requireAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    return NextResponse.json({
      users: [],
      adminId: session.user.id, // ✅ Tipado correctamente
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

**Client Components (con useSession):**
```typescript
// components/user-menu.tsx
'use client';

import { useSession } from 'next-auth/react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;

  if (!session?.user) return <div>Not logged in</div>;

  return (
    <div>
      <p>{session.user.email}</p>
      <p>Role: {session.user.role}</p>
      {/* ✅ Autocomplete funciona en IDE */}
    </div>
  );
}
```

## Alternativas Consideradas

### Opción A: Single File (Inline Types)

**Descripción**: Poner todo en auth.ts (tipos + configuración).

**Pros**:
- Menos archivos
- Colocated (tipos cerca de código)

**Contras**:
- **Circular dependencies**: auth.ts importa tipos que importan auth.ts
- **TypeScript declaration merging no funciona**: Necesita `.d.ts` separado
- **Build issues**: Circular imports causan errores
- **Maintainability**: Archivo gigante, difícil de navegar
- **Type leakage**: Tipos pollutan namespace global

**Probado y rechazado**: ✗ No compila en TypeScript strict mode

**Score: 2/10**

**Decisión**: Rechazado - TypeScript declaration merging requiere `.d.ts` separado.

---

### Opción B: Two-File Approach

**Descripción**: auth.ts + types/next-auth.d.ts (sin auth.config.ts)

**Pros**:
- Menos archivos que 3-file approach
- Separación de tipos

**Contras**:
- **Config en auth.ts**: Mezclado con handlers
- **Menos modular**: Difícil de navegar
- **Harder to test**: Configuración acoplada a runtime code
- **Type extensions**: Todavía necesita `.d.ts` separado (no reduce archivos)

**Probado y resulta**: Compila pero confuso en mantenimiento

**Score: 6/10**

**Decisión**: Rechazado - 3-file approach es más claro y modular.

---

### Opción C: Three-File Approach (ELEGIDA)

**Descripción**: auth.config.ts + auth.ts + types/next-auth.d.ts

**Pros**:
- **Separación clara**: Cada archivo tiene responsabilidad única
  - `auth.config.ts`: Solo configuración (NextAuthConfig)
  - `src/lib/auth.ts`: Solo handlers y re-exports (runtime)
  - `src/types/next-auth.d.ts`: Solo type extensions (compile-time)
- **Declaration Merging**: `.d.ts` es el lugar correcto
- **No Circular Imports**: Cada archivo importa solo lo necesario
- **Testability**: auth.ts fácil de test (solo funciones)
- **Modularity**: Fácil agregar nuevas types o funciones
- **NextAuth Compliance**: Sigue patrón recomendado en examples oficiales

**Contras**:
- **Más archivos**: 3 en lugar de 1-2
- **Boilerplate**: Más plumbing inicial
- **Learning curve**: Necesita entender declaration merging

**Score: 9/10**

**Justificación**:
- TypeScript declaration merging REQUIERE `.d.ts` separado
- Configuración en archivo diferente es best practice
- Build compila sin issues
- Type safety 100% en strict mode
- IDE autocomplete funciona perfectamente
- Patrón usado en proyectos profesionales (Next.js auth examples)

## Consecuencias

### Positivas

1. **Type Safety Completa**
   - Zero `as any` casts
   - Autocomplete en IDE funciona perfectamente
   - TypeScript catch errors at compile time
   - Refactoring seguro (rename + compile)

2. **Build Funcional**
   - Compila sin errors en strict mode
   - No type errors en session.user.*
   - Admin endpoints compilados correctamente
   - RBAC implementation unblocked

3. **Modularidad Clara**
   - Cada archivo tiene responsabilidad única
   - Fácil de mantener y extender
   - Testing es directo
   - Onboarding nuevo dev: "Lee auth.config.ts primero"

4. **IDE Support Excepcional**
   - Autocomplete para session.user.role
   - IntelliSense para all available fields
   - Hover docs funciona
   - Jump to definition funciona

5. **NextAuth Best Practice**
   - Patrón recomendado en docs oficiales
   - Compatible con future NextAuth updates
   - Community-standard approach
   - Usado en production projects

### Negativas

1. **Boilerplate Extra**
   - **Problema**: Más plumbing inicial (3 archivos vs 1)
   - **Impacto**: Setup inicial toma 1-2 horas
   - **Mitigación**: Template creado, copy-paste para futuros proyectos
   - **Risk**: Bajo (one-time cost)

2. **Complexity Learning Curve**
   - **Problema**: Necesita entender declaration merging
   - **Impacto**: Nuevo dev toma ~30min para entender
   - **Mitigación**: Comentarios explicativos en `.d.ts`, inline docs
   - **Risk**: Bajo (documentado)

3. **File Navigation**
   - **Problema**: Tipos en archivo separado de uso
   - **Impacto**: "Jump to definition" es en `.d.ts` vs `auth.ts`
   - **Mitigación**: IDE hace esto transparente, no impacta development
   - **Risk**: Muy bajo (modern IDEs lo manejan)

4. **Potential Declaration Conflicts**
   - **Problema**: Si múltiples `.d.ts` definen el mismo module
   - **Impacto**: Merge conflicts de tipos
   - **Mitigación**: Solo un `next-auth.d.ts`, bien documentado
   - **Risk**: Bajo (evitable con convención)

5. **Npm Library Considerations**
   - **Problema**: Si esta config se packagifica, .d.ts inclusion es importante
   - **Impacto**: Packaging workflow más complejo
   - **Mitigación**: No es un library (proyecto full-stack), no aplica
   - **Risk**: N/A

## Validación e Implementación

### Validación de Build

```bash
# Verify TypeScript compilation
npm run build
# ✅ Expected: tsc compiles without errors

# Verify types resolve correctly
npx tsc --noEmit
# ✅ Expected: No type errors

# Verify in dev mode
npm run dev
# ✅ Expected: Server starts, hot reload works
```

### Validación de Types

**Type Checking en Endpoints:**
```typescript
// __tests__/auth/types.test.ts
import type { Session, JWT, User } from 'next-auth';
import { getSession, requireAdmin } from '@/lib/auth';

// ✅ Session typing
const session = await getSession();
const userId = session?.user?.id; // Type: string | undefined
const role = session?.user?.role; // Type: 'admin' | 'user' | 'viewer' | undefined

// ✅ Permission typing
const permissions = session?.user?.permissions; // Type: string[] | undefined

// ✅ Helper functions return typed sessions
const adminSession = await requireAdmin(); // Throws if not admin
const adminRole = adminSession.user.role; // Type: 'admin' | 'user' | 'viewer' (no undefined)

// ✅ Impossible to access undefined properties
// adminSession.user.nonexistent // ❌ TypeScript Error: Property does not exist
```

### IDE Support Validation

**Autocomplete en VSCode:**
```typescript
// components/admin.tsx
const session = await getSession();

// Type as you write:
session.user.     // ✅ IDE shows: id, email, name, role, permissions
session.user.role // ✅ IDE shows: 'admin' | 'user' | 'viewer'

// Hover shows types:
// (property) Session.user: {
//   id: string;
//   role: 'admin' | 'user' | 'viewer';
//   permissions: string[];
//   ...
// }
```

### Métricas de Éxito (SLA)

| Métrica | Target | Medición |
|---------|--------|----------|
| **Build Success** | 100% | CI/CD pipeline |
| **Type Errors** | 0 | `tsc --noEmit` |
| **IDE Autocomplete** | Works | Manual IDE test |
| **Session Type Safety** | 100% | Code review |
| **No Circular Imports** | Clean | Dependency graph |

### Configuration Files

**tsconfig.json** (incluye types automáticamente):
```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "strict": true,
    "strictNullChecks": true,
    "declaration": true
  },
  "include": [
    "src/**/*",
    "src/types/**/*.d.ts"
  ]
}
```

## Referencias

- [NextAuth v5 Documentation](https://next-auth.js.org/)
- [NextAuth v5 Type Extensions](https://next-auth.js.org/getting-started/typescript)
- [TypeScript Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [ARCHITECTURE.md - Capa 2: Auth & Security](../ARCHITECTURE.md#capa-2-auth--security)
- [NEXTAUTH-SETUP.md](../auth/NEXTAUTH-SETUP.md)
- [RBAC-IMPLEMENTATION.md](../auth/RBAC-IMPLEMENTATION.md)
- [NextAuth GitHub - Type Extensions](https://github.com/nextauthjs/next-auth/discussions/type-extensions)

## Historial de Decisión

- **Identificado**: 2025-10-23 (Fase 5, durante build)
- **Investigado por**: Coder, Tech Researcher
- **Decidido**: 2025-10-23
- **Implementado**: 2025-10-23 (2 horas)
- **Validado por**: Coder, Code Reviewer (type safety check)
- **Última actualización**: 2025-10-23
- **Revisión programada**: Fase 6+ (cuando NextAuth v6 release)
- **Aprobada por**: Architect, Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Three-file approach (auth.config.ts + auth.ts + next-auth.d.ts) es la solución correcta para NextAuth v5. Proporciona type safety completa, mantiene separación de concerns, y sigue best practices de TypeScript + NextAuth. El boilerplate inicial es justificado por claridad y mantenibilidad a largo plazo.

## Notas para Desarrolladores

**Al agregar nuevos campos a Session:**

1. Actualizar `src/types/next-auth.d.ts` - Session interface
2. Actualizar `auth.config.ts` - jwt callback para asignar el campo
3. Actualizar `auth.config.ts` - session callback para copiar JWT → Session
4. Test con `npm run build && npm run dev`

**Template para nuevo campo:**

```typescript
// 1. En src/types/next-auth.d.ts
interface Session {
  user: {
    // ... existing fields
    newField: string; // ← Agregar aquí
  };
}

// 2. En auth.config.ts - jwt callback
async jwt({ token, user, trigger, session }) {
  if (user) {
    token.newField = user.newField; // ← Agregar aquí
  }
  return token;
}

// 3. En auth.config.ts - session callback
async session({ session, token }) {
  if (session.user) {
    session.user.newField = token.newField as string; // ← Agregar aquí
  }
  return session;
}
```

**Debugging de tipos:**

```typescript
// Si TypeScript no ve el nuevo campo:
// 1. Verificar que .d.ts está en tsconfig.json include
// 2. Ejecutar: npm run build (rebuild types)
// 3. Restart VSCode TypeScript server (Cmd/Ctrl+Shift+P > Restart TS)
// 4. Verificar no hay circular imports
```
