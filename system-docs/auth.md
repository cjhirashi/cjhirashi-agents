# Authentication & Authorization Module

## Descripción General

El módulo de autenticación y autorización proporciona un sistema robusto basado en NextAuth.js con OAuth de Google, JWT tokens, y un sistema RBAC (Role-Based Access Control) con 6 niveles jerárquicos de permisos.

---

## Características Principales

- OAuth 2.0 con Google Provider
- JWT strategy para autenticación stateless
- Sistema RBAC con 6 roles jerárquicos
- Middleware de protección de rutas
- Session management con expiración automática
- Audit logging de acciones administrativas
- Sistema de invitaciones con tokens seguros

---

## Roles del Sistema

### Jerarquía de Roles

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor':'#1e3a8a',
  'primaryTextColor':'#f3f4f6',
  'primaryBorderColor':'#3b82f6',
  'lineColor':'#60a5fa',
  'secondaryColor':'#1e40af',
  'tertiaryColor':'#1e293b',
  'background':'#0f172a',
  'mainBkg':'#1e3a8a',
  'secondaryBkground':'#1e40af',
  'textColor':'#f3f4f6',
  'fontSize':'16px'
}}}%%
flowchart TD
    A[SUPER_ADMIN] --> B[ADMIN]
    B --> C[MANAGER]
    C --> D[DEVELOPER]
    D --> E[USER]
    E --> F[GUEST]

    A1[Control Total] --> A
    B1[Gestión de Usuarios] --> B
    C1[Supervisión y Reportes] --> C
    D1[Crear Agentes] --> D
    E1[Usuario Estándar] --> E
    F1[Acceso Limitado] --> F

    style A fill:#dc2626
    style B fill:#ea580c
    style C fill:#ca8a04
    style D fill:#16a34a
    style E fill:#2563eb
    style F fill:#64748b
```

### Descripción de Roles

| Rol | Descripción | Asignación |
|-----|-------------|------------|
| **SUPER_ADMIN** | Control total del sistema. Único rol que puede asignar otros SUPER_ADMINs. | Solo cjhirashi@gmail.com |
| **ADMIN** | Gestión completa de usuarios, permisos, invitaciones y tickets. | Asignado por SUPER_ADMIN |
| **MANAGER** | Supervisión de operaciones y acceso a reportes (futuro). | Asignado por SUPER_ADMIN/ADMIN |
| **DEVELOPER** | Crear y gestionar agentes IA (futuro). | Asignado por SUPER_ADMIN/ADMIN |
| **USER** | Usuario estándar con acceso a todas las funciones de usuario. | Default al registrarse |
| **GUEST** | Acceso limitado de solo lectura (futuro). | Asignado por invitación |

---

## Arquitectura de Autenticación

### Flujo de Autenticación

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor':'#1e3a8a',
  'primaryTextColor':'#f3f4f6',
  'primaryBorderColor':'#3b82f6',
  'lineColor':'#60a5fa',
  'secondaryColor':'#1e40af',
  'tertiaryColor':'#1e293b',
  'background':'#0f172a',
  'mainBkg':'#1e3a8a',
  'secondaryBkground':'#1e40af',
  'textColor':'#f3f4f6',
  'fontSize':'16px'
}}}%%
sequenceDiagram
    participant U as Usuario
    participant NX as Next.js App
    participant MW as Middleware
    participant NA as NextAuth
    participant G as Google OAuth
    participant DB as PostgreSQL

    U->>NX: Accede a /auth/signin
    NX->>NA: Inicia flujo OAuth
    NA->>G: Redirige a Google
    U->>G: Autentica con Google
    G->>NA: Callback con código
    NA->>G: Intercambia código por tokens
    G->>NA: Retorna access_token
    NA->>DB: Busca/Crea usuario
    DB->>NA: Usuario encontrado/creado
    NA->>NA: Genera JWT token
    NA->>NX: Retorna sesión
    NX->>U: Redirige a /dashboard

    Note over U,DB: Requests subsecuentes

    U->>NX: Request a ruta protegida
    NX->>MW: Intercepta request
    MW->>NA: Valida JWT
    alt Token válido
        NA->>MW: Sesión válida
        MW->>NX: Permite acceso
        NX->>U: Retorna contenido
    else Token inválido
        NA->>MW: Sesión inválida
        MW->>U: Redirige a /auth/signin
    end
```

---

## Configuración

### Variables de Entorno

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database
```

### Configuración de NextAuth

**Archivo:** `src/lib/auth.ts`

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
};
```

---

## Middleware de Protección

### Configuración

**Archivo:** `src/middleware.ts`

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/agents/:path*",
    "/api/conversations/:path*",
  ],
};
```

### Rutas Protegidas

El middleware protege automáticamente:
- `/dashboard/*` - Dashboard y páginas principales
- `/api/agents/*` - API de agentes
- `/api/conversations/*` - API de conversaciones
- `/admin/*` - Panel de administración (verificación adicional en componentes)
- `/support/*` - Tickets de soporte

---

## Sistema de Permisos

### Matriz de Permisos

| Funcionalidad | SUPER_ADMIN | ADMIN | MANAGER | DEVELOPER | USER | GUEST |
|---------------|-------------|-------|---------|-----------|------|-------|
| **Usuarios** |
| Ver todos los usuarios | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear usuarios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar usuarios | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Eliminar usuarios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cambiar roles | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Asignar SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Invitaciones** |
| Enviar invitaciones | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancelar invitaciones | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver invitaciones | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Agentes IA** |
| Crear agentes | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar propios agentes | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Eliminar propios agentes | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver agentes públicos | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Usar agentes | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **Soporte** |
| Crear tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver propios tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver todos los tickets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Asignar tickets | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Cerrar tickets | ✅ | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ |
| **Métricas** |
| Ver métricas globales | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver propias métricas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exportar datos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Auditoría** |
| Ver audit logs | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |

✅ = Permitido | ❌ = Denegado | ⚠️ = Con limitaciones

---

## Base de Datos

### Tablas Relacionadas

#### 1. Users

```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  avatar VARCHAR,
  role UserRole DEFAULT 'USER',
  isActive BOOLEAN DEFAULT true,
  subscriptionTier SubscriptionTier DEFAULT 'FREE',
  permissions JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### 2. Accounts (OAuth)

```sql
CREATE TABLE accounts (
  id VARCHAR PRIMARY KEY DEFAULT uuid(),
  userId VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  providerAccountId VARCHAR NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  UNIQUE(provider, providerAccountId)
);
```

#### 3. Sessions

```sql
CREATE TABLE auth_sessions (
  id VARCHAR PRIMARY KEY DEFAULT uuid(),
  sessionToken VARCHAR UNIQUE NOT NULL,
  userId VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);
```

#### 4. Invitations

```sql
CREATE TABLE invitations (
  id VARCHAR PRIMARY KEY DEFAULT uuid(),
  email VARCHAR NOT NULL,
  token VARCHAR UNIQUE NOT NULL,
  role UserRole NOT NULL,
  status InvitationStatus DEFAULT 'PENDING',
  invitedBy VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  expiresAt TIMESTAMP NOT NULL,
  acceptedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

#### 5. Audit Logs

```sql
CREATE TABLE audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT uuid(),
  adminId VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  targetId VARCHAR,
  details JSONB,
  ipAddress VARCHAR,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Autenticación

#### POST /api/auth/signin
Inicia el flujo de autenticación con Google.

**Response:**
Redirige a Google OAuth.

#### GET /api/auth/callback/google
Callback de Google OAuth.

**Response:**
Redirige a `/dashboard` con sesión creada.

#### POST /api/auth/signout
Cierra la sesión del usuario.

**Response:**
```json
{
  "success": true
}
```

### Sesión

#### GET /api/auth/session
Obtiene la sesión actual del usuario.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://..."
  },
  "expires": "2025-11-15T..."
}
```

---

## Uso en el Código

### Server Components

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Verificar rol
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <div>Admin content</div>;
}
```

### Client Components

```typescript
"use client";

import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <button onClick={() => signIn("google")}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### API Routes

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Verificar permisos
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: "Protected data" });
}
```

---

## Sistema de Invitaciones

### Flujo de Invitación

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor':'#1e3a8a',
  'primaryTextColor':'#f3f4f6',
  'primaryBorderColor':'#3b82f6',
  'lineColor':'#60a5fa',
  'secondaryColor':'#1e40af',
  'tertiaryColor':'#1e293b',
  'background':'#0f172a',
  'mainBkg':'#1e3a8a',
  'secondaryBkground':'#1e40af',
  'textColor':'#f3f4f6',
  'fontSize':'16px'
}}}%%
sequenceDiagram
    participant A as Admin
    participant SYS as Sistema
    participant DB as Database
    participant E as Email Service
    participant U as Usuario Invitado

    A->>SYS: Envía invitación (email, rol)
    SYS->>SYS: Genera token único
    SYS->>DB: Guarda invitación
    SYS->>E: Envía email con link
    E->>U: Email con link de invitación
    U->>SYS: Accede al link (token)
    SYS->>DB: Valida token y expiración
    alt Token válido
        SYS->>U: Redirige a Google OAuth
        U->>SYS: Completa autenticación
        SYS->>DB: Crea usuario con rol asignado
        SYS->>DB: Marca invitación como ACCEPTED
        SYS->>U: Redirige a dashboard
    else Token inválido/expirado
        SYS->>U: Muestra error
    end
```

### Crear Invitación

```typescript
// En el admin panel
const createInvitation = async (email: string, role: UserRole) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  const invitation = await prisma.invitation.create({
    data: {
      email,
      token,
      role,
      invitedBy: session.user.id,
      expiresAt,
      status: "PENDING",
    },
  });

  // Enviar email con link
  const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`;
  await sendInvitationEmail(email, inviteLink);

  return invitation;
};
```

---

## Audit Logging

### Acciones Registradas

El sistema registra automáticamente las siguientes acciones administrativas:

- `CREATE_USER` - Creación de usuario
- `UPDATE_USER` - Actualización de usuario
- `DELETE_USER` - Eliminación de usuario
- `CHANGE_ROLE` - Cambio de rol
- `SEND_INVITATION` - Envío de invitación
- `CANCEL_INVITATION` - Cancelación de invitación
- `ASSIGN_TICKET` - Asignación de ticket
- `CHANGE_SUBSCRIPTION` - Cambio de suscripción

### Ejemplo de Log

```typescript
await prisma.auditLog.create({
  data: {
    adminId: session.user.id,
    action: "CHANGE_ROLE",
    targetId: targetUserId,
    details: {
      oldRole: "USER",
      newRole: "ADMIN",
      reason: "Promoted to admin"
    },
    ipAddress: request.headers.get("x-forwarded-for"),
  },
});
```

---

## Seguridad

### Medidas Implementadas

1. **OAuth 2.0**: Autenticación delegada a Google
2. **JWT Tokens**: Tokens firmados y encriptados
3. **Session Expiration**: Sesiones con expiración de 30 días
4. **HTTPS Only**: Cookies con flag `secure` en producción
5. **CSRF Protection**: NextAuth incluye protección CSRF
6. **Rate Limiting**: Límite de intentos de autenticación (pendiente implementación)

### Mejores Prácticas

- Nunca almacenar contraseñas en texto plano
- Siempre validar sesión en el servidor
- No confiar en datos del cliente
- Regenerar tokens después de cambios críticos
- Invalidar sesiones después de cambio de rol
- Auditar todas las acciones administrativas

---

## Scripts de Administración

### Asignar Rol Admin

**Archivo:** `scripts/set-admin.ts`

```bash
npm run set-admin user@example.com
```

### Asignar Rol Super Admin

**Archivo:** `scripts/set-super-admin.js`

```bash
npm run set-super-admin user@example.com
```

---

## Troubleshooting

### Error: "Callback URL not configured"

**Causa:** Google OAuth no tiene configurado el callback URL.

**Solución:**
1. Ir a Google Cloud Console
2. OAuth 2.0 Client IDs
3. Agregar a "Authorized redirect URIs":
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)

### Error: "Session not found" en middleware

**Causa:** JWT strategy no está configurado correctamente.

**Solución:**
Verificar que `session.strategy = "jwt"` en `authOptions`.

### Usuario no puede acceder a rutas protegidas

**Causa:** Middleware no encuentra la sesión.

**Solución:**
1. Verificar que el usuario esté autenticado
2. Limpiar cookies y volver a autenticar
3. Verificar que `NEXTAUTH_SECRET` esté configurado

---

## Estado del Módulo

### Implementado ✅

- ✅ OAuth con Google
- ✅ JWT strategy
- ✅ Sistema de roles RBAC
- ✅ Middleware de protección
- ✅ Session management
- ✅ Sistema de invitaciones
- ✅ Audit logging
- ✅ Scripts de administración

### Pendiente 🚧

**Prioridad ALTA:**
- ⚠️ **Email/Password Authentication** - Actualmente solo Google OAuth está implementado
  - Agregar `CredentialsProvider` a NextAuth
  - Sistema de registro con email/password
  - Hash de passwords con bcrypt
  - Email verification
  - Password reset flow (forgot password)
  - Password strength validation
  - Account linking (conectar email/password con OAuth)

**Prioridad MEDIA:**
- 🚧 Rate limiting en autenticación
- 🚧 MFA (Multi-Factor Authentication)
- 🚧 Social login adicional (GitHub, Microsoft)
- 🚧 Refresh token rotation automático
- 🚧 Session device management (logout de otros dispositivos)

**Prioridad BAJA:**
- 🚧 API Key authentication para integraciones

---

## Archivos Clave

```
src/
├── lib/
│   └── auth.ts                        # Configuración de NextAuth
├── middleware.ts                      # Middleware de protección
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth API route
│   └── (auth)/
│       ├── signin/
│       │   └── page.tsx              # Página de login
│       └── error/
│           └── page.tsx              # Página de error

scripts/
├── set-admin.ts                       # Script para asignar ADMIN
└── set-super-admin.js                # Script para asignar SUPER_ADMIN

prisma/
└── schema.prisma                     # Definición de tablas auth
```

---

**Última actualización:** 2025-10-16
**Estado:** Producción
**Mantenido por:** cjhirashi@gmail.com
