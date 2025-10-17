# Admin Panel Module

## Descripción General

El panel de administración proporciona una interfaz centralizada para que SUPER_ADMIN y ADMIN gestionen usuarios, monitoreen métricas, administren tickets de soporte, revisen audit logs y analicen el uso general del sistema.

---

## Características Principales

- Dashboard con métricas generales del sistema
- Gestión completa de usuarios (CRUD)
- Sistema de invitaciones
- Administración de tickets de soporte
- Visualización de métricas de uso
- Audit logs con filtros avanzados
- Análisis de costos por usuario y global
- Gráficos y visualizaciones con Recharts
- Exportación de reportes
- Acceso restringido (solo SUPER_ADMIN y ADMIN)

---

## Acceso y Permisos

### Control de Acceso

```typescript
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

function isAdmin(userRole: UserRole): boolean {
  return ADMIN_ROLES.includes(userRole);
}

// Middleware en el panel de admin
export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!isAdmin(user.role)) {
    redirect("/dashboard");
  }

  return <div>{children}</div>;
}
```

### Diferencias entre SUPER_ADMIN y ADMIN

| Acción | SUPER_ADMIN | ADMIN |
|--------|-------------|-------|
| Ver usuarios | ✅ | ✅ |
| Crear usuarios | ✅ | ✅ |
| Editar usuarios | ✅ | ✅ |
| Eliminar usuarios | ✅ | ✅ |
| **Asignar SUPER_ADMIN** | ✅ | ❌ |
| **Cambiar rol ADMIN** | ✅ | ⚠️ (solo a roles menores) |
| **Acceso a audit logs sensibles** | ✅ | ⚠️ (limitado) |
| **Configuración del sistema** | ✅ | ❌ |
| **Planes custom** | ✅ | ❌ |

---

## Estructura de Rutas

```
/admin
├── /dashboard          # Dashboard principal
├── /users              # Gestión de usuarios
│   ├── /[userId]       # Detalle de usuario
│   └── /invitations    # Sistema de invitaciones
├── /support            # Gestión de tickets
│   ├── /[ticketId]     # Detalle de ticket
│   └── /metrics        # Métricas de soporte
├── /analytics          # Analíticas avanzadas
│   ├── /usage          # Uso del sistema
│   ├── /costs          # Análisis de costos
│   └── /agents         # Estadísticas de agentes
└── /audit-logs         # Registros de auditoría
```

---

## Dashboard Principal

### Métricas en Tiempo Real

**Ruta:** `/admin/dashboard`

```typescript
// GET /api/admin/dashboard/metrics
{
  "overview": {
    "totalUsers": 1523,
    "activeUsers": 1205,           // Activos en últimos 30 días
    "newUsersToday": 12,
    "newUsersThisWeek": 89,
    "newUsersThisMonth": 345,

    "totalAgents": 4523,
    "publicAgents": 523,
    "averageAgentsPerUser": 2.97,

    "totalMessages": 125000,
    "messagesThisMonth": 45000,
    "totalTokens": 5000000000,     // 5B tokens
    "tokensThisMonth": 1500000000,

    "totalCost": 125.50,
    "costThisMonth": 45.20,

    "openTickets": 45,
    "ticketsThisMonth": 156,
    "averageResolutionTime": 4.5,  // horas
    "ticketSatisfaction": 4.3       // de 5
  },
  "usersByTier": [
    { "tier": "FREE", "count": 1000 },
    { "tier": "BASIC", "count": 300 },
    { "tier": "PRO", "count": 180 },
    { "tier": "ENTERPRISE", "count": 35 },
    { "tier": "UNLIMITED", "count": 8 }
  ],
  "revenueProjection": {
    "monthly": 2500.00,
    "yearly": 30000.00
  },
  "systemHealth": {
    "status": "healthy",
    "uptime": 99.98,
    "avgResponseTime": 145,  // ms
    "errorRate": 0.02        // 0.02%
  }
}
```

### Interfaz del Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard                                        │
│─────────────────────────────────────────────────────────│
│  RESUMEN GENERAL                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 1,523        │ │ 45           │ │ 4,523        │   │
│  │ Usuarios     │ │ Tickets      │ │ Agentes      │   │
│  │ +12 hoy      │ │ Abiertos     │ │ +45 hoy      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 45K          │ │ 1.5B         │ │ $45.20       │   │
│  │ Mensajes     │ │ Tokens       │ │ Costo        │   │
│  │ Este mes     │ │ Este mes     │ │ Este mes     │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│─────────────────────────────────────────────────────────│
│  USO EN LOS ÚLTIMOS 30 DÍAS                            │
│  [Gráfico de líneas mostrando mensajes por día]        │
│─────────────────────────────────────────────────────────│
│  DISTRIBUCIÓN DE USUARIOS POR TIER                     │
│  [Gráfico de dona: FREE 66%, BASIC 20%, PRO 12%...]   │
│─────────────────────────────────────────────────────────│
│  ACTIVIDAD RECIENTE                                     │
│  ├─ 10:45 - Nuevo usuario: john@example.com (FREE)    │
│  ├─ 10:30 - Ticket cerrado: TICK-000234               │
│  ├─ 10:15 - Agente creado: "Code Helper" (public)     │
│  └─ 10:00 - Cambio de tier: jane@email (PRO → ENT)   │
└─────────────────────────────────────────────────────────┘
```

---

## Gestión de Usuarios

Ver documentación completa en [users.md](./users.md)

### Vista Rápida

**Ruta:** `/admin/users`

Funcionalidades principales:
- Lista paginada de usuarios con filtros
- Búsqueda por email/nombre
- Filtros por rol, tier, estado
- Acciones rápidas (editar, eliminar, cambiar rol)
- Ver métricas de uso individual
- Enviar invitaciones
- Exportar lista de usuarios

---

## Sistema de Invitaciones

### Panel de Invitaciones

**Ruta:** `/admin/users/invitations`

```
┌─────────────────────────────────────────────────────────┐
│  Invitaciones                          [+ Nueva Invitación]│
│─────────────────────────────────────────────────────────│
│  Filtros: [Todas ▼] [🔍 Buscar por email...]           │
│─────────────────────────────────────────────────────────│
│  Email           │ Rol   │ Estado   │ Enviada  │ Acciones│
│─────────────────────────────────────────────────────────│
│  new@email.com   │ USER  │ PENDING  │ Hace 2h  │ [✕][📧]│
│  john@email.com  │ ADMIN │ ACCEPTED │ Hace 1d  │ [✓]    │
│  old@email.com   │ USER  │ EXPIRED  │ Hace 8d  │ [🔄]   │
│─────────────────────────────────────────────────────────│
│  < Prev    1 2 3    Next >                              │
└─────────────────────────────────────────────────────────┘

Leyenda:
[✕] Cancelar invitación
[📧] Reenviar email
[✓] Aceptada
[🔄] Reenviar invitación expirada
```

### API de Invitaciones

```typescript
// GET /api/admin/invitations
{
  "invitations": [
    {
      "id": "uuid",
      "email": "new@email.com",
      "role": "USER",
      "status": "PENDING",
      "invitedBy": {
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "expiresAt": "2025-10-23T...",
      "createdAt": "2025-10-16T..."
    }
  ]
}

// POST /api/admin/invitations
// PATCH /api/admin/invitations/[id]/cancel
// POST /api/admin/invitations/[id]/resend
```

---

## Gestión de Tickets de Soporte

Ver documentación completa en [support.md](./support.md)

### Dashboard de Soporte

**Ruta:** `/admin/support`

```
┌─────────────────────────────────────────────────────────┐
│  Tickets de Soporte                                     │
│─────────────────────────────────────────────────────────│
│  MÉTRICAS RÁPIDAS                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ 45     │ │ 23     │ │ 12     │ │ 4.5h   │          │
│  │ Abiertos│ │ En prog│ │ Hoy    │ │ Res. avg│          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│─────────────────────────────────────────────────────────│
│  Filtros: [Estado ▼] [Categoría ▼] [Prioridad ▼]       │
│  [Solo mis asignados] [🔍 Buscar...]                    │
│─────────────────────────────────────────────────────────│
│  TICK-000234 │ Usuario       │ Error crítico  │ URGENTE │
│  BUG         │ john@email    │ Hace 15min     │ [Tomar] │
│─────────────────────────────────────────────────────────│
│  TICK-000233 │ Usuario       │ Pregunta API   │ MEDIA   │
│  QUESTION    │ jane@email    │ Hace 1h        │ [Tomar] │
│─────────────────────────────────────────────────────────│
│  TICK-000232 │ Usuario       │ Feature X      │ BAJA    │
│  FEATURE     │ bob@email     │ Hace 2h        │ [Tomar] │
│─────────────────────────────────────────────────────────│
│  [Ver métricas detalladas]                              │
└─────────────────────────────────────────────────────────┘
```

### Métricas de Soporte

**Ruta:** `/admin/support/metrics`

```typescript
// GET /api/admin/support/metrics
{
  "overview": {
    "totalTickets": 523,
    "openTickets": 45,
    "avgResolutionTime": 4.5,
    "aiResolutionRate": 0.35,
    "satisfactionRate": 4.2
  },
  "byCategory": [...],
  "byPriority": [...],
  "staffPerformance": [
    {
      "admin": {
        "name": "Admin User",
        "id": "uuid"
      },
      "ticketsResolved": 45,
      "avgResolutionTime": 3.2,
      "satisfactionRate": 4.5
    }
  ],
  "timeline": {
    "last30Days": [...]
  }
}
```

---

## Analytics Avanzados

### Análisis de Uso

**Ruta:** `/admin/analytics/usage`

```typescript
// GET /api/admin/analytics/usage
{
  "overview": {
    "totalMessages": 125000,
    "totalTokens": 5000000000,
    "totalCost": 125.50,
    "averageMessageLength": 150,    // caracteres
    "averageTokensPerMessage": 40
  },
  "topUsers": [
    {
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "tier": "ENTERPRISE"
      },
      "messages": 5230,
      "tokens": 250000000,
      "cost": 7.50
    }
  ],
  "topAgents": [
    {
      "agent": {
        "name": "Code Wizard",
        "slug": "code-wizard",
        "creator": "Admin"
      },
      "uses": 15230,
      "messages": 52000,
      "tokens": 2500000000
    }
  ],
  "peakHours": [
    { "hour": 9, "messages": 12500 },
    { "hour": 10, "messages": 15000 },
    { "hour": 14, "messages": 14200 }
  ],
  "dailyTrend": {
    "last30Days": [
      { "date": "2025-10-16", "messages": 4500, "tokens": 180000000 }
    ]
  }
}
```

### Visualizaciones

```
┌─────────────────────────────────────────────────────────┐
│  Análisis de Uso                                        │
│─────────────────────────────────────────────────────────│
│  MENSAJES POR DÍA (Últimos 30 días)                    │
│  [Gráfico de líneas con tendencia]                     │
│─────────────────────────────────────────────────────────│
│  HORAS PICO                                             │
│  [Gráfico de barras por hora del día]                  │
│─────────────────────────────────────────────────────────│
│  TOP 10 USUARIOS POR USO                                │
│  1. John Doe        │ 5,230 msgs │ 250M tokens │ $7.50 │
│  2. Jane Smith      │ 4,123 msgs │ 200M tokens │ $6.00 │
│  3. Bob Jones       │ 3,456 msgs │ 150M tokens │ $4.50 │
│─────────────────────────────────────────────────────────│
│  TOP 10 AGENTES MÁS USADOS                              │
│  1. Code Wizard     │ 15,230 usos │ 2.5B tokens        │
│  2. Writer Pro      │ 12,450 usos │ 2.1B tokens        │
│  3. Task Master     │ 10,123 usos │ 1.8B tokens        │
└─────────────────────────────────────────────────────────┘
```

### Análisis de Costos

**Ruta:** `/admin/analytics/costs`

```typescript
// GET /api/admin/analytics/costs
{
  "overview": {
    "totalCost": 125.50,
    "costThisMonth": 45.20,
    "projectedMonthly": 48.50,
    "costPerUser": 0.082,          // $0.082 per user
    "costPerMessage": 0.0010,      // $0.001 per message
    "costPerToken": 0.000000025    // $0.000025 per 1K tokens
  },
  "byModel": [
    {
      "model": "gemini-2.0-flash-exp",
      "messages": 125000,
      "tokens": 5000000000,
      "cost": 125.50,
      "percentage": 100
    }
  ],
  "byTier": [
    {
      "tier": "FREE",
      "users": 1000,
      "cost": 5.25,
      "avgCostPerUser": 0.00525
    },
    {
      "tier": "ENTERPRISE",
      "users": 35,
      "cost": 75.00,
      "avgCostPerUser": 2.14
    }
  ],
  "topCostUsers": [
    {
      "user": {
        "name": "Enterprise User",
        "tier": "ENTERPRISE"
      },
      "cost": 12.50,
      "messages": 12500,
      "tokens": 500000000
    }
  ],
  "costTrend": {
    "last12Months": [
      { "month": "2024-11", "cost": 35.20 },
      { "month": "2024-12", "cost": 42.50 }
    ]
  }
}
```

---

## Audit Logs

### Visor de Logs

**Ruta:** `/admin/audit-logs`

```
┌─────────────────────────────────────────────────────────┐
│  Audit Logs                                             │
│─────────────────────────────────────────────────────────│
│  Filtros:                                               │
│  [Acción ▼] [Admin ▼] [Fecha: Últimos 7 días ▼]        │
│  [🔍 Buscar...]                                         │
│─────────────────────────────────────────────────────────│
│  Timestamp      │ Admin      │ Acción       │ Detalles │
│─────────────────────────────────────────────────────────│
│  16/10 10:45    │ Admin User │ CHANGE_ROLE  │ [Ver]    │
│                 │            │ john@email   │          │
│─────────────────────────────────────────────────────────│
│  16/10 10:30    │ Super Admin│ DELETE_USER  │ [Ver]    │
│                 │            │ old@email    │          │
│─────────────────────────────────────────────────────────│
│  16/10 10:15    │ Admin User │ SEND_INVITE  │ [Ver]    │
│                 │            │ new@email    │          │
│─────────────────────────────────────────────────────────│
│  < Prev    1 2 3 4 5    Next >                          │
└─────────────────────────────────────────────────────────┘
```

### Detalle de Audit Log

```
┌─────────────────────────────────────────────────────────┐
│  Audit Log Details                              [✕]     │
│─────────────────────────────────────────────────────────│
│  ID: f47ac10b-58cc-4372-a567-0e02b2c3d479              │
│  Timestamp: 2025-10-16 10:45:23 UTC                    │
│─────────────────────────────────────────────────────────│
│  ADMIN                                                  │
│  Name: Admin User                                       │
│  Email: admin@example.com                               │
│  IP Address: 192.168.1.100                              │
│─────────────────────────────────────────────────────────│
│  ACCIÓN: CHANGE_ROLE                                    │
│─────────────────────────────────────────────────────────│
│  TARGET                                                 │
│  User: John Doe (john@example.com)                      │
│─────────────────────────────────────────────────────────│
│  DETALLES                                               │
│  {                                                      │
│    "oldRole": "USER",                                   │
│    "newRole": "ADMIN",                                  │
│    "reason": "Promoted to admin for support tasks"      │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

### API de Audit Logs

```typescript
// GET /api/admin/audit-logs
{
  "logs": [
    {
      "id": "uuid",
      "timestamp": "2025-10-16T10:45:23Z",
      "admin": {
        "id": "admin-uuid",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "action": "CHANGE_ROLE",
      "targetId": "user-uuid",
      "targetType": "user",
      "details": {
        "oldRole": "USER",
        "newRole": "ADMIN",
        "reason": "Promoted to admin"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "total": 523,
    "page": 1,
    "limit": 20
  }
}
```

---

## Exportación de Reportes

### Tipos de Reportes

```typescript
enum ReportType {
  USERS = "users",
  USAGE = "usage",
  COSTS = "costs",
  TICKETS = "tickets",
  AUDIT_LOGS = "audit_logs",
}

// POST /api/admin/reports/generate
{
  "reportType": "users",
  "format": "csv",  // csv, json, xlsx
  "filters": {
    "dateFrom": "2025-10-01",
    "dateTo": "2025-10-16",
    "tier": "PRO"
  }
}

// Response
{
  "success": true,
  "downloadUrl": "/api/admin/reports/download/uuid",
  "expiresAt": "2025-10-17T..."
}
```

---

## Archivos Clave

```
src/
└── app/
    └── (protected)/
        └── admin/
            ├── layout.tsx                 # Auth check admin
            ├── page.tsx                   # Dashboard
            ├── dashboard/
            │   └── page.tsx
            ├── users/
            │   ├── page.tsx               # Lista usuarios
            │   ├── [userId]/
            │   │   └── page.tsx           # Detalle usuario
            │   └── invitations/
            │       └── page.tsx           # Invitaciones
            ├── support/
            │   ├── page.tsx               # Lista tickets
            │   ├── [ticketId]/
            │   │   └── page.tsx           # Chat ticket
            │   └── metrics/
            │       └── page.tsx           # Dashboard soporte
            ├── analytics/
            │   ├── usage/
            │   │   └── page.tsx           # Análisis de uso
            │   ├── costs/
            │   │   └── page.tsx           # Análisis de costos
            │   └── agents/
            │       └── page.tsx           # Stats de agentes
            └── audit-logs/
                └── page.tsx               # Audit logs
```

---

## Componentes Reutilizables

```typescript
// Componentes UI del admin panel
src/components/admin/
├── DashboardCard.tsx              # Card de métrica
├── UserTable.tsx                  # Tabla de usuarios
├── TicketList.tsx                 # Lista de tickets
├── UsageChart.tsx                 # Gráfico de uso
├── CostAnalysis.tsx               # Análisis de costos
├── AuditLogViewer.tsx             # Visor de logs
├── InvitationManager.tsx          # Gestor de invitaciones
├── MetricCard.tsx                 # Card de métrica simple
└── ExportButton.tsx               # Botón de exportación
```

---

## Estado del Módulo

### Implementado ✅

- ✅ Dashboard principal con métricas
- ✅ Gestión de usuarios
- ✅ Sistema de invitaciones
- ✅ Gestión de tickets
- ✅ Audit logs básicos
- ✅ Control de acceso por rol

### En Desarrollo 🚧

- 🚧 Analytics avanzados
- 🚧 Gráficos interactivos (Recharts)
- 🚧 Exportación de reportes
- 🚧 Dashboard de costos detallado

### Pendiente 📋

- 📋 Configuración del sistema
- 📋 Gestión de planes de suscripción
- 📋 Sistema de notificaciones admin
- 📋 Dashboard en tiempo real (WebSocket)
- 📋 Alertas automáticas (uso excesivo, errores)
- 📋 Bulk operations (acciones masivas)
- 📋 Scheduled reports (reportes automáticos)
- 📋 API rate limiting configuration
- 📋 Feature flags management

---

**Última actualización:** 2025-10-16
**Estado:** Producción (funcionalidad core), En desarrollo (analytics avanzados)
**Mantenido por:** cjhirashi@gmail.com
