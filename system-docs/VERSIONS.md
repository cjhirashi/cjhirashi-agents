# Technology Versions - CJHIRASHI Agents

Este documento mantiene un registro de todas las versiones de tecnologías utilizadas en el proyecto.

---

## Core Framework

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **Next.js** | 15.5.5 | 2025-01 | ✅ Stable | App Router, React 19 support |
| **React** | 19.1.0 | 2025-01 | ✅ Stable | Server Components |
| **React DOM** | 19.1.0 | 2025-01 | ✅ Stable | - |
| **TypeScript** | 5.x (latest) | 2024 | ✅ Stable | - |
| **Node.js** | 20.x (required) | 2024 | ✅ LTS | Required for Next.js 15 |

---

## Backend & Database

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **Prisma** | 6.17.1 | 2025-01 | ✅ Stable | ORM for PostgreSQL |
| **@prisma/client** | 6.17.1 | 2025-01 | ✅ Stable | Auto-generated client |
| **PostgreSQL** | 15+ | - | ✅ Stable | Via Neon serverless |

---

## Authentication

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **NextAuth.js** | 4.24.11 | 2024-12 | ✅ Stable | OAuth with Google |
| **@next-auth/prisma-adapter** | 1.0.7 | 2024 | ✅ Stable | Prisma adapter for NextAuth |

---

## UI & Styling

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **Tailwind CSS** | 4.x (latest) | 2025-01 | ✅ Stable | v4 with new engine |
| **@tailwindcss/postcss** | 4.x (latest) | 2025-01 | ✅ Stable | PostCSS plugin |
| **shadcn/ui** | 0.0.4 | 2024 | ✅ Stable | Component library CLI |
| **Radix UI** | - | 2024 | ✅ Stable | Multiple packages |
| **class-variance-authority** | 0.7.1 | 2024 | ✅ Stable | CVA for component variants |
| **clsx** | 2.1.1 | 2024 | ✅ Stable | Conditional classes |
| **tailwind-merge** | 3.3.1 | 2024 | ✅ Stable | Merge Tailwind classes |
| **tw-animate-css** | 1.4.0 | 2024 | ✅ Stable | Animation utilities |

### Radix UI Components

| Package | Versión | Status |
|---------|---------|--------|
| **@radix-ui/react-avatar** | 1.1.10 | ✅ Stable |
| **@radix-ui/react-dialog** | 1.1.15 | ✅ Stable |
| **@radix-ui/react-dropdown-menu** | 2.1.16 | ✅ Stable |
| **@radix-ui/react-label** | 2.1.7 | ✅ Stable |
| **@radix-ui/react-scroll-area** | 1.2.10 | ✅ Stable |
| **@radix-ui/react-select** | 2.2.6 | ✅ Stable |
| **@radix-ui/react-separator** | 1.1.7 | ✅ Stable |
| **@radix-ui/react-slot** | 1.2.3 | ✅ Stable |
| **@radix-ui/react-tabs** | 1.1.13 | ✅ Stable |

---

## Icons & Assets

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **lucide-react** | 0.545.0 | 2025-01 | ✅ Stable | Icon library |

---

## State Management & Validation

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **Zustand** | 5.0.8 | 2024 | ✅ Stable | Lightweight state management |
| **Zod** | 4.1.12 | 2024 | ✅ Stable | Schema validation |

---

## Utilities & Helpers

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **date-fns** | 4.1.0 | 2025-01 | ✅ Stable | Date manipulation |
| **sonner** | 2.0.7 | 2024 | ✅ Stable | Toast notifications |
| **next-themes** | 0.4.6 | 2024 | ✅ Stable | Dark mode support |

---

## Data Visualization

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **Recharts** | 3.2.1 | 2024 | ✅ Stable | Chart library for React |

---

## Development Tools

| Tecnología | Versión | Release Date | Status | Notes |
|------------|---------|--------------|--------|-------|
| **tsx** | 4.20.6 | 2024 | ✅ Stable | TypeScript execution for Node |
| **ESLint** | 9.x (latest) | 2024 | ✅ Stable | Code linting |
| **@eslint/eslintrc** | 3.x (latest) | 2024 | ✅ Stable | ESLint config |
| **eslint-config-next** | 15.5.5 | 2025-01 | ✅ Stable | Next.js ESLint config |

### Type Definitions

| Package | Versión | Status |
|---------|---------|--------|
| **@types/node** | 20.19.21 | ✅ Updated |
| **@types/react** | 19.2.2 | ✅ Updated |
| **@types/react-dom** | 19.2.2 | ✅ Updated |

---

## External Services & APIs

### AI Services

| Service | Model/Version | Status | Purpose |
|---------|--------------|--------|---------|
| **Google Gemini** | gemini-2.0-flash-exp | 🧪 Experimental | AI conversational agents |

**Notes**:
- `gemini-2.0-flash-exp` es experimental, se recomienda migrar a stable cuando esté disponible
- Alternativas a considerar: `gemini-1.5-flash`, `gemini-1.5-pro`

### Authentication

| Service | Version | Status | Purpose |
|---------|---------|--------|---------|
| **Google OAuth 2.0** | v2 | ✅ Stable | User authentication |

### Database

| Service | Version | Status | Purpose |
|---------|---------|--------|---------|
| **Neon** | Latest | ✅ Stable | Serverless PostgreSQL hosting |

### Hosting & Deployment

| Service | Version | Status | Purpose |
|---------|---------|--------|---------|
| **Vercel** | Latest | ✅ Stable | Next.js hosting and deployment |

---

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000" # or production URL

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Google AI
GEMINI_API_KEY="..."
```

---

## Compatibility Matrix

### Browser Support

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 90+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |

### Node.js Requirements

| Node Version | Status | Notes |
|--------------|--------|-------|
| 20.x | ✅ Recommended | LTS version |
| 18.x | ⚠️ Supported | Minimum required |
| 22.x | ✅ Supported | Latest |

---

## Update History

### 2025-01-16 (Current)

- ✅ Updated to Next.js 15.5.5
- ✅ Updated to React 19.1.0
- ✅ Updated to Tailwind CSS 4.x
- ✅ Updated to Prisma 6.17.1
- ✅ Updated Zod to 4.1.12
- ✅ Updated Zustand to 5.0.8
- ✅ Updated date-fns to 4.1.0
- ✅ Updated lucide-react to 0.545.0

### Breaking Changes in Latest Updates

**Next.js 15**:
- App Router is now stable and default
- Server Components by default
- New `fetch` caching behavior
- Middleware changes for authentication

**React 19**:
- Server Components stable
- New hooks: `use()`, `useOptimistic()`, `useFormStatus()`
- Improved hydration
- Better error handling

**Tailwind CSS 4**:
- New engine with better performance
- New configuration format
- Breaking changes in some utilities
- Better arbitrary values support

---

## Deprecated / To Be Replaced

⚠️ **Ninguna tecnología deprecada actualmente**

---

## Planned Upgrades

📋 **Short term** (próximos 3 meses):
- Migrar de `gemini-2.0-flash-exp` a versión estable cuando esté disponible
- Evaluar migración a NextAuth v5 (Auth.js)

📋 **Long term** (próximos 6-12 meses):
- Considerar React Native para mobile app
- Evaluar tRPC para type-safe APIs
- Considerar TanStack Query para data fetching

---

## Version Update Policy

### Major Updates
- Revisar breaking changes
- Actualizar en branch separado
- Realizar testing completo
- Deploy gradual (preview → production)

### Minor Updates
- Revisar changelog
- Actualizar y testear localmente
- Deploy directo a production si no hay breaking changes

### Patch Updates
- Aplicar automáticamente (Dependabot)
- Revisar después del deploy

---

**Última actualización**: 2025-10-16
**Próxima revisión programada**: 2025-11-16
**Mantenido por**: cjhirashi@gmail.com
