# PHASE 6: FRONTEND DEVELOPMENT - DETAILED IMPLEMENTATION PLAN

**Versión**: 1.0
**Fecha Creación**: 2025-10-24
**Estado**: 🔵 LISTO PARA INICIAR
**Duración Estimada**: 10-14 días
**Fecha Inicio Estimada**: 2025-10-26
**Fecha Finalización Estimada**: 2025-11-07

---

## 📑 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura de Frontend](#arquitectura-de-frontend)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Desglose de Tareas por Página/Componente](#desglose-de-tareas-por-páginacomponente)
5. [Componentes Reutilizables](#componentes-reutilizables)
6. [Patrones de Diseño (RSC vs Client Components)](#patrones-de-diseño-rsc-vs-client-components)
7. [Integraciones Backend](#integraciones-backend)
8. [Testing Strategy](#testing-strategy)
9. [Criterios de Finalización](#criterios-de-finalización)
10. [Riesgos y Mitigación](#riesgos-y-mitigación)
11. [Cronograma Detallado](#cronograma-detallado)

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo Fase 6

Implementar la **interfaz de usuario completa** del MVP cjhirashi-agents que permite a usuarios interactuar con:
- **Dashboard** con métricas y vista general
- **Chat Interface** con streaming en tiempo real
- **Document Management** para upload y gestión de archivos
- **Admin Panel** para gestión de usuarios
- **Support System** para tickets
- **Settings** para preferencias de usuario

### Stack Tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| **Framework** | Next.js | 15.1+ |
| **React** | React | 18.3+ |
| **TypeScript** | TypeScript | strict mode |
| **Styling** | Tailwind CSS | 3.4+ |
| **Components** | shadcn/ui | Latest |
| **Forms** | react-hook-form | 7.51+ |
| **Validation** | Zod | 3.22+ |
| **Streaming Chat** | Vercel AI SDK | 5.0.78+ |
| **State** | React Context API | Native |
| **Testing** | Vitest + RTL | Latest |
| **HTTP Client** | fetch (native) | Native |

### Dependencias Backend Completadas (Fase 5)

✅ **Chat API** - POST /api/v1/chat/send (SSE streaming)
✅ **Chat Sessions** - CRUD endpoints
✅ **Documents API** - Upload, list, delete
✅ **NextAuth v5** - Autenticación + RBAC
✅ **Rate Limiting** - Token Bucket algorithm
✅ **RAG Pipeline** - Semantic search + context injection

### Entregables Esperados

| Entregable | Tipo | Responsable | Estimado |
|-----------|------|-------------|----------|
| Setup shadcn/ui + configuración inicial | Frontend | coder | 1 día |
| Dashboard completo (stats, charts, layout) | Frontend | coder | 2 días |
| Chat Interface con streaming | Frontend | coder | 3 días |
| Document Management | Frontend | coder | 2 días |
| Admin Panel (user management) | Frontend | coder | 2 días |
| Support System (tickets) | Frontend | coder | 1 día |
| Forms + Validation (react-hook-form + Zod) | Frontend | coder | 1 día |
| Component Tests (>70% coverage) | Testing | tester | 1-2 días |
| Responsive Design + Accessibility (a11y) | UX/QA | ux-designer + tester | 1 día |
| Documentation + Component Library | Docs | documenter | 0.5 días |

---

## 🏗️ ARQUITECTURA DE FRONTEND

### 1. Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│              Browser / Frontend                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Next.js App Router (RSC)                                  │
│  ├─ app/page.tsx (Landing)                                │
│  ├─ app/dashboard/layout.tsx (Protected Layout)           │
│  │  ├─ /dashboard (Dashboard Page - RSC)                  │
│  │  ├─ /chat (Chat Interface - Client Component)          │
│  │  ├─ /documents (Document Management - Client)          │
│  │  ├─ /admin (Admin Panel - Client + auth guard)         │
│  │  ├─ /support (Support System - Client)                 │
│  │  └─ /settings (Settings - Client)                      │
│  │                                                         │
│  │  React Components (UI Layer)                            │
│  │  ├─ shadcn/ui (Button, Card, Dialog, Table, etc)      │
│  │  ├─ Custom Components (ChatWindow, UserTable, etc)     │
│  │  └─ Hooks (useChat, useFetch, useForm, etc)            │
│  │                                                         │
│  │  State Management                                       │
│  │  ├─ React Context (Auth context from NextAuth)         │
│  │  ├─ React Query (data fetching - opcional)             │
│  │  └─ Local state (useState, useReducer)                 │
│  │                                                         │
├─────────────────────────────────────────────────────────────┤
│              NextAuth v5 (Authentication)                   │
│  ├─ JWT-based sessions (30 días)                          │
│  ├─ Role-based access control (RBAC)                      │
│  └─ Protected routes (middleware)                         │
├─────────────────────────────────────────────────────────────┤
│         Network Layer (API Calls)                          │
│  ├─ fetch() wrapper con auth headers                      │
│  ├─ Error handling + logging                              │
│  └─ Type-safe API responses (TypeScript)                  │
├─────────────────────────────────────────────────────────────┤
│              Backend (Fase 5)                               │
│  ├─ Chat API (SSE streaming)                              │
│  ├─ Documents API (upload, list, delete)                  │
│  ├─ Admin API (user management)                           │
│  ├─ Support API (tickets)                                 │
│  └─ Auth API (NextAuth endpoints)                         │
└─────────────────────────────────────────────────────────────┘
```

### 2. Patrones de Comunicación

**Server Components (RSC)**:
- Dashboard page - datos estáticos + servidor-side
- Layout pages - fetch de datos una sola vez
- Protected routes - validación en servidor

**Client Components**:
- Chat Interface - interactive + streaming
- Forms - react-hook-form + validación
- Tables - sorting, filtering, pagination
- Dialogs - modals interactivos

**API Client**:
```typescript
// src/lib/api/client.ts
export const apiClient = {
  chat: {
    send: (message: string, sessionId: string) =>
      fetch('/api/v1/chat/send', { method: 'POST', body: JSON.stringify(...) }),
    sessions: () =>
      fetch('/api/v1/chat/sessions'),
  },
  documents: {
    upload: (file: File) =>
      fetch('/api/v1/documents/upload', { method: 'POST' }),
    list: () =>
      fetch('/api/v1/documents'),
    delete: (id: string) =>
      fetch(`/api/v1/documents/${id}`, { method: 'DELETE' }),
  },
  // ... más endpoints
};
```

---

## 📁 ESTRUCTURA DE CARPETAS

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── register/
│   │   │   └── page.tsx              # Register page
│   │   └── forgot-password/
│   │       └── page.tsx              # Password reset
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                # Sidebar + responsive layout
│   │   ├── page.tsx                  # Dashboard overview
│   │   │
│   │   ├── chat/
│   │   │   └── page.tsx              # Chat interface
│   │   │
│   │   ├── documents/
│   │   │   ├── page.tsx              # Document list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Document detail
│   │   │
│   │   ├── history/
│   │   │   └── page.tsx              # Chat history
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── users/
│   │   │   │   ├── page.tsx          # User list
│   │   │   │   └── [userId]/
│   │   │   │       └── page.tsx      # User detail
│   │   │   └── settings/
│   │   │       └── page.tsx          # Admin settings
│   │   │
│   │   ├── support/
│   │   │   ├── page.tsx              # Tickets list
│   │   │   ├── [ticketId]/
│   │   │   │   └── page.tsx          # Ticket detail
│   │   │   └── new/
│   │   │       └── page.tsx          # Create ticket
│   │   │
│   │   └── settings/
│   │       ├── page.tsx              # User settings
│   │       ├── profile/
│   │       │   └── page.tsx          # Profile settings
│   │       ├── preferences/
│   │       │   └── page.tsx          # Notification prefs
│   │       └── api-keys/
│   │           └── page.tsx          # API key management
│   │
│   ├── page.tsx                      # Landing page
│   └── layout.tsx                    # Root layout + providers
│
├── components/
│   ├── ui/
│   │   ├── button.tsx                # shadcn Button
│   │   ├── card.tsx                  # shadcn Card
│   │   ├── input.tsx                 # shadcn Input
│   │   ├── textarea.tsx              # shadcn Textarea
│   │   ├── dialog.tsx                # shadcn Dialog
│   │   ├── form.tsx                  # shadcn Form
│   │   ├── select.tsx                # shadcn Select
│   │   ├── table.tsx                 # shadcn Table
│   │   ├── tabs.tsx                  # shadcn Tabs
│   │   ├── sheet.tsx                 # shadcn Sheet (mobile nav)
│   │   ├── badge.tsx                 # shadcn Badge
│   │   ├── avatar.tsx                # shadcn Avatar
│   │   ├── dropdown-menu.tsx         # shadcn Dropdown
│   │   ├── checkbox.tsx              # shadcn Checkbox
│   │   ├── radio-group.tsx           # shadcn RadioGroup
│   │   ├── toast.tsx                 # shadcn Toast
│   │   └── ... (otros componentes shadcn)
│   │
│   ├── chat/
│   │   ├── ChatWindow.tsx            # Main chat container
│   │   ├── MessageList.tsx           # Messages display
│   │   ├── MessageItem.tsx           # Single message
│   │   ├── ChatInput.tsx             # Message input
│   │   ├── ChatHistory.tsx           # Sessions sidebar
│   │   └── ChatSession.tsx           # Session card
│   │
│   ├── documents/
│   │   ├── DocumentList.tsx          # Documents table
│   │   ├── DocumentCard.tsx          # Document card
│   │   ├── FileUploader.tsx          # Upload component
│   │   ├── DocumentDetail.tsx        # Document viewer
│   │   └── QuotaDisplay.tsx          # Storage quota
│   │
│   ├── admin/
│   │   ├── UserTable.tsx             # Users management table
│   │   ├── UserForm.tsx              # User add/edit form
│   │   ├── UserMetricsDialog.tsx     # User metrics modal
│   │   ├── RoleSelector.tsx          # Role picker
│   │   └── SystemMetrics.tsx         # System overview
│   │
│   ├── support/
│   │   ├── TicketList.tsx            # Tickets list
│   │   ├── TicketDetail.tsx          # Ticket detail
│   │   ├── MessageThread.tsx         # Ticket messages
│   │   ├── CreateTicketForm.tsx      # New ticket form
│   │   └── TicketFilter.tsx          # Filters
│   │
│   ├── common/
│   │   ├── Navbar.tsx                # Top navigation
│   │   ├── Sidebar.tsx               # Left sidebar
│   │   ├── ErrorBoundary.tsx         # Error handling
│   │   ├── LoadingSpinner.tsx        # Loading indicator
│   │   ├── EmptyState.tsx            # Empty states
│   │   └── NotFound.tsx              # 404 component
│   │
│   ├── forms/
│   │   ├── LoginForm.tsx             # Login form
│   │   ├── RegisterForm.tsx          # Registration form
│   │   ├── SettingsForm.tsx          # Settings form
│   │   └── SearchForm.tsx            # Generic search
│   │
│   ├── theme-provider.tsx            # Dark/light theme
│   ├── theme-toggle.tsx              # Theme switcher
│   ├── session-provider.tsx          # NextAuth provider
│   └── query-provider.tsx            # React Query provider (opcional)
│
├── hooks/
│   ├── useChat.ts                    # Chat streaming hook
│   ├── useAuth.ts                    # Auth context hook
│   ├── useFetch.ts                   # Data fetching hook
│   ├── useForm.ts                    # Form handling hook
│   ├── useLocalStorage.ts            # Local storage hook
│   └── useDebounce.ts                # Debounce hook
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 # API client wrapper
│   │   ├── types.ts                  # API type definitions
│   │   └── endpoints.ts              # Endpoint constants
│   │
│   ├── utils/
│   │   ├── cn.ts                     # Class name utility
│   │   ├── format.ts                 # Date/time formatting
│   │   ├── validation.ts             # Validation schemas
│   │   └── constants.ts              # Constants
│   │
│   └── config/
│       └── site.ts                   # Site configuration
│
├── types/
│   ├── api.ts                        # API types
│   ├── chat.ts                       # Chat types
│   ├── document.ts                   # Document types
│   ├── admin.ts                      # Admin types
│   ├── support.ts                    # Support types
│   └── index.ts                      # Type exports
│
├── styles/
│   └── globals.css                   # Global styles + Tailwind
│
├── __tests__/
│   ├── unit/
│   │   ├── components/               # Component unit tests
│   │   ├── hooks/                    # Hook tests
│   │   └── utils/                    # Utility tests
│   │
│   ├── integration/
│   │   ├── chat.test.ts              # Chat integration
│   │   └── forms.test.ts             # Form handling
│   │
│   └── e2e/
│       ├── login.spec.ts             # Login flow (Playwright)
│       ├── chat.spec.ts              # Chat flow
│       └── dashboard.spec.ts         # Dashboard flow
│
├── middleware.ts                     # Route protection (NextAuth)
├── env.ts                            # Environment validation
└── constants.ts                      # Global constants
```

---

## 📋 DESGLOSE DE TAREAS POR PÁGINA/COMPONENTE

### TAREA 1: Setup Inicial & Configuración (1 día)

**Objetivo**: Configurar shadcn/ui, Tailwind, TypeScript, y estructura base

**Subtareas**:
1. Instalar shadcn/ui componentes necesarios
   - `npx shadcn-ui@latest add button card input textarea dialog form select table tabs sheet badge avatar dropdown-menu checkbox`
   - Tiempo: 30 minutos

2. Configurar Tailwind CSS
   - Personalizar colores (theme: light/dark)
   - Fuentes (Inter, Geist Mono)
   - Plugins (shadcn specific)
   - Tiempo: 30 minutos

3. Crear estructura de carpetas base
   - components/ui/, components/chat/, components/admin/, etc.
   - hooks/, lib/api/, types/
   - Tiempo: 30 minutos

4. Implementar providers
   - `SessionProvider` (NextAuth)
   - `ThemeProvider` (dark/light)
   - `Toaster` (notificaciones)
   - Archivo: `src/components/providers.tsx`
   - Tiempo: 1 hora

5. Crear layout base
   - Root layout (`app/layout.tsx`)
   - Dashboard layout (`app/dashboard/layout.tsx`) - con Sidebar + responsive
   - Archivo: `src/app/layout.tsx`, `src/app/dashboard/layout.tsx`
   - Tiempo: 1.5 horas

6. Implementar protección de rutas
   - Middleware para rutas protegidas
   - Redirección a login si no autenticado
   - Archivo: `src/middleware.ts`
   - Tiempo: 1 hora

**Criterios de Éxito**:
- [ ] shadcn/ui instalado completamente
- [ ] Tailwind funcionando (light/dark theme)
- [ ] Layout base responsive (mobile, tablet, desktop)
- [ ] Autenticación funcional en rutas protegidas
- [ ] TypeScript sin errores (`strict: true`)
- [ ] Build exitoso sin warnings

---

### TAREA 2: Dashboard Page (2 días)

**Objetivo**: Implementar dashboard con estadísticas, gráficos y overview

**URL**: `/dashboard`

**Componentes Necesarios**:

```typescript
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  // Stats Cards (3-4)
  // - Agentes disponibles (count)
  // - Conversaciones activas (count)
  // - Últimos 7 días uso (chart)
  // - Documentos en RAG (count)

  // Recent Chats (5-10 últimos)
  // Recent Documents (5 últimos)
  // Quick Actions (links a páginas principales)
}
```

**Subtareas**:

1. Crear componentes StatsCard
   - Props: title, value, icon, trend
   - Archivo: `src/components/dashboard/StatsCard.tsx`
   - Tiempo: 1 hora

2. Implementar useChat hook para estadísticas
   - Fetch de sesiones del usuario
   - Fetch de documentos
   - Archivo: `src/hooks/useChat.ts`
   - Tiempo: 1.5 horas

3. Crear RecentChats component
   - Mostrar últimas 5 conversaciones
   - Link a chat por ID
   - Archivo: `src/components/dashboard/RecentChats.tsx`
   - Tiempo: 1 hora

4. Crear RecentDocuments component
   - Mostrar últimos 5 documentos
   - Link a detalle del documento
   - Archivo: `src/components/dashboard/RecentDocuments.tsx`
   - Tiempo: 1 hora

5. Implementar charts (opcional con recharts)
   - Gráfico de uso por día (últimos 7 días)
   - Gráfico de agentes utilizados
   - Archivo: `src/components/dashboard/UsageChart.tsx`
   - Tiempo: 2 horas (opcional, puede ser simple)

6. Testing
   - Component tests para DashboardPage
   - Archivo: `src/__tests__/unit/dashboard.test.tsx`
   - Tiempo: 1 hora

**Archivos a Crear**:
- `src/app/dashboard/page.tsx` (50-100 líneas)
- `src/components/dashboard/StatsCard.tsx` (40 líneas)
- `src/components/dashboard/RecentChats.tsx` (80 líneas)
- `src/components/dashboard/RecentDocuments.tsx` (80 líneas)
- Tests (100+ líneas)

**Criterios de Éxito**:
- [ ] Stats cards muestran datos reales (desde API)
- [ ] Links navegación funcionan correctamente
- [ ] Responsive en mobile/tablet/desktop
- [ ] Loading states mientras se cargan datos
- [ ] Error handling si API falla
- [ ] Tests pasan >80% coverage

---

### TAREA 3: Chat Interface (3 días) ⭐ CRÍTICA

**Objetivo**: Implementar interfaz de chat con streaming en tiempo real

**URL**: `/dashboard/chat`

**Componentes Necesarios**:

```typescript
// src/app/dashboard/chat/page.tsx (Client Component)
export default function ChatPage() {
  return (
    <div className="flex h-screen">
      <ChatHistory />     {/* Sidebar izquierdo */}
      <ChatWindow />      {/* Centro - mensajes + input */}
      <RightSidebar />    {/* Derecho (opcional) - documentos adjuntos */}
    </div>
  );
}

// src/components/chat/ChatWindow.tsx
export function ChatWindow() {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
```

**Integración Backend**:
- Endpoint: `POST /api/v1/chat/send` (SSE streaming)
- Sessions: `GET /api/v1/chat/sessions`, `POST /api/v1/chat/sessions`
- History: `GET /api/v1/chat/history/[sessionId]`

**Subtareas**:

1. Crear hook useChat (CRÍTICO)
   - Manejo de streaming SSE
   - Envío de mensajes
   - Gestión de sesiones
   - Archivo: `src/hooks/useChat.ts`
   - Tiempo: 3 horas
   - Referencia: Vercel AI SDK `useChat()` hook

   ```typescript
   const { messages, isLoading, sendMessage } = useChat({
     api: '/api/v1/chat/send',
     onFinish: (message) => console.log('Done!'),
   });
   ```

2. Crear MessageList component
   - Mostrar array de mensajes
   - Avatar del usuario vs AI
   - Markdown rendering (optional)
   - Archivo: `src/components/chat/MessageList.tsx`
   - Tiempo: 1.5 horas

3. Crear MessageItem component
   - Mensaje individual
   - Avatar, timestamp, contenido
   - Copy button para AI responses
   - Archivo: `src/components/chat/MessageItem.tsx`
   - Tiempo: 1 hora

4. Crear ChatInput component
   - Text input con multiline
   - Botón send + disabled state
   - Archivo adjuntos (upload button)
   - Archivo: `src/components/chat/ChatInput.tsx`
   - Tiempo: 1.5 horas

5. Crear ChatHistory sidebar
   - Lista de sesiones del usuario
   - New conversation button
   - Delete session con confirmación
   - Archivo: `src/components/chat/ChatHistory.tsx`
   - Tiempo: 1.5 horas

6. Implementar ChatSession management
   - Crear nueva sesión
   - Cambiar sesión activa
   - Guardar en localStorage
   - Archivo: `src/hooks/useChatSession.ts`
   - Tiempo: 1.5 horas

7. Testing
   - useChat hook tests
   - MessageList tests
   - ChatInput tests
   - Archivo: `src/__tests__/unit/chat.test.tsx`
   - Tiempo: 2 horas

**Archivos a Crear**:
- `src/app/dashboard/chat/page.tsx` (50 líneas)
- `src/hooks/useChat.ts` (200+ líneas)
- `src/hooks/useChatSession.ts` (100 líneas)
- `src/components/chat/ChatWindow.tsx` (80 líneas)
- `src/components/chat/MessageList.tsx` (100 líneas)
- `src/components/chat/MessageItem.tsx` (120 líneas)
- `src/components/chat/ChatInput.tsx` (150 líneas)
- `src/components/chat/ChatHistory.tsx` (150 líneas)
- Tests (300+ líneas)

**Riesgos & Mitigaciones**:
- Riesgo: SSE streaming no funciona correctamente
  - Mitigación: Usar Vercel AI SDK (battle-tested)
- Riesgo: Performance con muchos mensajes
  - Mitigación: Virtualización de lista (react-window)

**Criterios de Éxito**:
- [ ] Streaming funciona en tiempo real
- [ ] Mensajes se guardan en BD
- [ ] Sesiones CRUD funcionan
- [ ] UI responsiva
- [ ] Loading states claros
- [ ] Error handling (retry, fallback)
- [ ] Tests >80% coverage

---

### TAREA 4: Document Management (2 días)

**Objetivo**: Implementar upload, list, delete de documentos para RAG

**URLs**:
- `/dashboard/documents` - List
- `/dashboard/documents/[id]` - Detail

**Componentes Necesarios**:

```typescript
// src/app/dashboard/documents/page.tsx
export default function DocumentsPage() {
  return (
    <div>
      <DocumentUploader />
      <DocumentList />
    </div>
  );
}
```

**Integración Backend**:
- Upload: `POST /api/v1/documents/upload`
- List: `GET /api/v1/documents`
- Delete: `DELETE /api/v1/documents/[id]`

**Subtareas**:

1. Crear FileUploader component
   - Drag & drop + file picker
   - Progress bar durante upload
   - Validación de file type/size
   - Archivo: `src/components/documents/FileUploader.tsx`
   - Tiempo: 1.5 horas

2. Crear DocumentList component
   - Tabla de documentos con columnas:
     - Nombre, tamaño, fecha de upload, status (ready/processing), acciones
   - Sorting, filtering, pagination
   - Archivo: `src/components/documents/DocumentList.tsx`
   - Tiempo: 2 horas

3. Crear DocumentCard component (opcional)
   - Card view alternativo
   - Thumbnail de preview
   - Archivo: `src/components/documents/DocumentCard.tsx`
   - Tiempo: 1 hora

4. Crear QuotaDisplay component
   - Mostrar uso de storage por tier
   - Progreso visual (progress bar)
   - Archivo: `src/components/documents/QuotaDisplay.tsx`
   - Tiempo: 1 hora

5. Implementar upload handler
   - FormData con archivo
   - Progress tracking
   - Error handling
   - Archivo: `src/lib/api/document-client.ts`
   - Tiempo: 1 hora

6. Testing
   - FileUploader tests
   - DocumentList tests
   - Archivo: `src/__tests__/unit/documents.test.tsx`
   - Tiempo: 1.5 horas

**Archivos a Crear**:
- `src/app/dashboard/documents/page.tsx` (50 líneas)
- `src/app/dashboard/documents/[id]/page.tsx` (60 líneas)
- `src/components/documents/FileUploader.tsx` (150 líneas)
- `src/components/documents/DocumentList.tsx` (200 líneas)
- `src/components/documents/DocumentCard.tsx` (100 líneas)
- `src/components/documents/QuotaDisplay.tsx` (80 líneas)
- `src/lib/api/document-client.ts` (80 líneas)
- Tests (200+ líneas)

**Criterios de Éxito**:
- [ ] Upload funciona completamente
- [ ] List muestra documentos con status
- [ ] Delete con confirmación
- [ ] Quota display correcto
- [ ] UI responsive
- [ ] Error handling (validación, network)
- [ ] Tests >70% coverage

---

### TAREA 5: Admin Panel (2 días)

**Objetivo**: Implementar panel de administración de usuarios y sistema

**URLs**:
- `/dashboard/admin` - Overview
- `/dashboard/admin/users` - User management
- `/dashboard/admin/settings` - Admin settings

**Componentes Necesarios**:

```typescript
// src/app/dashboard/admin/page.tsx
export default function AdminDashboard() {
  return (
    <div>
      <SystemMetrics />
      <UserOverview />
      <RecentActivity />
    </div>
  );
}
```

**Integración Backend**:
- Users: `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/[id]`, `DELETE /api/admin/users/[id]`
- Roles: `GET /api/admin/roles`
- Metrics: `GET /api/admin/metrics`

**Subtareas**:

1. Crear UserTable component
   - Tabla con columnas: Email, Role, Tier, Status, Created, Actions
   - Sorting, filtering, pagination
   - Inline edit role
   - Delete button con confirmación
   - Archivo: `src/components/admin/UserTable.tsx`
   - Tiempo: 2 horas

2. Crear UserForm component
   - Form para crear/editar usuario
   - Campos: email, role (select), tier (select), active (toggle)
   - Validación con Zod
   - Archivo: `src/components/admin/UserForm.tsx`
   - Tiempo: 1.5 horas

3. Crear RoleSelector component
   - Dropdown para seleccionar role
   - Opciones: user, admin, super_admin
   - Archivo: `src/components/admin/RoleSelector.tsx`
   - Tiempo: 45 minutos

4. Crear UserMetricsDialog component
   - Modal con métricas del usuario
   - Conversaciones, documentos, últimas 7 días
   - Archivo: `src/components/admin/UserMetricsDialog.tsx`
   - Tiempo: 1 hora

5. Crear SystemMetrics component
   - Overview: Total users, active users, total conversations, etc.
   - Archivo: `src/components/admin/SystemMetrics.tsx`
   - Tiempo: 1 hora

6. Implementar admin API client
   - Crud operations para usuarios
   - Archivo: `src/lib/api/admin-client.ts`
   - Tiempo: 1 hora

7. Testing
   - UserTable tests
   - UserForm tests
   - Archivo: `src/__tests__/unit/admin.test.tsx`
   - Tiempo: 1.5 horas

**Archivos a Crear**:
- `src/app/dashboard/admin/page.tsx` (60 líneas)
- `src/app/dashboard/admin/users/page.tsx` (50 líneas)
- `src/app/dashboard/admin/settings/page.tsx` (50 líneas)
- `src/components/admin/UserTable.tsx` (250 líneas)
- `src/components/admin/UserForm.tsx` (200 líneas)
- `src/components/admin/RoleSelector.tsx` (80 líneas)
- `src/components/admin/UserMetricsDialog.tsx` (120 líneas)
- `src/components/admin/SystemMetrics.tsx` (100 líneas)
- `src/lib/api/admin-client.ts` (100 líneas)
- Tests (250+ líneas)

**Criterios de Éxito**:
- [ ] CRUD de usuarios funcionando completamente
- [ ] Role assignment funciona correctamente
- [ ] Protección (solo admin puede acceder)
- [ ] Métricas se muestran correctamente
- [ ] UI responsive
- [ ] Tests >70% coverage

---

### TAREA 6: Support System (1 día)

**Objetivo**: Implementar sistema de tickets de soporte

**URLs**:
- `/dashboard/support` - List de tickets
- `/dashboard/support/[ticketId]` - Detail de ticket
- `/dashboard/support/new` - Create ticket

**Componentes Necesarios**:

```typescript
// src/app/dashboard/support/page.tsx
export default function SupportPage() {
  return (
    <div>
      <TicketList />
    </div>
  );
}
```

**Integración Backend**:
- Tickets: `GET /api/support/tickets`, `POST /api/support/tickets`, `PUT /api/support/tickets/[id]`
- Messages: `GET /api/support/tickets/[id]/messages`, `POST /api/support/tickets/[id]/messages`

**Subtareas**:

1. Crear TicketList component
   - Tabla/cards con tickets
   - Filtros por status (open, closed, in-progress)
   - Sorting por fecha
   - Archivo: `src/components/support/TicketList.tsx`
   - Tiempo: 1.5 horas

2. Crear TicketDetail component
   - Mostrar ticket info
   - MessageThread adjunto
   - Reply form
   - Archivo: `src/components/support/TicketDetail.tsx`
   - Tiempo: 1.5 horas

3. Crear MessageThread component
   - Lista de mensajes del ticket
   - Avatar de usuario/admin
   - Archivo: `src/components/support/MessageThread.tsx`
   - Tiempo: 1 hora

4. Crear CreateTicketForm component
   - Form para crear nuevo ticket
   - Campos: título, descripción, prioridad
   - Archivo: `src/components/support/CreateTicketForm.tsx`
   - Tiempo: 1 hora

5. Implementar support API client
   - Archivo: `src/lib/api/support-client.ts`
   - Tiempo: 45 minutos

6. Testing
   - TicketList tests
   - TicketDetail tests
   - Archivo: `src/__tests__/unit/support.test.tsx`
   - Tiempo: 1 hora

**Archivos a Crear**:
- `src/app/dashboard/support/page.tsx` (50 líneas)
- `src/app/dashboard/support/[ticketId]/page.tsx` (60 líneas)
- `src/app/dashboard/support/new/page.tsx` (40 líneas)
- `src/components/support/TicketList.tsx` (150 líneas)
- `src/components/support/TicketDetail.tsx` (120 líneas)
- `src/components/support/MessageThread.tsx` (100 líneas)
- `src/components/support/CreateTicketForm.tsx` (120 líneas)
- `src/lib/api/support-client.ts` (60 líneas)
- Tests (150+ líneas)

**Criterios de Éxito**:
- [ ] Create ticket funciona
- [ ] List muestra tickets correctamente
- [ ] Detail view + messages thread funcionan
- [ ] UI responsive
- [ ] Tests >70% coverage

---

### TAREA 7: Forms & Validation (1 día)

**Objetivo**: Setup react-hook-form + Zod para validación consistente

**Componentes**:

1. Crear form hooks reutilizables
   - `useForm` wrapper con Zod
   - Archivo: `src/hooks/useForm.ts`
   - Tiempo: 1 hora

2. Crear Zod schemas
   - Chat schemas
   - Document schemas
   - User schemas
   - Support schemas
   - Archivo: `src/lib/validation/schemas.ts`
   - Tiempo: 1.5 horas

3. Crear FormField wrapper component
   - Reutilizable con shadcn form
   - Error display
   - Archivo: `src/components/form/FormField.tsx`
   - Tiempo: 1 hora

4. Implementar forms existentes con validación
   - LoginForm
   - RegisterForm
   - SettingsForm
   - Archivo: `src/components/forms/`
   - Tiempo: 1.5 horas

5. Testing
   - Form validation tests
   - Schema tests
   - Archivo: `src/__tests__/unit/forms.test.tsx`
   - Tiempo: 1 hora

**Archivos a Crear**:
- `src/hooks/useForm.ts` (80 líneas)
- `src/lib/validation/schemas.ts` (300 líneas)
- `src/components/form/FormField.tsx` (60 líneas)
- `src/components/forms/LoginForm.tsx` (100 líneas)
- `src/components/forms/RegisterForm.tsx` (120 líneas)
- Tests (150+ líneas)

**Criterios de Éxito**:
- [ ] Validación funciona en todos los forms
- [ ] Error messages claros
- [ ] TypeScript inference correcto
- [ ] Tests >80% coverage

---

### TAREA 8: Testing & Refinement (1-2 días)

**Objetivo**: Testing completo, accesibilidad, responsive design

**Subtareas**:

1. Unit Tests (Vitest + React Testing Library)
   - Component tests para todos los componentes principales
   - Hook tests (useChat, useAuth, useFetch)
   - Coverage target: >70%
   - Tiempo: 1.5 horas

2. Integration Tests
   - Chat flow (create session → send message → display)
   - Document upload flow
   - Admin CRUD flow
   - Tiempo: 1.5 horas

3. E2E Tests (Playwright - opcional)
   - Login flow
   - Chat flow
   - Document upload flow
   - Tiempo: 2 horas (opcional)

4. Accessibility Audit (a11y)
   - ARIA labels en componentes
   - Keyboard navigation
   - Color contrast
   - Screen reader compatibility
   - Tools: axe, Lighthouse
   - Tiempo: 1.5 horas

5. Responsive Design Validation
   - Mobile (320px), Tablet (768px), Desktop (1024px+)
   - Test en DevTools + real devices
   - Fix CSS issues
   - Tiempo: 1 hora

6. Performance Optimization
   - Bundle size analysis
   - Code splitting
   - Lazy loading de componentes
   - Image optimization
   - Tiempo: 1 hora

7. Browser Compatibility
   - Chrome, Firefox, Safari, Edge
   - iOS Safari, Android Chrome
   - Tiempo: 1 hora

**Criterios de Éxito**:
- [ ] Unit test coverage >70%
- [ ] Integration tests pasando
- [ ] Accessibility score >90 (Lighthouse)
- [ ] Responsive design en todas las breakpoints
- [ ] Build exitoso sin warnings
- [ ] Performance: First Contentful Paint <1s

---

## 🧩 COMPONENTES REUTILIZABLES

### shadcn/ui Components

```typescript
// Ya incluidos en proyecto:
Button, Card, Input, Textarea, Dialog, Form, Select
Table, Tabs, Sheet, Badge, Avatar, Dropdown, Checkbox

// Uso típico:
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button onClick={() => {}}>Click me</Button>
  </CardContent>
</Card>
```

### Custom Components

**Navbar** (`src/components/navbar.tsx`)
- Logo + branding
- User menu (avatar + dropdown)
- Notifications (opcional)

**Sidebar** (`src/components/sidebar.tsx`)
- Navigation links (Dashboard, Chat, Documents, etc.)
- Active state indication
- Collapse toggle (mobile)
- User info + logout

**ErrorBoundary** (`src/components/error-boundary.tsx`)
- Catch React errors
- Fallback UI
- Error logging

**LoadingSpinner** (`src/components/loading-spinner.tsx`)
- Animated spinner
- Tamaños: sm, md, lg

**EmptyState** (`src/components/empty-state.tsx`)
- Illustration
- Message
- CTA button

---

## 🎨 PATRONES DE DISEÑO (RSC vs Client Components)

### Server Components (RSC)

Use para:
- Páginas que no necesitan interacción
- Datos que se cargan desde el servidor
- Código que debe ocurrir en servidor (DB queries)

Ejemplo - Dashboard page:

```typescript
// src/app/dashboard/page.tsx
import { getSessions } from '@/lib/db';

export default async function DashboardPage() {
  const sessions = await getSessions(); // ✅ Server-side

  return (
    <div>
      <h1>Dashboard</h1>
      <RecentChats sessions={sessions} /> {/* Client component */}
    </div>
  );
}
```

### Client Components

Use para:
- Interacción con usuario (clicks, inputs)
- Hooks (useState, useContext, useEffect)
- Event listeners

Ejemplo - Chat interface:

```typescript
// src/components/chat/ChatWindow.tsx
'use client';

import { useChat } from '@/hooks/useChat';

export function ChatWindow() {
  const { messages, isLoading, sendMessage } = useChat(); // ✅ Hooks

  return (
    <div>
      <MessageList messages={messages} />
      <ChatInput onSend={sendMessage} /> {/* onClick handler */}
    </div>
  );
}
```

### Server Actions (Opcional)

Para mutations que requieren autenticación:

```typescript
// src/app/actions.ts
'use server';

import { auth } from '@/lib/auth';

export async function deleteSession(sessionId: string) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  await db.chatSession.delete({ where: { id: sessionId } });
}

// En component:
<form action={deleteSession}>
  <input type="hidden" name="sessionId" value={sessionId} />
  <button type="submit">Delete</button>
</form>
```

---

## 🔗 INTEGRACIONES BACKEND

### API Client Wrapper

```typescript
// src/lib/api/client.ts
import { getSession } from 'next-auth/react';

type RequestInit = Omit<Parameters<typeof fetch>[1], 'headers'> & {
  headers?: Record<string, string>;
};

export async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.user?.accessToken && {
      'Authorization': `Bearer ${session.user.accessToken}`,
    }),
    ...options.headers,
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Uso:
const sessions = await apiCall<ChatSession[]>('/api/v1/chat/sessions');
```

### Endpoints Integration

| Feature | Endpoint | Method | Cliente |
|---------|----------|--------|---------|
| Chat Send | `/api/v1/chat/send` | POST | useChat hook |
| Sessions List | `/api/v1/chat/sessions` | GET | useFetch hook |
| Sessions Create | `/api/v1/chat/sessions` | POST | ChatHistory |
| Documents Upload | `/api/v1/documents/upload` | POST | FileUploader |
| Documents List | `/api/v1/documents` | GET | DocumentList |
| Documents Delete | `/api/v1/documents/[id]` | DELETE | DocumentCard |
| Users List | `/api/admin/users` | GET | UserTable |
| Users Create | `/api/admin/users` | POST | UserForm |
| Users Update | `/api/admin/users/[id]` | PUT | UserForm |
| Tickets List | `/api/support/tickets` | GET | TicketList |
| Tickets Create | `/api/support/tickets` | POST | CreateTicketForm |

---

## 🧪 TESTING STRATEGY

### Unit Tests (Vitest + React Testing Library)

```typescript
// src/__tests__/unit/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    screen.getByText('Click').click();
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Hook Tests

```typescript
// src/__tests__/unit/hooks/useChat.test.ts
import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';

describe('useChat Hook', () => {
  it('sends message successfully', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(1);
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/chat.test.tsx
describe('Chat Flow', () => {
  it('creates session and sends message', async () => {
    const { getByText, getByRole } = render(<ChatPage />);

    // Create session
    fireEvent.click(getByText('New Chat'));

    // Send message
    fireEvent.change(getByRole('textbox'), { target: { value: 'Hello' } });
    fireEvent.click(getByText('Send'));

    // Verify message appears
    await waitFor(() => {
      expect(getByText('Hello')).toBeInTheDocument();
    });
  });
});
```

### Coverage Target

```
Statements   : >70%
Branches     : >70%
Functions    : >70%
Lines        : >70%
```

---

## ✅ CRITERIOS DE FINALIZACIÓN

### Fase 6 Completada cuando:

- [ ] **Todas las páginas principales implementadas**
  - Dashboard ✅
  - Chat Interface ✅
  - Document Management ✅
  - Admin Panel ✅
  - Support System ✅
  - Settings ✅

- [ ] **shadcn/ui components integrados**
  - 15+ componentes utilizados
  - Personalización de tema (light/dark)
  - Responsive design en todos

- [ ] **Chat streaming funcional**
  - SSE streaming funciona
  - Mensajes se muestran en tiempo real
  - Sesiones CRUD funciona

- [ ] **Document upload funcional**
  - Upload con validación
  - List con sorting
  - Delete con confirmación

- [ ] **Admin panel funcional**
  - CRUD de usuarios
  - Role assignment
  - Métricas del sistema

- [ ] **Responsive Design**
  - Mobile: 320px - OK
  - Tablet: 768px - OK
  - Desktop: 1024px+ - OK

- [ ] **Accessibility (a11y)**
  - ARIA labels completos
  - Keyboard navigation funcional
  - Lighthouse accessibility >90

- [ ] **Zero Build Errors**
  - TypeScript: 0 errors
  - ESLint: 0 errors críticos
  - No warnings en build

- [ ] **Tests Pasando**
  - Unit tests: >70% coverage
  - Integration tests: critical paths covered
  - All tests passing

- [ ] **Performance**
  - First Contentful Paint: <1s
  - Largest Contentful Paint: <2.5s
  - Cumulative Layout Shift: <0.1

- [ ] **Documentación Actualizada**
  - README con instrucciones
  - Component library documented
  - API integration guide

- [ ] **Código Review Aprobado**
  - Code quality: A or B
  - Security check: ✅
  - Performance check: ✅

---

## ⚠️ RIESGOS Y MITIGACIÓN

### Riesgo 1: Chat Streaming No Funciona Correctamente

**Probabilidad**: Media
**Impacto**: Alto (feature crítica)

**Mitigación**:
- Usar Vercel AI SDK (battle-tested)
- Mock de SSE en tests
- Test early (primero que todo)
- Tener fallback a polling (si SSE falla)

---

### Riesgo 2: Responsive Design Inconsistente

**Probabilidad**: Media
**Impacto**: Medio (UX issue)

**Mitigación**:
- Tailwind breakpoints desde el inicio
- Test en múltiples devices reales
- DevTools responsive design mode
- Mobile-first approach

---

### Riesgo 3: Performance Degradation con Muchos Mensajes

**Probabilidad**: Baja
**Impacto**: Medio

**Mitigación**:
- Virtualización de MessageList (react-window)
- Paginación de mensajes
- Lazy loading de componentes

---

### Riesgo 4: Type Safety Issues con NextAuth

**Probabilidad**: Media
**Impacto**: Bajo (solo dev experience)

**Mitigación**:
- Usar types desde @auth/core
- Type guards para session
- Strict TypeScript mode

---

## 📅 CRONOGRAMA DETALLADO

### Semana 1: Setup + Dashboard + Chat (Days 1-5)

| Día | Especialista | Tarea | Duración | Status |
|-----|-------------|-------|----------|--------|
| **Day 1** | coder | Setup inicial (shadcn, Tailwind, layouts) | 1 día | ⏳ |
| **Day 2-3** | coder | Dashboard page | 2 días | ⏳ |
| **Day 3-5** | coder | Chat interface (CRÍTICA) | 3 días | ⏳ |
| **Paralelo** | tester | Preparar test setup, Vitest config | 1 día | ⏳ |

### Semana 2: Documents + Admin + Support (Days 6-10)

| Día | Especialista | Tarea | Duración | Status |
|-----|-------------|-------|----------|--------|
| **Day 6-7** | coder | Document Management | 2 días | ⏳ |
| **Day 7-8** | coder | Admin Panel | 2 días | ⏳ |
| **Day 9** | coder | Support System | 1 día | ⏳ |
| **Day 9** | coder | Forms + Validation | 1 día | ⏳ |
| **Paralelo** | tester | Unit tests para componentes | 2 días | ⏳ |

### Semana 3: Testing + Refinement (Days 11-14)

| Día | Especialista | Tarea | Duración | Status |
|-----|-------------|-------|----------|--------|
| **Day 10-11** | tester | Component tests + coverage | 2 días | ⏳ |
| **Day 11-12** | tester | Integration tests | 1.5 días | ⏳ |
| **Day 12** | ux-designer | a11y audit + responsive fixes | 1 día | ⏳ |
| **Day 13** | coder | Performance optimization | 1 día | ⏳ |
| **Day 14** | code-reviewer | Code review + final fixes | 1 día | ⏳ |
| **Day 14** | documenter | Documentation + CHANGELOG | 0.5 días | ⏳ |

---

## 📊 ESTIMACIÓN DE ESFUERZO TOTAL

| Tarea | Especialista | Horas | Días |
|-------|-------------|-------|------|
| Setup Inicial | coder | 8 | 1 |
| Dashboard | coder | 16 | 2 |
| Chat Interface | coder | 24 | 3 |
| Document Management | coder | 16 | 2 |
| Admin Panel | coder | 16 | 2 |
| Support System | coder | 8 | 1 |
| Forms + Validation | coder | 8 | 1 |
| **Subtotal Coder** | | **96** | **12** |
| Unit Tests | tester | 12 | 1.5 |
| Integration Tests | tester | 12 | 1.5 |
| a11y + Responsive | ux-designer + tester | 8 | 1 |
| **Subtotal Testing** | | **32** | **4** |
| Documentation | documenter | 4 | 0.5 |
| Code Review | code-reviewer | 8 | 1 |
| **Subtotal Other** | | **12** | **1.5** |
| **TOTAL** | | **140** | **17.5** |
| **Con buffer 20%** | | **168** | **21** |

### Timeline Realista

- **Developers paralelo**: 2 developers = 12 días
- **1 developer**: ~17-21 días (con buffer)
- **Estimado**: 10-14 días (en condiciones normales)

---

## 🎯 PRÓXIMOS PASOS (Después de Fase 6)

### Fase 7: Voice & Deployment

- OpenAI gpt-realtime integration
- DALL-E image generation
- Deployment a staging/production
- Performance optimization

### Consideraciones para Fase 7

- Frontend + Backend integración
- Voice input/output en Chat
- Image generation en Chat
- Real-time metrics dashboard
- Monitoring + logging

---

**Plan Maestro de Fase 6**
**Creado**: 2025-10-24
**Estado**: 🔵 LISTO PARA INICIAR
**Duración**: 10-14 días
**Especialistas**: coder (lead), ux-designer, tester, code-reviewer, documenter

Este documento es la referencia detallada para implementación de Fase 6. Actualizar cuando haya cambios significativos.
