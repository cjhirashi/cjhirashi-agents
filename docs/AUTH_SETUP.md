# Configuración de Autenticación

Este documento describe cómo configurar y utilizar el sistema de autenticación de cjhirashi-agents.

## Stack de Autenticación

- **NextAuth.js v4**: Biblioteca de autenticación para Next.js
- **Google OAuth 2.0**: Proveedor de autenticación
- **Prisma**: ORM para gestión de sesiones y usuarios
- **PostgreSQL**: Base de datos para almacenar usuarios y sesiones

## Requisitos Previos

1. **Base de datos PostgreSQL**
   - Puedes usar Docker:
     ```bash
     docker run --name cjhirashi-postgres \
       -e POSTGRES_PASSWORD=mysecretpassword \
       -e POSTGRES_DB=cjhirashi_agents \
       -p 5432:5432 -d postgres
     ```

2. **Credenciales de Google OAuth**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita la API de Google+ (Google People API)
   - Crea credenciales OAuth 2.0

## Configuración Paso a Paso

### 1. Configurar Google OAuth

**📖 Guía Completa:** Para una guía paso a paso con capturas detalladas, consulta [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)

**Resumen rápido:**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crea o selecciona un proyecto
3. Configura la pantalla de consentimiento OAuth (tipo: Externo)
4. Agrega usuarios de prueba (tu email)
5. Crea credenciales → ID de cliente de OAuth 2.0 → Aplicación web
6. En "URIs de redireccionamiento autorizados", agrega:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tu-dominio.com/api/auth/callback/google` (producción - futuro)
7. Copia el Client ID y Client Secret
8. Guárdalos de forma segura

**⚠️ IMPORTANTE:** El URI de redirección debe ser EXACTAMENTE `http://localhost:3000/api/auth/callback/google`

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Copiar desde .env.example
cp .env.example .env
```

Edita `.env` y configura:

```env
# Database URL
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/cjhirashi_agents?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-aleatorio-aqui"

# Google OAuth
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
```

**Importante**: Genera un `NEXTAUTH_SECRET` seguro:
```bash
openssl rand -base64 32
```

### 3. Configurar Base de Datos

Ejecuta las migraciones de Prisma:

```bash
# Generar el cliente de Prisma
npx prisma generate

# Aplicar el schema a la base de datos
npx prisma db push

# (Opcional) Abrir Prisma Studio para ver los datos
npx prisma studio
```

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

## Estructura de Autenticación

### Archivos Principales

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts        # Route handler de NextAuth
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx            # Página de inicio de sesión
│   │   └── error/
│   │       └── page.tsx            # Página de error de autenticación
│   └── layout.tsx                   # Layout principal con SessionProvider
├── components/
│   ├── session-provider.tsx         # Wrapper de NextAuth SessionProvider
│   └── sidebar.tsx                  # Sidebar con información del usuario
└── lib/
    ├── auth.ts                      # Configuración de NextAuth
    └── prisma.ts                    # Cliente de Prisma
```

### Modelos de Prisma

El schema incluye los siguientes modelos para autenticación:

- **User**: Información del usuario
- **Account**: Cuentas de OAuth (Google, etc.)
- **AuthSession**: Sesiones de autenticación de NextAuth
- **VerificationToken**: Tokens de verificación
- **Session**: Sesiones de conversación del usuario
- **Agent**: Agentes del usuario
- **Conversation**: Conversaciones del usuario
- **Message**: Mensajes de las conversaciones

## Uso en la Aplicación

### Verificar Autenticación en Server Components

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  return <div>Hola {session.user?.name}</div>;
}
```

### Verificar Autenticación en Client Components

```tsx
"use client";

import { useSession } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Cargando...</div>;
  if (!session) return <div>No autenticado</div>;

  return <div>Hola {session.user?.name}</div>;
}
```

### Cerrar Sesión

```tsx
"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })}>
      Cerrar Sesión
    </button>
  );
}
```

### Proteger Rutas API

```tsx
// app/api/protected/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  return NextResponse.json({ user: session.user });
}
```

## Flujo de Autenticación

1. **Usuario visita la app** → Se verifica si hay sesión activa
2. **No hay sesión** → Redirige a `/auth/signin`
3. **Usuario hace clic en "Continuar con Google"** → Redirige a Google OAuth
4. **Google autentica al usuario** → Redirige a `/api/auth/callback/google`
5. **NextAuth procesa el callback**:
   - Crea o actualiza el usuario en la base de datos
   - Crea una sesión en la base de datos
   - Establece una cookie de sesión
6. **Usuario redirigido al dashboard** → Acceso completo a la aplicación

## Seguridad

### Mejores Prácticas

1. **Nunca compartas tu `NEXTAUTH_SECRET`**
2. **Usa HTTPS en producción**
3. **Configura correctamente las URIs de redirección en Google**
4. **Revisa los logs de autenticación regularmente**
5. **Implementa rate limiting en las rutas de autenticación**

### Variables de Entorno en Producción

Para despliegue en producción (ej: Vercel):

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega todas las variables de `.env`
4. Actualiza `NEXTAUTH_URL` con tu dominio de producción

## Solución de Problemas

### Error: "Configuration" en página de error

- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` sean correctos

### Error: "AccessDenied"

- Verifica que el usuario tenga una cuenta de Google válida
- Revisa la configuración de la pantalla de consentimiento en Google Cloud

### Error: Base de datos no conectada

```bash
# Verifica la conexión a la base de datos
npx prisma db pull

# Si es necesario, reinicia la base de datos
npx prisma db push --force-reset
```

### Error: "@prisma/client did not initialize"

```bash
# Regenera el cliente de Prisma
npx prisma generate
```

## Próximos Pasos

1. **Implementar roles y permisos**: Agregar campo `role` al modelo User
2. **Agregar más proveedores**: GitHub, Discord, etc.
3. **Implementar autenticación de dos factores**
4. **Agregar logs de auditoría de sesiones**

## Referencias

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
