# Estrategia de Autenticación y Autorización - cjhirashi-agents MVP

**Versión:** 1.0
**Fecha:** 2025-10-22
**Estado:** LISTO PARA PRODUCCIÓN
**Propietario:** Security Specialist
**Framework:** NextAuth.js v5

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Configuración de NextAuth.js](#configuración-de-nextauthjs)
3. [Gestión de Sesiones](#gestión-de-sesiones)
4. [Estructura de Token JWT](#estructura-de-token-jwt)
5. [Seguridad de Contraseñas](#seguridad-de-contraseñas)
6. [OAuth y Login Social](#oauth-y-login-social)
7. [Control de Acceso Basado en Roles (RBAC)](#control-de-acceso-basado-en-roles-rbac)
8. [Autenticación con API Key](#autenticación-con-api-key)
9. [Protección CORS y CSRF](#protección-cors-y-csrf)
10. [Almacenamiento Seguro](#almacenamiento-seguro)
11. [Auditoría y Logging](#auditoría-y-logging)
12. [Cumplimiento Normativo](#cumplimiento-normativo)

---

## Introducción

### Propósito

Este documento define el sistema completo de autenticación y autorización para el MVP de cjhirashi-agents.

### Principios de Seguridad

1. **Zero Trust:** Validar todo, no confiar en nada
2. **Privilegio Mínimo:** Los usuarios obtienen los permisos mínimos necesarios
3. **Defensa en Profundidad:** Múltiples capas de seguridad
4. **Cifrado:** Datos sensibles cifrados en reposo y en tránsito
5. **Auditabilidad:** Registrar todos los eventos de seguridad

### Métodos de Autenticación

1. **Email/Password:** Autenticación basada en credenciales
2. **OAuth 2.0:** Proveedores Google, GitHub
3. **JWT:** Autenticación stateless basada en tokens
4. **API Keys:** Acceso programático

---

## Configuración de NextAuth.js

### Proveedores Soportados

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

export const { handlers, auth } = NextAuth({
  providers: [
    // Credentials Provider (Email + Password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials?.email }
        });

        if (!user) throw new Error("Invalid credentials");

        const passwordMatch = await bcrypt.compare(
          credentials?.password || "",
          user.password
        );

        if (!passwordMatch) throw new Error("Invalid credentials");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          role: user.role
        };
      }
    }),

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile"
        }
      }
    }),

    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email"
        }
      }
    })
  ],

  // JWT Configuration
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // Update every 24 hours
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    encryption: true
  },

  // Callbacks
  callbacks: {
    // JWT callback - Add custom claims
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.tier = user.tier;
        token.role = user.role;
      }

      if (account) {
        token.provider = account.provider;
      }

      return token;
    },

    // Session callback - Return token data
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = token.tier as string;
        session.user.role = token.role as string;
      }

      return session;
    },

    // Authorized callback - Custom auth checks
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      // Admin routes - require ADMIN role
      if (pathname.startsWith("/admin")) {
        return auth?.user?.role === "ADMIN";
      }

      // Protected routes - require auth
      if (pathname.startsWith("/dashboard")) {
        return !!auth;
      }

      return true;
    }
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/auth/welcome"
  },

  events: {
    async signIn({ user, account }) {
      // Log successful login
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_SUCCESS",
          provider: account?.provider || "credentials",
          timestamp: new Date()
        }
      });
    },

    async signOut({ token }) {
      // Log logout
      await db.auditLog.create({
        data: {
          userId: token.id,
          action: "LOGOUT",
          timestamp: new Date()
        }
      });
    }
  }
});
```

---

## Gestión de Sesiones

### Configuración de Cookies

Cookies seguras para gestión de sesiones:

```typescript
// .env.local
NEXTAUTH_URL=https://cjhirashi-agents.vercel.app
NEXTAUTH_SECRET=<generated_secret>

// Cookie settings (automatic in NextAuth v5)
// httpOnly: true  - No accessible from JavaScript
// secure: true    - HTTPS only in production
// sameSite: "lax" - CSRF protection
```

### Duración de Sesión

- **Access Token (JWT):** 15 minutos
- **Refresh Token:** 30 días
- **Cookie:** 30 días (sliding window)

### Refresco de Token

Cuando el access token expira, NextAuth automáticamente refresca usando el refresh token:

```typescript
const session = await auth();

if (session?.user) {
  // Token automatically refreshed if expired
  // User stays logged in seamlessly
}
```

### Invalidación de Sesión

**Logout:**
```typescript
import { signOut } from "next-auth/react";

await signOut({ redirect: "/auth/signin" });
```

**Forzar Cierre de Todas las Sesiones:**
```typescript
await db.session.deleteMany({
  where: { userId: userId }
});
```

---

## Estructura de Token JWT

### Payload del Token

```json
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "name": "John Doe",
  "tier": "PRO",
  "role": "USER",
  "provider": "credentials",
  "iat": 1698067200,
  "exp": 1698070800,
  "aud": "cjhirashi-agents",
  "iss": "nextauth.js"
}
```

### Claims Personalizados

- **sub:** User ID (estándar OIDC)
- **tier:** Tier de suscripción (FREE, PRO, ENTERPRISE)
- **role:** Rol de usuario (USER, ADMIN, PRO, ENTERPRISE)
- **provider:** Proveedor de autenticación (credentials, google, github)
- **iat:** Emitido en (Unix timestamp)
- **exp:** Expiración (15 minutos)

### Expiración de Token

- **Access Token:** 15 minutos
- **Refresh Token:** 30 días
- **Cookie:** 30 días (expiración deslizante)

---

## Seguridad de Contraseñas

### Requisitos de Contraseña

Forzar contraseñas fuertes:

```typescript
// Password schema (Zod)
const passwordSchema = z.string()
  .min(8, "Al menos 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .regex(/[A-Z]/, "Al menos una letra mayúscula")
  .regex(/[a-z]/, "Al menos una letra minúscula")
  .regex(/[0-9]/, "Al menos un número")
  .regex(/[!@#$%^&*]/, "Al menos un carácter especial");
```

**Requisitos:**
- Mínimo 8 caracteres
- 1 letra mayúscula (A-Z)
- 1 letra minúscula (a-z)
- 1 número (0-9)
- 1 carácter especial (!@#$%^&*)

### Hashing de Contraseñas

Hashing seguro con bcrypt:

```typescript
import bcrypt from "bcrypt";

// Hash password
const hashed = await bcrypt.hash(password, 10); // 10 salt rounds

// Verify password
const match = await bcrypt.compare(plaintext, hashed);
```

**Algoritmo:** bcrypt con 10 salt rounds
**Nunca:** Almacenar contraseñas en texto plano

### Restablecimiento de Contraseña

```typescript
// 1. User requests reset
POST /api/auth/password-reset
{ "email": "user@example.com" }

// 2. System generates token (valid 24 hours)
const token = jwt.sign(
  { sub: user.id, type: "password_reset" },
  process.env.NEXTAUTH_SECRET,
  { expiresIn: "24h" }
);

// 3. Send reset email with link
await sendEmail({
  to: user.email,
  subject: "Restablece tu contraseña",
  html: `<a href="https://app.com/auth/reset?token=${token}">Restablecer Contraseña</a>`
});

// 4. User clicks link and resets password
PATCH /api/auth/password-reset
{ "token": "jwt_token", "newPassword": "NewPassword123!" }
```

### Protección contra Fuerza Bruta

```typescript
// Track failed login attempts
const failures = await db.loginAttempt.count({
  where: {
    email: email,
    success: false,
    createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // 15 min
  }
});

if (failures >= 5) {
  throw new Error("Cuenta bloqueada por 30 minutos");
}
```

**Política de Bloqueo:**
- 5 intentos fallidos = bloqueo de 30 minutos
- Se restablece después de inicio de sesión exitoso

---

## OAuth y Login Social

### OAuth 2.0 de Google

**Configuración:**

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

**Scopes:**
- `openid` - OpenID Connect
- `email` - Acceso a dirección de email
- `profile` - Acceso a perfil (nombre, foto)

**Creación de Usuario:**

```typescript
// If user doesn't exist, create new account
let user = await db.user.findUnique({
  where: { email: profile.email }
});

if (!user) {
  user = await db.user.create({
    data: {
      email: profile.email,
      name: profile.name || "User",
      tier: "FREE",
      role: "USER",
      emailVerified: new Date() // Email verified via Google
    }
  });

  // Link Google account
  await db.account.create({
    data: {
      userId: user.id,
      type: "oauth",
      provider: "google",
      providerAccountId: profile.sub
    }
  });
}
```

### OAuth de GitHub

**Configuración:**

```env
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

**Scopes:**
- `read:user` - Acceso a perfil público
- `user:email` - Acceso a direcciones de email

---

## Control de Acceso Basado en Roles (RBAC)

### Roles

```typescript
enum UserRole {
  USER = "USER",           // Usuario regular
  PRO = "PRO",             // Suscriptor premium
  ADMIN = "ADMIN",         // Administrador del sistema
  SUPER_ADMIN = "SUPER_ADMIN" // Administrador root
}
```

### Tiers

```typescript
enum UserTier {
  FREE = "FREE",           // Usuario trial/gratuito
  PRO = "PRO",             // Suscriptor de pago
  ENTERPRISE = "ENTERPRISE" // Cliente empresarial
}
```

### Matriz RBAC - Todos los 58 Endpoints

| Endpoint | Guest | Free | Pro | Enterprise | Admin |
|----------|-------|------|-----|------------|-------|
| **Auth (6 endpoints)** | | | | | |
| POST /api/auth/register | ✅ | - | - | - | - |
| POST /api/auth/signin | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/refresh | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/logout | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/auth/me | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/oauth/* | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Chat (6 endpoints)** | | | | | |
| POST /api/chat/sessions | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/chat/sessions | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/chat/{id} | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/chat/send | - | ✅ (20/día) | ✅ (500/día) | ✅ | ✅ |
| GET /api/chat/history/{id} | - | ✅ | ✅ | ✅ | ✅ |
| DELETE /api/chat/{id} | - | ✅ | ✅ | ✅ | ✅ |
| **Agents (5 endpoints)** | | | | | |
| GET /api/agents | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /api/agents/{id} | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/agents/{id}/enable | - | ✅ | ✅ | ✅ | ✅ |
| DELETE /api/agents/{id}/disable | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/agents/{id}/usage | - | ✅ | ✅ | ✅ | ✅ |
| **RAG Documents (4 endpoints)** | | | | | |
| POST /api/rag/documents | - | ✅ (5/mes) | ✅ (50/mes) | ✅ | ✅ |
| GET /api/rag/documents | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/rag/search | - | ✅ (20/min) | ✅ (100/min) | ✅ | ✅ |
| DELETE /api/rag/{id} | - | ✅ | ✅ | ✅ | ✅ |
| **Artifacts (4 endpoints)** | | | | | |
| GET /api/artifacts | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/artifacts/{id} | - | ✅ | ✅ | ✅ | ✅ |
| DELETE /api/artifacts/{id} | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/artifacts/{id}/export | - | ✅ | ✅ | ✅ | ✅ |
| **Users & Settings (5 endpoints)** | | | | | |
| GET /api/users/profile | - | ✅ | ✅ | ✅ | ✅ |
| PATCH /api/users/profile | - | ✅ | ✅ | ✅ | ✅ |
| PATCH /api/users/settings | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/users/password | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/users/usage | - | ✅ | ✅ | ✅ | ✅ |
| **Admin (4 endpoints)** | | | | | |
| GET /api/admin/users | - | - | - | - | ✅ |
| PATCH /api/admin/users/{id}/tier | - | - | - | - | ✅ |
| DELETE /api/admin/users/{id} | - | - | - | - | ✅ |
| GET /api/admin/metrics | - | - | - | - | ✅ |
| **Support (3 endpoints)** | | | | | |
| POST /api/support/tickets | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/support/tickets | - | ✅ | ✅ | ✅ | ✅ |
| PATCH /api/support/{id} | - | ✅ | ✅ | ✅ | ✅ |
| **MCP (4 endpoints)** | | | | | |
| POST /api/mcp/connect/* | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/mcp/connected | - | ✅ | ✅ | ✅ | ✅ |
| DELETE /api/mcp/* | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/mcp/*/sync | - | ✅ | ✅ | ✅ | ✅ |
| **Storage (5 endpoints)** | | | | | |
| POST /api/storage/upload | - | ✅ (1GB) | ✅ (100GB) | ✅ | ✅ |
| GET /api/storage/files | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/storage/{id}/download | - | ✅ | ✅ | ✅ | ✅ |
| DELETE /api/storage/{id} | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/storage/{id}/share | - | ✅ | ✅ | ✅ | ✅ |
| **Health (6 endpoints)** | | | | | |
| GET /api/health/profile | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/health/medications | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/health/medications | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/health/appointments | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/health/measurements | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/health/measurements | - | ✅ | ✅ | ✅ | ✅ |
| **Financial (6 endpoints)** | | | | | |
| GET /api/financial/profile | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/financial/accounts | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/financial/transactions | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/financial/transactions | - | ✅ | ✅ | ✅ | ✅ |
| POST /api/financial/budgets | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/financial/budgets | - | ✅ | ✅ | ✅ | ✅ |

---

### Guards de Autorización

```typescript
// Middleware guard
export function requireAuth(handler: Function) {
  return async (req: Request) => {
    const session = await auth();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    return handler(req, session);
  };
}

// Role guard
export function requireRole(role: UserRole, handler: Function) {
  return requireAuth(async (req, session) => {
    if (session.user.role !== role) {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }
    return handler(req, session);
  });
}

// Tier guard
export function requireTier(tier: UserTier, handler: Function) {
  return requireAuth(async (req, session) => {
    const tierLevels = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
    if (tierLevels[session.user.tier] < tierLevels[tier]) {
      return Response.json({ error: "Actualización requerida" }, { status: 403 });
    }
    return handler(req, session);
  });
}
```

---

## Autenticación con API Key

### Generación de API Key

```typescript
// Generate API key
POST /api/users/api-keys

Response:
{
  "data": {
    "key": "sk-abc123def456...", // Only shown once
    "name": "My App Key",
    "createdAt": "2025-10-22T10:30:00Z",
    "lastUsed": null
  }
}
```

### Uso de API Key

```bash
curl -H "Authorization: Bearer sk-abc123def456" \
     https://cjhirashi-agents.vercel.app/api/v1/chat/send
```

### Seguridad de API Key

- **Hashing:** Hash bcrypt almacenado en base de datos
- **Rotación:** Rotar claves mensualmente
- **Scope:** Limitar a endpoints específicos
- **Revocación:** Revocar inmediatamente si se compromete

---

## Protección CORS y CSRF

### Configuración CORS

```typescript
// Allowed origins
const allowedOrigins = [
  'https://cjhirashi-agents.vercel.app',
  'https://staging-cjhirashi.vercel.app',
  'http://localhost:3000'
];

// CORS headers
response.headers.set('Access-Control-Allow-Origin', origin);
response.headers.set('Access-Control-Allow-Credentials', 'true');
response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH');
response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
```

### Protección CSRF

NextAuth maneja automáticamente tokens CSRF mediante cookies:
- Cookie: `httpOnly`, `secure`, `sameSite=lax`
- Token en cuerpo de solicitud (form-encoded)
- Validación automática

---

## Almacenamiento Seguro

### Gestión de Secrets

```env
# .env.local (NUNCA hacer commit)
NEXTAUTH_SECRET=<use: openssl rand -base64 32>
NEXTAUTH_URL=https://cjhirashi-agents.vercel.app

# OAuth credentials (Vercel Secrets)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Database
DATABASE_URL=postgresql://user:pass@host/db
```

### Cifrado en Reposo

Cifrar datos sensibles:

```typescript
import crypto from 'crypto';

function encrypt(plaintext: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'),
    crypto.randomBytes(16)
  );

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted + ':' + cipher.getAuthTag().toString('hex');
}
```

---

## Auditoría y Logging

### Eventos de Seguridad a Registrar

```typescript
// User logins
POST /api/auth/signin → LOGIN_SUCCESS or LOGIN_FAILED

// Password changes
PATCH /api/users/password → PASSWORD_CHANGED

// OAuth connections
POST /api/auth/oauth/google → OAUTH_CONNECTED

// Permission changes
PATCH /api/admin/users/{id}/tier → TIER_CHANGED

// Data access
GET /api/health/profile → HEALTH_DATA_ACCESSED

// Admin actions
PATCH /api/admin/users/{id} → USER_MODIFIED
DELETE /api/admin/users/{id} → USER_DELETED
```

### Schema de Audit Log

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string; // LOGIN_SUCCESS, PASSWORD_CHANGED, etc.
  resourceType: string; // User, Chat, Document, etc.
  resourceId?: string;
  changes?: object;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  retention: 24 * 60 * 60 * 1000; // 24 months retention
}
```

### Implementación de Logging

```typescript
async function logAuditEvent(event: AuditLog) {
  await db.auditLog.create({
    data: {
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      changes: event.changes,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date()
    }
  });
}
```

---

## Cumplimiento Normativo

### GDPR

- **Exportación de Datos:** Los usuarios pueden exportar sus datos
- **Derecho al Olvido:** Los usuarios pueden eliminar cuentas
- **Notificación de Brechas:** Notificar dentro de 72 horas
- **Política de Privacidad:** Divulgación clara del uso de datos

### HIPAA (Datos de Salud)

- **Cifrado:** AES-256 para registros de salud
- **Logs de Acceso:** Rastrear todo acceso a datos de salud
- **Auditoría:** Retención de 6 años
- **Business Associate Agreement:** Requerido para cumplimiento

### PCI DSS (Pagos)

- **NO Tarjetas de Crédito:** Usar Stripe (conforme a PCI)
- **Sin Datos Sensibles:** No almacenar información de pago
- **Cifrado:** Solo HTTPS
- **Control de Acceso:** RBAC para endpoints de pagos

---

## Información del Documento

**Versión:** 1.0
**Creado:** 2025-10-22
**Estado:** LISTO PARA PRODUCCIÓN
**Propietario:** Security Specialist

**Framework:** NextAuth.js v5
**Proveedores:** Credentials, Google, GitHub
**Algoritmo:** HMAC SHA-256 (JWT)
**Tipo de Token:** JWT (stateless)

**Endpoints RBAC:** Todos los 58 endpoints documentados
**Tiers:** FREE, PRO, ENTERPRISE
**Roles:** USER, ADMIN, SUPER_ADMIN

**Referencias:**
- [API-DESIGN.md](./API-DESIGN.md)
- [RATE-LIMITING.md](./RATE-LIMITING.md)
- [ENDPOINTS.md](./ENDPOINTS.md)
- Documentación de NextAuth.js: https://authjs.dev/

---

🔐 **ESTRATEGIA DE AUTENTICACIÓN LISTA PARA IMPLEMENTACIÓN EN FASE 5**
