# Especificación de Endpoints de API - cjhirashi-agents MVP

**Versión:** 1.0
**Fecha:** 2025-10-22
**Estado:** FASE DE DISEÑO
**Versión API:** v1
**URL Base:** `https://cjhirashi-agents.vercel.app/api/v1`

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Principios de Diseño](#principios-de-diseño)
3. [Convenciones de Nomenclatura](#convenciones-de-nomenclatura)
4. [Versionado de API](#versionado-de-api)
5. [Autenticación](#autenticación)
6. [Endpoints por Categoría](#endpoints-por-categoría)
   - [Autenticación (6 endpoints)](#categoría-autenticación)
   - [Chat (6 endpoints)](#categoría-chat)
   - [Agentes (5 endpoints)](#categoría-agentes)
   - [Documentos RAG (4 endpoints)](#categoría-documentos-rag)
   - [Artefactos (4 endpoints)](#categoría-artefactos)
   - [Usuarios y Configuración (5 endpoints)](#categoría-usuarios-y-configuración)
   - [Administración (4 endpoints)](#categoría-administración)
   - [Soporte (3 endpoints)](#categoría-soporte)
   - [Integraciones MCP (4 endpoints)](#categoría-integraciones-mcp)
   - [Almacenamiento (5 endpoints)](#categoría-almacenamiento)
   - [Sistema de Salud (6 endpoints)](#categoría-sistema-de-salud)
   - [Sistema Financiero (6 endpoints)](#categoría-sistema-financiero)
7. [Rate Limiting](#rate-limiting)
8. [Paginación](#paginación)
9. [Filtrado y Ordenamiento](#filtrado-y-ordenamiento)
10. [Estrategia de Versionado](#estrategia-de-versionado)

---

## Introducción

Este documento especifica todos los endpoints HTTP para la API del MVP de cjhirashi-agents. La API sigue principios RESTful y está diseñada para:

- **Chat multi-LLM** con soporte de streaming
- **Búsqueda semántica habilitada por RAG**
- **Gestión de artefactos** (código, diagramas, imágenes)
- **Integraciones MCP** (Gmail, Calendar, Notion)
- **Arquitectura multi-tenant** con RBAC
- **Chat en tiempo real** mediante Server-Sent Events (SSE)

### Características Clave

- **Seguridad de Tipos:** Todos los endpoints tienen tipos TypeScript
- **Validación:** Esquemas Zod para validación de solicitudes/respuestas
- **Manejo de Errores:** Formato de error consistente en todos los endpoints
- **Rate Limiting:** Cuotas basadas en tier
- **Autenticación:** JWT + OAuth 2.0
- **Monitoreo:** Logging estructurado para todas las operaciones

---

## Principios de Diseño

### 1. Modelado de Recursos RESTful

```
Recurso:       /api/v1/chat/sessions
Colección:     GET    /api/v1/chat/sessions          (listar)
Elemento:      GET    /api/v1/chat/sessions/{id}     (detalle)
Crear:         POST   /api/v1/chat/sessions          (crear)
Actualizar:    PATCH  /api/v1/chat/sessions/{id}     (actualizar)
Eliminar:      DELETE /api/v1/chat/sessions/{id}     (eliminar)
```

### 2. Métodos HTTP

- **GET:** Solo lectura, idempotente, cacheable
- **POST:** Crear recurso, no idempotente
- **PATCH:** Actualización parcial, idempotente
- **PUT:** Reemplazo completo (raramente usado)
- **DELETE:** Eliminar recurso, idempotente

### 3. Formatos de Respuesta

**Éxito (200-299):**
```json
{
  "data": { /* recurso o array */ },
  "meta": {
    "timestamp": "2025-10-22T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

**Error (400-599):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El email es requerido",
    "statusCode": 400,
    "timestamp": "2025-10-22T10:30:00Z",
    "requestId": "req-abc123",
    "details": {
      "field": "email",
      "reason": "missing"
    }
  }
}
```

### 4. Seguridad en Primer Lugar

- **Todos los endpoints requieren autenticación** (excepto `/auth/*`)
- **Validación RBAC** en cada ruta protegida
- **Rate limiting** basado en tier
- **Validación de entrada** con Zod
- **Prevención de inyección SQL** mediante Prisma ORM

---

## Convenciones de Nomenclatura

### Estructura de URL

```
/api/{version}/{resource}/{id}/{sub-resource}
```

**Ejemplos:**
```
/api/v1/chat/sessions
/api/v1/chat/sessions/{sessionId}
/api/v1/chat/sessions/{sessionId}/messages
/api/v1/agents/{agentId}/enable
```

### Nombres de Recursos

- **Sustantivos plurales** para colecciones: `/agents`, `/sessions`, `/users`
- **Minúsculas** con guiones: `/rag-documents`, `/mcp-integrations`
- **Jerárquicos** para recursos anidados: `/sessions/{id}/messages`

### Parámetros de Query

- **Paginación:** `?limit=20&offset=0`
- **Ordenamiento:** `?sortBy=createdAt&order=desc`
- **Filtrado:** `?status=active&tier=pro`
- **Búsqueda:** `?search=keyword`

---

## Versionado de API

**Estrategia:** Versionado basado en URL

- **v1:** Lanzamiento inicial del MVP
- **v2:** Cambios incompatibles (futuro)

**Ruta de Migración:**
- Advertencias de deprecación 3 meses antes de remoción
- Header Sunset: `Sunset: Sat, 31 Dec 2025 23:59:59 GMT`

**Ejemplo:**
```
GET /api/v1/agents          (actual)
GET /api/v2/agents          (futuro)
```

---

## Autenticación

Todos los endpoints (excepto `/auth/*`) requieren autenticación con Bearer token.

**Header:**
```http
Authorization: Bearer {JWT_TOKEN}
```

**Payload JWT:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "USER",
  "tier": "PRO",
  "iat": 1634567890,
  "exp": 1634654290
}
```

**Tiempo de Vida del Token:**
- Access token: 15 minutos
- Refresh token: 7 días

---

## Endpoints por Categoría

## Categoría: Autenticación

### POST /api/v1/auth/register

**Descripción:** Registrar una nueva cuenta de usuario

**Autenticación:** No requerida

**Cuerpo de Solicitud:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Validación:**
- `email`: Formato de email válido, único
- `password`: Mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
- `name`: Mín 2 caracteres, máx 255

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "meta": {
    "timestamp": "2025-10-22T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

**Respuesta 400 (Error de Validación):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La contraseña no cumple los requisitos",
    "statusCode": 400,
    "details": {
      "field": "password",
      "reason": "missing_uppercase"
    }
  }
}
```

**Respuesta 409 (Conflicto):**
```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "El email ya está registrado",
    "statusCode": 409
  }
}
```

**Rate Limit:** 5 solicitudes por 15 minutos por IP

---

### POST /api/v1/auth/signin

**Descripción:** Iniciar sesión con email y contraseña

**Autenticación:** No requerida

**Cuerpo de Solicitud:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "tier": "PRO",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Respuesta 401 (Credenciales Inválidas):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email o contraseña incorrectos",
    "statusCode": 401
  }
}
```

**Rate Limit:** 10 solicitudes por 15 minutos por IP

---

### POST /api/v1/auth/refresh

**Descripción:** Refrescar access token usando refresh token

**Autenticación:** Refresh token en header Authorization

**Headers:**
```http
Authorization: Bearer {REFRESH_TOKEN}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Respuesta 401 (Token Inválido):**
```json
{
  "error": {
    "code": "TOKEN_INVALID",
    "message": "El refresh token es inválido o ha expirado",
    "statusCode": 401
  }
}
```

---

### POST /api/v1/auth/logout

**Descripción:** Cerrar sesión e invalidar tokens

**Autenticación:** Bearer token requerido

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Sesión cerrada exitosamente"
  }
}
```

---

### GET /api/v1/auth/me

**Descripción:** Obtener perfil del usuario autenticado actual

**Autenticación:** Bearer token requerido

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "tier": "PRO",
    "avatar": "https://blob.vercel.com/avatar.jpg",
    "createdAt": "2025-01-15T10:00:00Z",
    "subscriptionEnd": "2026-01-15T10:00:00Z"
  }
}
```

**Respuesta 401 (No Autorizado):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "El token de autenticación falta o es inválido",
    "statusCode": 401
  }
}
```

---

### POST /api/v1/auth/oauth/{provider}

**Descripción:** Autenticación OAuth con proveedor de terceros

**Autenticación:** No requerida

**Parámetros de Path:**
- `provider`: google | github | microsoft

**Cuerpo de Solicitud:**
```json
{
  "code": "oauth_authorization_code",
  "redirectUri": "https://cjhirashi-agents.vercel.app/auth/callback"
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@gmail.com",
    "name": "John Doe",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": false
  }
}
```

**Respuesta 400 (Código Inválido):**
```json
{
  "error": {
    "code": "OAUTH_ERROR",
    "message": "Código de autorización inválido",
    "statusCode": 400
  }
}
```

---

## Categoría: Chat

### POST /api/v1/chat/sessions

**Descripción:** Crear una nueva sesión de chat

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "title": "Project Planning Discussion",
  "agentIds": ["agent-uuid-1", "agent-uuid-2"]
}
```

**Validación:**
- `title`: Opcional, máx 500 caracteres
- `agentIds`: Array opcional de UUIDs

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "session-uuid",
    "title": "Project Planning Discussion",
    "userId": "user-uuid",
    "agentIds": ["agent-uuid-1", "agent-uuid-2"],
    "startedAt": "2025-10-22T10:30:00Z",
    "lastActivity": "2025-10-22T10:30:00Z"
  }
}
```

**Respuesta 400 (Agente Inválido):**
```json
{
  "error": {
    "code": "INVALID_AGENT",
    "message": "Agente no encontrado o no accesible",
    "statusCode": 400,
    "details": {
      "agentId": "agent-uuid-1"
    }
  }
}
```

**Rate Limit:** 100 solicitudes por hora por usuario

---

### GET /api/v1/chat/sessions

**Descripción:** Listar sesiones de chat del usuario

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)
- `sortBy`: Campo de ordenamiento (createdAt | lastActivity, default: lastActivity)
- `order`: Orden (asc | desc, default: desc)

**Solicitud:**
```http
GET /api/v1/chat/sessions?limit=20&offset=0&sortBy=lastActivity&order=desc
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "sessions": [
      {
        "id": "session-uuid-1",
        "title": "Project Planning",
        "messageCount": 45,
        "lastMessage": "Let's schedule for tomorrow",
        "lastActivity": "2025-10-22T10:30:00Z",
        "createdAt": "2025-10-20T08:00:00Z"
      },
      {
        "id": "session-uuid-2",
        "title": "Code Review",
        "messageCount": 12,
        "lastMessage": "LGTM, approved",
        "lastActivity": "2025-10-21T15:00:00Z",
        "createdAt": "2025-10-21T14:00:00Z"
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### GET /api/v1/chat/sessions/{sessionId}

**Descripción:** Obtener sesión de chat detallada con mensajes

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `sessionId`: UUID de la sesión de chat

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "session-uuid",
    "title": "Project Planning",
    "userId": "user-uuid",
    "startedAt": "2025-10-20T08:00:00Z",
    "lastActivity": "2025-10-22T10:30:00Z",
    "messages": [
      {
        "id": "msg-uuid-1",
        "role": "user",
        "content": "What's the timeline for MVP?",
        "timestamp": "2025-10-20T08:00:00Z"
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "Based on the roadmap, MVP is estimated for 4-6 weeks...",
        "timestamp": "2025-10-20T08:00:15Z",
        "agentId": "agent-planner-uuid",
        "tokensUsed": 250
      }
    ],
    "messageCount": 45,
    "totalTokens": 12500
  }
}
```

**Respuesta 404 (No Encontrado):**
```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Sesión de chat no encontrada",
    "statusCode": 404
  }
}
```

**Respuesta 403 (Prohibido):**
```json
{
  "error": {
    "code": "RESOURCE_NOT_OWNED",
    "message": "No tienes acceso a esta sesión",
    "statusCode": 403
  }
}
```

---

### POST /api/v1/chat/send

**Descripción:** Enviar mensaje a sesión de chat (respuesta streaming SSE)

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "sessionId": "session-uuid",
  "message": "Explain the RAG architecture",
  "selectedAgents": ["agent-architect-uuid"],
  "ragEnabled": true,
  "temperature": 0.7,
  "maxTokens": 4096
}
```

**Validación:**
- `sessionId`: UUID válido, el usuario debe ser dueño de la sesión
- `message`: Requerido, mín 1 carácter, máx 10000 caracteres
- `selectedAgents`: Array opcional, máx 3 agentes
- `ragEnabled`: Boolean, default true
- `temperature`: 0.0 a 2.0, default 0.7
- `maxTokens`: 1 a 8192, default 4096

**Respuesta 200 (Stream SSE):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: start
data: {"messageId":"msg-uuid","timestamp":"2025-10-22T10:30:00Z"}

event: chunk
data: {"content":"RAG stands for","delta":"RAG stands for"}

event: chunk
data: {"content":"RAG stands for Retrieval","delta":" Retrieval"}

event: chunk
data: {"content":"RAG stands for Retrieval Augmented Generation...","delta":" Augmented Generation..."}

event: done
data: {"messageId":"msg-uuid","tokensUsed":250,"completedAt":"2025-10-22T10:30:15Z"}
```

**Respuesta 400 (Error de Validación):**
```json
{
  "error": {
    "code": "MESSAGE_TOO_LONG",
    "message": "El mensaje excede la longitud máxima de 10000 caracteres",
    "statusCode": 400,
    "details": {
      "currentLength": 15000,
      "maxLength": 10000
    }
  }
}
```

**Respuesta 429 (Rate Limit Excedido):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Has excedido tu cuota mensual de mensajes",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "used": 100,
      "resetAt": "2025-11-01T00:00:00Z"
    }
  }
}
```

**Rate Limit:**
- FREE: 100 mensajes/mes
- CORE: Ilimitado
- PRO: Ilimitado
- Streams concurrentes: máx 3 por usuario

---

### GET /api/v1/chat/history/{sessionId}

**Descripción:** Obtener historial de mensajes paginado para una sesión

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `sessionId`: UUID de la sesión de chat

**Parámetros de Query:**
- `limit`: Número de mensajes (default: 50, máx: 200)
- `offset`: Offset de paginación (default: 0)
- `before`: Timestamp para paginación basada en cursor

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "messages": [
      {
        "id": "msg-uuid-1",
        "role": "user",
        "content": "Explain RAG",
        "timestamp": "2025-10-22T10:30:00Z"
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "RAG stands for...",
        "timestamp": "2025-10-22T10:30:15Z",
        "agentId": "agent-uuid",
        "tokensUsed": 250
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### DELETE /api/v1/chat/sessions/{sessionId}

**Descripción:** Eliminar una sesión de chat (soft delete)

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `sessionId`: UUID de la sesión de chat

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Sesión de chat eliminada exitosamente"
  }
}
```

**Respuesta 404 (No Encontrado):**
```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Sesión de chat no encontrada",
    "statusCode": 404
  }
}
```

---

## Categoría: Agentes

### GET /api/v1/agents

**Descripción:** Listar agentes disponibles

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `category`: Filtrar por categoría (opcional)
- `search`: Buscar por nombre/descripción (opcional)
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)

**Solicitud:**
```http
GET /api/v1/agents?category=coding&search=python&limit=20
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "agents": [
      {
        "id": "agent-uuid-1",
        "name": "Python Expert",
        "slug": "python-expert",
        "description": "Especializado en desarrollo Python y mejores prácticas",
        "category": "coding",
        "model": "claude-3-5-sonnet-20241022",
        "capabilities": ["code_execution", "debugging", "testing"],
        "isPublic": true,
        "isActive": true,
        "totalUses": 1250,
        "averageRating": 4.8,
        "createdBy": "system"
      },
      {
        "id": "agent-uuid-2",
        "name": "Code Reviewer",
        "slug": "code-reviewer",
        "description": "Revisa código para calidad, seguridad y mejores prácticas",
        "category": "coding",
        "model": "gpt-4",
        "capabilities": ["code_review", "security_scan"],
        "isPublic": true,
        "isActive": true,
        "totalUses": 890,
        "averageRating": 4.6,
        "createdBy": "user-uuid"
      }
    ],
    "pagination": {
      "total": 47,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### GET /api/v1/agents/{agentId}

**Descripción:** Obtener información detallada de un agente

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `agentId`: UUID del agente

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "agent-uuid",
    "name": "Python Expert",
    "slug": "python-expert",
    "description": "Especializado en desarrollo Python",
    "category": "coding",
    "model": "claude-3-5-sonnet-20241022",
    "config": {
      "temperature": 0.7,
      "maxTokens": 4096,
      "systemPrompt": "You are an expert Python developer..."
    },
    "capabilities": ["code_execution", "debugging", "testing"],
    "isPublic": true,
    "isActive": true,
    "totalUses": 1250,
    "totalMessages": 5670,
    "averageRating": 4.8,
    "documentationUrl": "https://docs.example.com/agents/python-expert",
    "tutorialUrl": "https://docs.example.com/tutorials/python-expert",
    "createdBy": "system",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-10-15T10:00:00Z"
  }
}
```

**Respuesta 404 (No Encontrado):**
```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agente no encontrado",
    "statusCode": 404
  }
}
```

---

### POST /api/v1/agents/{agentId}/enable

**Descripción:** Habilitar agente para el usuario actual

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `agentId`: UUID del agente

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Agente habilitado exitosamente",
    "agentId": "agent-uuid",
    "enabledAt": "2025-10-22T10:30:00Z"
  }
}
```

**Respuesta 403 (Límite de Tier):**
```json
{
  "error": {
    "code": "TIER_LIMIT_EXCEEDED",
    "message": "Tu tier permite solo 1 agente. Actualiza para habilitar más.",
    "statusCode": 403,
    "details": {
      "currentTier": "FREE",
      "allowedAgents": 1,
      "enabledAgents": 1
    }
  }
}
```

---

### DELETE /api/v1/agents/{agentId}/disable

**Descripción:** Deshabilitar agente para el usuario actual

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `agentId`: UUID del agente

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Agente deshabilitado exitosamente"
  }
}
```

---

### GET /api/v1/agents/{agentId}/usage

**Descripción:** Obtener estadísticas de uso de un agente

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `agentId`: UUID del agente

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "agentId": "agent-uuid",
    "usageCount": 145,
    "lastUsed": "2025-10-22T09:00:00Z",
    "totalTokens": 125000,
    "totalCost": 2.45,
    "averageLatency": 1250,
    "usageByDay": [
      {
        "date": "2025-10-22",
        "messages": 15,
        "tokens": 5000,
        "cost": 0.10
      }
    ]
  }
}
```

---

### POST /api/v1/agents/{agentId}/execute

**Descripción:** Ejecutar un Custom Agent con SSE streaming (Task 0 - Agent System Foundation)

**Autenticación:** Bearer token requerido

**RBAC:** requireAuth + requireOwnership (solo el creador puede ejecutar, excepto ADMIN/SUPER_ADMIN)

**Rate Limiting:**
- FREE: 10 requests/min
- PRO: 50 requests/min
- ENTERPRISE: 500 requests/min

**Parámetros de Path:**
- `agentId`: UUID del Custom Agent

**Solicitud:**
```json
{
  "message": "Revisa este código React para problemas de performance",
  "temperature": 0.7,
  "maxTokens": 4096,
  "timeout": 30,
  "stream": true
}
```

**Campos de Solicitud:**

| Campo | Tipo | Requerido | Rango/Validación | Default | Descripción |
|-------|------|-----------|------------------|---------|-------------|
| `message` | string | ✅ | 1-10000 chars | - | Mensaje del usuario al agente |
| `temperature` | number | ❌ | 0-2 | 0.7 | Creatividad (0=determinístico, 2=muy creativo) |
| `maxTokens` | number | ❌ | 1-8192 | 4096 | Máximo de tokens a generar |
| `timeout` | number | ❌ | 5-60 | 30 | Timeout en segundos (MVP limit: 60s) |
| `stream` | boolean | ❌ | true/false | true | Habilitar SSE streaming |

**Respuesta:** Server-Sent Events (SSE) stream

**Content-Type:** `text/event-stream`

**Headers Adicionales:**
```http
Cache-Control: no-cache
Connection: keep-alive
```

**Eventos SSE:**

#### 1. Event: `start`
```json
{
  "executionId": "exec-clx123abc",
  "agentId": "agent-clx456def",
  "agentName": "Code Review Assistant",
  "modelId": "claude-3-5-sonnet-20241022",
  "timestamp": "2025-10-26T12:34:56.789Z"
}
```

#### 2. Event: `chunk` (múltiples)
```json
{
  "content": "Este componente React tiene varios problemas de performance:\n\n1. Re-renders innecesarios...",
  "delta": "1. Re-renders innecesarios..."
}
```

#### 3. Event: `done`
```json
{
  "executionId": "exec-clx123abc",
  "tokensUsed": 1500,
  "promptTokens": 1000,
  "completionTokens": 500,
  "cost": 0.0105,
  "duration": 3200,
  "completedAt": "2025-10-26T12:34:59.989Z"
}
```

#### 4. Event: `error` (si ocurre error)
```json
{
  "error": "Agent execution timed out after 30 seconds",
  "code": "EXECUTION_TIMEOUT",
  "executionId": "exec-clx123abc"
}
```

**Ejemplo de consumo (JavaScript):**
```javascript
const response = await fetch(`/api/v1/agents/${agentId}/execute`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    message: 'Hello, agent!',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 30
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      const eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (eventType === 'chunk') {
        console.log('Delta:', data.delta);
      } else if (eventType === 'done') {
        console.log('Cost:', data.cost, 'USD');
        console.log('Duration:', data.duration, 'ms');
      }
    }
  }
}
```

**Errores Posibles:**

**400 - Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "statusCode": 400,
    "timestamp": "2025-10-26T12:34:56.789Z",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "path": ["message"],
        "message": "Message cannot be empty"
      }
    ]
  }
}
```

**401 - Unauthorized:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "statusCode": 401,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**403 - Forbidden (No Owner):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to execute this agent",
    "statusCode": 403,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**403 - Insufficient Tier:**
```json
{
  "error": {
    "code": "INSUFFICIENT_TIER",
    "message": "Agent requires PRO tier or higher",
    "statusCode": 403,
    "timestamp": "2025-10-26T12:34:56.789Z",
    "details": {
      "requiredTier": "PRO",
      "userTier": "FREE"
    }
  }
}
```

**404 - Agent Not Found:**
```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent not found",
    "statusCode": 404,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**408 - Execution Timeout:**
```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Agent execution timed out after 30 seconds",
    "statusCode": 408,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**429 - Rate Limit Exceeded:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "statusCode": 429,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**500 - Execution Error:**
```json
{
  "error": {
    "code": "EXECUTION_ERROR",
    "message": "Agent execution failed",
    "statusCode": 500,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**500 - Service Configuration Error:**
```json
{
  "error": {
    "code": "SERVICE_CONFIG_ERROR",
    "message": "AI service configuration error",
    "statusCode": 500,
    "timestamp": "2025-10-26T12:34:56.789Z"
  }
}
```

**Notas Técnicas:**

1. **Timeout Handling**: Implementado con AbortController, cancela la request LLM inmediatamente
2. **Cost Tracking**: Calculado en tiempo real basado en tokens (Claude 3.5 Sonnet: $3/1M input, $15/1M output)
3. **LLM Router Integration**: Selecciona modelo automáticamente si `agent.modelId` no especificado
4. **Tier Validation**: Valida jerarquía FREE < BASIC < PRO < ENTERPRISE < CUSTOM < UNLIMITED
5. **Ownership**: Solo el creador puede ejecutar, excepto roles ADMIN/SUPER_ADMIN que tienen bypass
6. **Rate Limiting**: Endpoint `agents:execute` con límites por tier

**Referencias:**
- User Guide: [sys-docs/guides/CUSTOM-AGENTS.md](../guides/CUSTOM-AGENTS.md)
- Architecture: [ADR-010: Custom Agent Execution](../architecture/ADR-010-custom-agent-execution.md)
- Implementation: `src/app/api/v1/agents/[agentId]/execute/route.ts`
- Executor: `src/lib/agents/executor.ts`
- Validation: `src/lib/validations/agent.ts`
- Tests: `src/__tests__/unit/executor.test.ts`, `src/__tests__/integration/agent-execute.test.ts`

**Implementado:** 2025-10-26 (Task 0 - Agent System Foundation)

---

## Categoría: Documentos RAG

### POST /api/v1/rag/documents

**Descripción:** Subir documento para indexación RAG

**Autenticación:** Bearer token requerido

**Solicitud:** multipart/form-data
```
Content-Type: multipart/form-data

file: [binary file data]
title: "Project Requirements Document"
description: "MVP requirements for cjhirashi-agents"
tags: ["requirements", "mvp", "planning"]
```

**Tipos de Archivo Soportados:**
- PDF (.pdf)
- Texto (.txt)
- Markdown (.md)
- Word (.docx)
- JSON (.json)
- CSV (.csv)

**Límites de Tamaño de Archivo:**
- FREE: 10 MB por archivo
- CORE: 50 MB por archivo
- PRO: 100 MB por archivo

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "doc-uuid",
    "fileName": "requirements.pdf",
    "title": "Project Requirements Document",
    "description": "MVP requirements for cjhirashi-agents",
    "mimeType": "application/pdf",
    "size": 2457600,
    "tags": ["requirements", "mvp", "planning"],
    "indexed": false,
    "uploadedAt": "2025-10-22T10:30:00Z",
    "indexingStatus": "pending"
  }
}
```

**Respuesta 400 (Tipo de Archivo No Soportado):**
```json
{
  "error": {
    "code": "UNSUPPORTED_FILE_TYPE",
    "message": "Tipo de archivo no soportado para indexación",
    "statusCode": 400,
    "details": {
      "allowedTypes": ["pdf", "txt", "md", "docx", "json", "csv"]
    }
  }
}
```

**Respuesta 413 (Archivo Demasiado Grande):**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "El archivo excede el tamaño máximo para tu tier",
    "statusCode": 413,
    "details": {
      "fileSize": 52428800,
      "maxSize": 10485760,
      "tier": "FREE"
    }
  }
}
```

---

### GET /api/v1/rag/documents

**Descripción:** Listar documentos RAG del usuario

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)
- `search`: Buscar por título/descripción (opcional)
- `tags`: Filtrar por tags (separados por comas, opcional)

**Solicitud:**
```http
GET /api/v1/rag/documents?limit=20&search=requirements&tags=mvp,planning
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "documents": [
      {
        "id": "doc-uuid-1",
        "fileName": "requirements.pdf",
        "title": "Project Requirements",
        "size": 2457600,
        "indexed": true,
        "chunkCount": 45,
        "uploadedAt": "2025-10-20T08:00:00Z"
      },
      {
        "id": "doc-uuid-2",
        "fileName": "architecture.md",
        "title": "System Architecture",
        "size": 156000,
        "indexed": true,
        "chunkCount": 12,
        "uploadedAt": "2025-10-21T14:00:00Z"
      }
    ],
    "pagination": {
      "total": 67,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### POST /api/v1/rag/search

**Descripción:** Búsqueda semántica en documentos RAG

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "query": "What are the requirements for authentication?",
  "topK": 5,
  "threshold": 0.7,
  "documentIds": ["doc-uuid-1", "doc-uuid-2"]
}
```

**Validación:**
- `query`: Requerido, mín 3 caracteres, máx 500 caracteres
- `topK`: 1 a 20, default 5
- `threshold`: 0.0 a 1.0, default 0.7
- `documentIds`: Array opcional de UUIDs

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "results": [
      {
        "documentId": "doc-uuid-1",
        "documentTitle": "Requirements Document",
        "score": 0.92,
        "snippet": "Authentication must support OAuth 2.0 with Google, GitHub...",
        "chunkId": "chunk-uuid-1",
        "metadata": {
          "page": 5,
          "section": "Authentication Requirements"
        }
      },
      {
        "documentId": "doc-uuid-1",
        "documentTitle": "Requirements Document",
        "score": 0.85,
        "snippet": "JWT tokens with 15-minute expiration for access tokens...",
        "chunkId": "chunk-uuid-2",
        "metadata": {
          "page": 6,
          "section": "Token Management"
        }
      }
    ],
    "queryTime": 345,
    "totalResults": 5
  }
}
```

**Respuesta 400 (Query Inválido):**
```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "El query debe tener al menos 3 caracteres",
    "statusCode": 400
  }
}
```

---

### DELETE /api/v1/rag/documents/{documentId}

**Descripción:** Eliminar documento RAG y sus embeddings

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `documentId`: UUID del documento

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Documento y embeddings eliminados exitosamente",
    "documentId": "doc-uuid",
    "vectorsDeleted": 45
  }
}
```

**Respuesta 404 (No Encontrado):**
```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento no encontrado",
    "statusCode": 404
  }
}
```

---

## Categoría: Artefactos

### GET /api/v1/artifacts

**Descripción:** Listar artefactos del usuario

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)
- `type`: Filtrar por tipo (CODE | JSON | HTML | MARKDOWN | DIAGRAM | IMAGE)
- `sortBy`: createdAt | updatedAt (default: createdAt)
- `order`: asc | desc (default: desc)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "artifacts": [
      {
        "id": "artifact-uuid-1",
        "name": "UserService.ts",
        "type": "CODE",
        "agentId": "agent-coder-uuid",
        "conversationId": "conv-uuid",
        "version": 3,
        "isPublic": false,
        "createdAt": "2025-10-22T10:00:00Z",
        "updatedAt": "2025-10-22T11:30:00Z"
      },
      {
        "id": "artifact-uuid-2",
        "name": "Architecture Diagram",
        "type": "DIAGRAM",
        "agentId": "agent-architect-uuid",
        "version": 1,
        "isPublic": true,
        "shareToken": "share-abc123",
        "createdAt": "2025-10-21T15:00:00Z"
      }
    ],
    "pagination": {
      "total": 234,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### GET /api/v1/artifacts/{artifactId}

**Descripción:** Obtener detalles y contenido del artefacto

**Autenticación:** Bearer token requerido (o shareToken válido para artefactos públicos)

**Parámetros de Path:**
- `artifactId`: UUID del artefacto

**Parámetros de Query:**
- `shareToken`: Token de compartir para acceso público (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "artifact-uuid",
    "name": "UserService.ts",
    "type": "CODE",
    "content": "export class UserService {\n  async getUser(id: string) {...}\n}",
    "metadata": {
      "language": "typescript",
      "lineCount": 45,
      "dependencies": ["prisma", "zod"]
    },
    "version": 3,
    "parentId": "artifact-uuid-parent",
    "agentId": "agent-coder-uuid",
    "userId": "user-uuid",
    "conversationId": "conv-uuid",
    "isPublic": false,
    "createdAt": "2025-10-22T10:00:00Z",
    "updatedAt": "2025-10-22T11:30:00Z"
  }
}
```

**Respuesta 404 (No Encontrado):**
```json
{
  "error": {
    "code": "ARTIFACT_NOT_FOUND",
    "message": "Artefacto no encontrado",
    "statusCode": 404
  }
}
```

---

### DELETE /api/v1/artifacts/{artifactId}

**Descripción:** Eliminar artefacto

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `artifactId`: UUID del artefacto

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Artefacto eliminado exitosamente"
  }
}
```

---

### POST /api/v1/artifacts/{artifactId}/export

**Descripción:** Exportar artefacto a formato específico

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `artifactId`: UUID del artefacto

**Parámetros de Query:**
- `format`: json | markdown | pdf | html (default: json)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "content": "# UserService\n\n```typescript\nexport class UserService {...}\n```",
    "mimeType": "text/markdown",
    "fileName": "UserService.md",
    "downloadUrl": "https://blob.vercel.com/exports/UserService.md"
  }
}
```

---

## Categoría: Usuarios y Configuración

### GET /api/v1/users/profile

**Descripción:** Obtener perfil del usuario actual

**Autenticación:** Bearer token requerido

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "displayName": "John",
    "avatar": "https://blob.vercel.com/avatar.jpg",
    "role": "USER",
    "tier": "PRO",
    "timezone": "America/Mexico_City",
    "language": "es",
    "subscriptionStart": "2025-01-01T00:00:00Z",
    "subscriptionEnd": "2026-01-01T00:00:00Z",
    "usage": {
      "monthlyMessages": 450,
      "monthlyTokens": 125000,
      "storageUsed": 2457600000
    },
    "quotas": {
      "maxMessages": -1,
      "maxTokens": -1,
      "maxStorage": 53687091200
    },
    "createdAt": "2024-06-15T10:00:00Z"
  }
}
```

---

### PATCH /api/v1/users/profile

**Descripción:** Actualizar perfil de usuario

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "name": "John Smith",
  "displayName": "Johnny",
  "timezone": "America/Los_Angeles",
  "language": "en"
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Smith",
    "displayName": "Johnny",
    "timezone": "America/Los_Angeles",
    "language": "en",
    "updatedAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### PATCH /api/v1/users/settings

**Descripción:** Actualizar configuración de usuario

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "theme": "dark",
  "defaultModel": "claude-3-5-sonnet-20241022",
  "temperature": 0.8,
  "maxTokens": 8192,
  "ragEnabled": true,
  "ragTopK": 10,
  "emailNotifications": true,
  "pushNotifications": false
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Configuración actualizada exitosamente"
  }
}
```

---

### POST /api/v1/users/change-password

**Descripción:** Cambiar contraseña de usuario

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```

**Validación:**
- `currentPassword`: Debe coincidir con la contraseña actual
- `newPassword`: Mín 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Contraseña cambiada exitosamente"
  }
}
```

**Respuesta 401 (Contraseña Actual Inválida):**
```json
{
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "La contraseña actual es incorrecta",
    "statusCode": 401
  }
}
```

---

### GET /api/v1/users/usage

**Descripción:** Obtener estadísticas detalladas de uso

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `startDate`: Fecha ISO (opcional)
- `endDate`: Fecha ISO (opcional)
- `groupBy`: day | week | month (default: day)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "period": {
      "start": "2025-10-01T00:00:00Z",
      "end": "2025-10-31T23:59:59Z"
    },
    "totals": {
      "messages": 450,
      "tokens": 125000,
      "cost": 2.45,
      "imagesGenerated": 25,
      "storageUsed": 2457600000
    },
    "byDay": [
      {
        "date": "2025-10-22",
        "messages": 15,
        "tokens": 5000,
        "cost": 0.10
      }
    ],
    "byAgent": [
      {
        "agentId": "agent-uuid-1",
        "agentName": "Python Expert",
        "messages": 150,
        "tokens": 45000,
        "cost": 0.90
      }
    ],
    "quotas": {
      "messagesLimit": -1,
      "messagesUsed": 450,
      "messagesRemaining": "unlimited",
      "storageLimit": 53687091200,
      "storageUsed": 2457600000,
      "storageRemaining": 51229491200
    }
  }
}
```

---

## Categoría: Administración

### GET /api/v1/admin/users

**Descripción:** Listar todos los usuarios (solo admin)

**Autenticación:** Bearer token requerido (rol ADMIN o SUPER_ADMIN)

**Parámetros de Query:**
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)
- `role`: Filtrar por rol (opcional)
- `tier`: Filtrar por tier (opcional)
- `status`: active | inactive (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "users": [
      {
        "id": "user-uuid-1",
        "email": "user1@example.com",
        "name": "John Doe",
        "role": "USER",
        "tier": "PRO",
        "isActive": true,
        "lastInteraction": "2025-10-22T09:00:00Z",
        "usage": {
          "monthlyMessages": 450,
          "monthlyTokens": 125000,
          "monthlyCost": 2.45
        },
        "createdAt": "2024-06-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Respuesta 403 (Prohibido):**
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Se requiere rol de administrador",
    "statusCode": 403
  }
}
```

---

### PATCH /api/v1/admin/users/{userId}/tier

**Descripción:** Cambiar tier de suscripción del usuario (solo admin)

**Autenticación:** Bearer token requerido (rol SUPER_ADMIN)

**Parámetros de Path:**
- `userId`: UUID del usuario

**Cuerpo de Solicitud:**
```json
{
  "tier": "PRO",
  "reason": "Manual upgrade for beta tester"
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "userId": "user-uuid",
    "oldTier": "FREE",
    "newTier": "PRO",
    "changedBy": "admin-uuid",
    "changedAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### DELETE /api/v1/admin/users/{userId}

**Descripción:** Suspender cuenta de usuario (solo admin)

**Autenticación:** Bearer token requerido (rol SUPER_ADMIN)

**Parámetros de Path:**
- `userId`: UUID del usuario

**Cuerpo de Solicitud:**
```json
{
  "reason": "Terms of service violation",
  "notifyUser": true
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Cuenta de usuario suspendida",
    "userId": "user-uuid",
    "suspendedAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### GET /api/v1/admin/metrics

**Descripción:** Obtener métricas del sistema (solo admin)

**Autenticación:** Bearer token requerido (rol ADMIN o SUPER_ADMIN)

**Parámetros de Query:**
- `startDate`: Fecha ISO (opcional)
- `endDate`: Fecha ISO (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "period": {
      "start": "2025-10-01T00:00:00Z",
      "end": "2025-10-31T23:59:59Z"
    },
    "users": {
      "total": 1250,
      "active24h": 345,
      "byTier": {
        "FREE": 850,
        "CORE": 250,
        "PRO": 150
      }
    },
    "usage": {
      "totalMessages": 125000,
      "totalTokens": 45000000,
      "totalCost": 925.50,
      "totalRevenue": 6450.00,
      "profitMargin": 0.856
    },
    "performance": {
      "avgLatency": 1250,
      "p95Latency": 2500,
      "errorRate": 0.0012,
      "uptime": 0.998
    }
  }
}
```

---

## Categoría: Soporte

### POST /api/v1/support/tickets

**Descripción:** Crear ticket de soporte

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "title": "Chat endpoint returning 500 error",
  "description": "When sending messages longer than 5000 chars, the endpoint fails...",
  "category": "BUG",
  "priority": "HIGH",
  "metadata": {
    "browser": "Chrome 118",
    "os": "Windows 11",
    "errorStack": "..."
  }
}
```

**Validación:**
- `title`: Requerido, mín 10 caracteres, máx 500 caracteres
- `description`: Requerido, mín 20 caracteres, máx 5000 caracteres
- `category`: BUG | FEATURE | QUESTION | ACCOUNT | BILLING | PERFORMANCE | OTHER
- `priority`: LOW | MEDIUM | HIGH | URGENT (default: MEDIUM)

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "ticket-uuid",
    "ticketNumber": "TICK-000123",
    "title": "Chat endpoint returning 500 error",
    "category": "BUG",
    "priority": "HIGH",
    "status": "OPEN",
    "userId": "user-uuid",
    "aiSuggestion": "This appears to be a message length validation issue. Try...",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### GET /api/v1/support/tickets

**Descripción:** Listar tickets de soporte del usuario

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)
- `status`: OPEN | IN_PROGRESS | WAITING_USER | RESOLVED | CLOSED (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "tickets": [
      {
        "id": "ticket-uuid-1",
        "ticketNumber": "TICK-000123",
        "title": "Chat endpoint error",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "createdAt": "2025-10-22T10:30:00Z",
        "updatedAt": "2025-10-22T11:00:00Z"
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

### PATCH /api/v1/support/tickets/{ticketId}

**Descripción:** Actualizar ticket de soporte

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `ticketId`: UUID del ticket

**Cuerpo de Solicitud:**
```json
{
  "status": "WAITING_USER",
  "message": "I tried the suggested fix and it worked. Thanks!"
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "ticket-uuid",
    "ticketNumber": "TICK-000123",
    "status": "WAITING_USER",
    "updatedAt": "2025-10-22T11:30:00Z"
  }
}
```

---

## Categoría: Integraciones MCP

### POST /api/v1/mcp/integrations/{provider}

**Descripción:** Conectar integración MCP (Gmail, Calendar, Notion)

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `provider`: gmail | calendar | notion | slack | github

**Cuerpo de Solicitud:**
```json
{
  "authCode": "oauth_authorization_code",
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "integration-uuid",
    "provider": "gmail",
    "userId": "user-uuid",
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
    "isActive": true,
    "providerUserId": "user@gmail.com",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

**Respuesta 400 (Código de Autorización Inválido):**
```json
{
  "error": {
    "code": "OAUTH_ERROR",
    "message": "Código de autorización inválido o expirado",
    "statusCode": 400
  }
}
```

---

### GET /api/v1/mcp/integrations

**Descripción:** Listar integraciones MCP del usuario

**Autenticación:** Bearer token requerido

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "integrations": [
      {
        "id": "integration-uuid-1",
        "provider": "gmail",
        "isActive": true,
        "lastSync": "2025-10-22T10:00:00Z",
        "providerUserId": "user@gmail.com",
        "createdAt": "2025-10-15T08:00:00Z"
      },
      {
        "id": "integration-uuid-2",
        "provider": "calendar",
        "isActive": true,
        "lastSync": "2025-10-22T09:30:00Z",
        "providerUserId": "user@gmail.com",
        "createdAt": "2025-10-16T14:00:00Z"
      }
    ]
  }
}
```

---

### DELETE /api/v1/mcp/integrations/{integrationId}

**Descripción:** Desconectar integración MCP

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `integrationId`: UUID de la integración

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Integración desconectada y tokens revocados",
    "integrationId": "integration-uuid"
  }
}
```

---

### POST /api/v1/mcp/sync/{integrationId}

**Descripción:** Disparar sincronización manual para integración

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `integrationId`: UUID de la integración

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "itemsSynced": 45,
    "lastSync": "2025-10-22T10:30:00Z",
    "status": "SUCCESS"
  }
}
```

**Respuesta 429 (Rate Limit):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Sincronización manual limitada a una vez por hora",
    "statusCode": 429,
    "details": {
      "lastSync": "2025-10-22T10:00:00Z",
      "nextAvailableSync": "2025-10-22T11:00:00Z"
    }
  }
}
```

---

## Categoría: Almacenamiento

### POST /api/v1/storage/upload

**Descripción:** Subir archivo a almacenamiento Vercel Blob

**Autenticación:** Bearer token requerido

**Solicitud:** multipart/form-data
```
Content-Type: multipart/form-data

file: [binary file data]
folderId: "folder-uuid"
usageContext: "ARTIFACT"
```

**Límites de Tamaño de Archivo:**
- FREE: 10 MB por archivo, 500 MB total
- CORE: 50 MB por archivo, 5 GB total
- PRO: 100 MB por archivo, 50 GB total

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "file-uuid",
    "filename": "report.pdf",
    "originalName": "Q4 Report.pdf",
    "mimeType": "application/pdf",
    "size": 2457600,
    "storagePath": "https://blob.vercel.com/files/...",
    "usageContext": "ARTIFACT",
    "uploadedAt": "2025-10-22T10:30:00Z"
  }
}
```

**Respuesta 413 (Archivo Demasiado Grande):**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "El archivo excede el tamaño máximo para tu tier",
    "statusCode": 413,
    "details": {
      "fileSize": 52428800,
      "maxSize": 10485760,
      "tier": "FREE"
    }
  }
}
```

**Respuesta 507 (Cuota de Almacenamiento Excedida):**
```json
{
  "error": {
    "code": "STORAGE_QUOTA_EXCEEDED",
    "message": "Cuota de almacenamiento excedida",
    "statusCode": 507,
    "details": {
      "used": 524288000,
      "limit": 524288000,
      "tier": "FREE"
    }
  }
}
```

---

### GET /api/v1/storage/files

**Descripción:** Listar archivos almacenados del usuario

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `limit`: Número de resultados (default: 20, máx: 100)
- `offset`: Offset de paginación (default: 0)
- `folderId`: Filtrar por carpeta (opcional)
- `usageContext`: Filtrar por contexto (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "files": [
      {
        "id": "file-uuid-1",
        "filename": "report.pdf",
        "size": 2457600,
        "mimeType": "application/pdf",
        "usageContext": "ARTIFACT",
        "uploadedAt": "2025-10-22T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 89,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### GET /api/v1/storage/files/{fileId}

**Descripción:** Obtener URL de descarga del archivo

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `fileId`: UUID del archivo

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "file-uuid",
    "filename": "report.pdf",
    "downloadUrl": "https://blob.vercel.com/files/...",
    "expiresAt": "2025-10-22T11:30:00Z"
  }
}
```

---

### DELETE /api/v1/storage/files/{fileId}

**Descripción:** Eliminar archivo del almacenamiento

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `fileId`: UUID del archivo

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "success": true,
    "message": "Archivo eliminado exitosamente",
    "fileId": "file-uuid",
    "sizeFreed": 2457600
  }
}
```

---

### POST /api/v1/storage/files/{fileId}/share

**Descripción:** Crear enlace compartible para archivo

**Autenticación:** Bearer token requerido

**Parámetros de Path:**
- `fileId`: UUID del archivo

**Cuerpo de Solicitud:**
```json
{
  "expiresIn": 86400,
  "password": "optional-password",
  "allowDownload": true
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "shareToken": "share-abc123",
    "shareUrl": "https://cjhirashi-agents.vercel.app/share/share-abc123",
    "expiresAt": "2025-10-23T10:30:00Z"
  }
}
```

---

## Categoría: Sistema de Salud

### POST /api/v1/health/profile

**Descripción:** Crear o actualizar perfil de salud

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "bloodType": "O+",
  "height": 175,
  "weight": 75,
  "sex": "male",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phone": "+1234567890"
    }
  ]
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "profile-uuid",
    "userId": "user-uuid",
    "bloodType": "O+",
    "height": 175,
    "weight": 75,
    "sex": "male",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### POST /api/v1/health/medications

**Descripción:** Agregar medicamento al perfil de salud

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "name": "Lisinopril",
  "genericName": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "route": "oral",
  "prescribedBy": "Dr. Smith",
  "startDate": "2025-01-01",
  "reminderEnabled": true,
  "reminderTimes": ["08:00"]
}
```

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "medication-uuid",
    "name": "Lisinopril",
    "dosage": "10mg",
    "frequency": "Once daily",
    "isActive": true,
    "reminderEnabled": true,
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### GET /api/v1/health/medications

**Descripción:** Listar medicamentos del usuario

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `isActive`: true | false (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "medications": [
      {
        "id": "medication-uuid-1",
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "isActive": true,
        "nextDose": "2025-10-23T08:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/v1/health/appointments

**Descripción:** Programar cita médica

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "type": "General Checkup",
  "specialty": "General Practice",
  "doctorName": "Dr. Smith",
  "facility": "City Hospital",
  "scheduledDate": "2025-11-15T10:00:00Z",
  "duration": 30,
  "reason": "Annual physical"
}
```

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "appointment-uuid",
    "type": "General Checkup",
    "scheduledDate": "2025-11-15T10:00:00Z",
    "status": "programada",
    "reminderSent": false,
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### GET /api/v1/health/appointments

**Descripción:** Listar citas médicas

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `status`: programada | completada | cancelada (opcional)
- `startDate`: Fecha ISO (opcional)
- `endDate`: Fecha ISO (opcional)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "appointments": [
      {
        "id": "appointment-uuid-1",
        "type": "General Checkup",
        "scheduledDate": "2025-11-15T10:00:00Z",
        "doctorName": "Dr. Smith",
        "status": "programada"
      }
    ]
  }
}
```

---

### POST /api/v1/health/measurements

**Descripción:** Registrar medición de salud

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "type": "blood_pressure",
  "value": {
    "systolic": 120,
    "diastolic": 80
  },
  "measuredAt": "2025-10-22T08:00:00Z",
  "notes": "Morning reading"
}
```

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "measurement-uuid",
    "type": "blood_pressure",
    "value": {
      "systolic": 120,
      "diastolic": 80
    },
    "measuredAt": "2025-10-22T08:00:00Z",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

## Categoría: Sistema Financiero

### POST /api/v1/finance/profile

**Descripción:** Crear o actualizar perfil financiero

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "currency": "MXN",
  "fiscalYear": "calendar",
  "financialGoals": {
    "savingsTarget": 100000,
    "debtReduction": 50000
  }
}
```

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "id": "profile-uuid",
    "userId": "user-uuid",
    "currency": "MXN",
    "fiscalYear": "calendar",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### POST /api/v1/finance/accounts

**Descripción:** Agregar cuenta financiera

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "name": "Checking Account",
  "type": "checking",
  "institution": "BBVA Mexico",
  "balance": 25000.50,
  "currency": "MXN"
}
```

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "account-uuid",
    "name": "Checking Account",
    "type": "checking",
    "balance": 25000.50,
    "currency": "MXN",
    "isActive": true,
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### POST /api/v1/finance/transactions

**Descripción:** Agregar transacción financiera

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "accountId": "account-uuid",
  "date": "2025-10-22",
  "description": "Grocery shopping",
  "amount": -450.00,
  "type": "expense",
  "category": "Food & Dining",
  "subcategory": "Groceries"
}
```

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "transaction-uuid",
    "accountId": "account-uuid",
    "date": "2025-10-22",
    "description": "Grocery shopping",
    "amount": -450.00,
    "type": "expense",
    "category": "Food & Dining",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### GET /api/v1/finance/transactions

**Descripción:** Listar transacciones financieras

**Autenticación:** Bearer token requerido

**Parámetros de Query:**
- `accountId`: Filtrar por cuenta (opcional)
- `type`: income | expense | transfer (opcional)
- `category`: Filtrar por categoría (opcional)
- `startDate`: Fecha ISO (opcional)
- `endDate`: Fecha ISO (opcional)
- `limit`: Número de resultados (default: 50, máx: 200)
- `offset`: Offset de paginación (default: 0)

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "transactions": [
      {
        "id": "transaction-uuid-1",
        "date": "2025-10-22",
        "description": "Grocery shopping",
        "amount": -450.00,
        "type": "expense",
        "category": "Food & Dining"
      }
    ],
    "summary": {
      "totalIncome": 15000.00,
      "totalExpenses": 8500.00,
      "netBalance": 6500.00
    },
    "pagination": {
      "total": 234,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### POST /api/v1/finance/budgets

**Descripción:** Crear presupuesto para categoría

**Autenticación:** Bearer token requerido

**Cuerpo de Solicitud:**
```json
{
  "name": "Monthly Groceries",
  "category": "Food & Dining",
  "amount": 5000.00,
  "period": "monthly",
  "startDate": "2025-10-01",
  "alertThreshold": 80
}
```

**Respuesta 201 (Creado):**
```json
{
  "data": {
    "id": "budget-uuid",
    "name": "Monthly Groceries",
    "category": "Food & Dining",
    "amount": 5000.00,
    "period": "monthly",
    "currentSpending": 0.00,
    "percentUsed": 0,
    "isActive": true,
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

---

### GET /api/v1/finance/budgets

**Descripción:** Listar presupuestos con gastos

**Autenticación:** Bearer token requerido

**Respuesta 200 (Éxito):**
```json
{
  "data": {
    "budgets": [
      {
        "id": "budget-uuid-1",
        "name": "Monthly Groceries",
        "category": "Food & Dining",
        "amount": 5000.00,
        "currentSpending": 3200.00,
        "percentUsed": 64,
        "remaining": 1800.00,
        "alertThreshold": 80,
        "isActive": true
      }
    ]
  }
}
```

---

## Rate Limiting

### Headers de Rate Limit

Todas las respuestas de la API incluyen headers de rate limit:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

### Límites de Rate por Tier

| Tier | Solicitudes/Minuto | Solicitudes/Hora | Solicitudes/Día |
|------|-----------------|---------------|--------------|
| FREE | 10 | 100 | 1000 |
| CORE | 60 | 1000 | 10000 |
| PRO | 120 | 3000 | 50000 |
| DEVELOPER | 200 | 10000 | Ilimitado |

### Respuesta de Rate Limit

**Respuesta 429 (Rate Limit Excedido):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit excedido",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "used": 100,
      "resetAt": "2025-10-22T11:00:00Z"
    }
  }
}
```

---

## Paginación

### Paginación Basada en Offset

**Solicitud:**
```http
GET /api/v1/chat/sessions?limit=20&offset=40
```

**Respuesta:**
```json
{
  "data": {
    "sessions": [ /* ... */ ],
    "pagination": {
      "total": 156,
      "limit": 20,
      "offset": 40,
      "hasMore": true
    }
  }
}
```

### Paginación Basada en Cursor

**Solicitud:**
```http
GET /api/v1/chat/history/{sessionId}?limit=50&before=2025-10-22T10:00:00Z
```

**Respuesta:**
```json
{
  "data": {
    "messages": [ /* ... */ ],
    "pagination": {
      "limit": 50,
      "nextCursor": "2025-10-21T15:30:00Z",
      "hasMore": true
    }
  }
}
```

---

## Filtrado y Ordenamiento

### Filtrado

**Ejemplos:**
```http
GET /api/v1/agents?category=coding&isPublic=true
GET /api/v1/rag/documents?tags=mvp,planning&indexed=true
GET /api/v1/finance/transactions?type=expense&category=Food%20%26%20Dining
```

### Ordenamiento

**Ejemplos:**
```http
GET /api/v1/chat/sessions?sortBy=lastActivity&order=desc
GET /api/v1/artifacts?sortBy=createdAt&order=asc
```

**Campos de Ordenamiento Soportados:**
- `createdAt`: Timestamp de creación
- `updatedAt`: Timestamp de última actualización
- `lastActivity`: Timestamp de última actividad
- `name`: Ordenamiento alfabético

---

## Estrategia de Versionado

### Versionado de URL

Todos los endpoints incluyen versión de API en la URL:
```
/api/v1/resource
/api/v2/resource (futuro)
```

### Cambios Incompatibles

Los cambios incompatibles requieren nueva versión de API:
- Eliminar campos
- Cambiar tipos de campos
- Cambiar URLs de endpoints
- Cambiar mecanismo de autenticación

### Cambios No Incompatibles

Los cambios no incompatibles pueden agregarse a la versión existente:
- Agregar nuevos campos
- Agregar nuevos endpoints
- Agregar parámetros opcionales
- Expandir enums

### Política de Deprecación

1. **Anuncio:** 3 meses antes de remoción
2. **Header Sunset:** Agregar a respuestas
3. **Documentación:** Marcar como deprecado
4. **Guía de Migración:** Proporcionar ruta de actualización
5. **Remoción:** Después de 6 meses mínimo

**Ejemplo de Header Sunset:**
```http
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Deprecation: Sat, 30 Sep 2025 23:59:59 GMT
Link: <https://docs.example.com/migration/v2>; rel="sunset"
```

---

## Información del Documento

**Versión:** 1.0
**Creado:** 2025-10-22
**Estado:** FASE DE DISEÑO
**Propietario:** Backend Coder
**Próxima Revisión:** Fase 5 (Implementación de Backend)

**Total de Endpoints Documentados:** 59

**Conteo de Endpoints por Categoría:**
- Autenticación: 6
- Chat: 6
- Agentes: 6 (+ POST /api/v1/agents/{agentId}/execute - Task 0)
- Documentos RAG: 4
- Artefactos: 4
- Usuarios y Configuración: 5
- Administración: 4
- Soporte: 3
- Integraciones MCP: 4
- Almacenamiento: 5
- Sistema de Salud: 6
- Sistema Financiero: 6

**Referencias:**
- [DATABASE.md](../database/DATABASE.md) - Schema de base de datos
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - Arquitectura del sistema
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Estrategia de manejo de errores
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Detalles de autenticación
- [RATE-LIMITING.md](./RATE-LIMITING.md) - Configuración de rate limiting

---

**TODOS LOS ENDPOINTS ESTÁN LISTOS PARA IMPLEMENTACIÓN EN FASE 5 (DESARROLLO DE BACKEND)**
