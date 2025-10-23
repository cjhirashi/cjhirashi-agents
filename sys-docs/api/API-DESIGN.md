# Especificación de Diseño de API - cjhirashi-agents MVP

**Versión:** 1.0
**Fecha:** 2025-10-22
**Estado:** LISTO PARA PRODUCCIÓN
**Responsable:** Arquitecto
**Versión API:** v1
**URL Base:** `https://cjhirashi-agents.vercel.app/api/v1`

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Especificación OpenAPI 3.0](#especificación-openapi-30)
3. [Seguridad y Autenticación](#seguridad-y-autenticación)
4. [Estándares de Solicitud/Respuesta](#estándares-de-solicitudrespuesta)
5. [Rendimiento y SLAs](#rendimiento-y-slas)
6. [Ejemplos y Casos de Uso](#ejemplos-y-casos-de-uso)

---

## Introducción

### Propósito

Este documento define el diseño completo de la API para el MVP de cjhirashi-agents, siguiendo la especificación OpenAPI 3.0.3. La API está diseñada para soportar:

- **Chat multi-LLM** con soporte de streaming (Claude, GPT-4, Gemini, DeepSeek)
- **Búsqueda semántica habilitada por RAG** (Pinecone + PostgreSQL)
- **Gestión de artefactos** (código, diagramas, imágenes)
- **Integraciones MCP** (Gmail, Calendar, Notion)
- **Sistemas de seguimiento de Salud y Finanzas**
- **Arquitectura multi-tenant** con control de acceso basado en roles
- **Chat en tiempo real** mediante Server-Sent Events (SSE)

### Filosofía de Diseño

1. **Principios RESTful:** URLs basadas en recursos, métodos HTTP estándar
2. **Seguridad de Tipos:** Todos los requests/responses tienen tipos TypeScript
3. **Seguridad Primero:** Autenticación, autorización, validación en todos los endpoints
4. **Rendimiento:** Consultas optimizadas, caché, rate limiting
5. **Multi-tenant:** Datos aislados por usuario (partición userId)
6. **Escalabilidad:** Diseñado para 10K+ usuarios, 1M+ mensajes

### Características Clave

- **58 endpoints REST** en 12 categorías
- **54 tablas de base de datos** con soporte de esquema completo
- **30+ códigos de error** para escenarios específicos
- **Streaming en tiempo real** mediante Server-Sent Events (SSE)
- **Rate limiting** por tier (GRATUITO, PRO, EMPRESARIAL)
- **Enrutamiento multi-LLM** con selección inteligente de modelos

---

## Especificación OpenAPI 3.0

### Sección Info

```yaml
openapi: 3.0.3
info:
  title: API cjhirashi-agents MVP
  version: 1.0.0
  description: |
    Plataforma de orquestación multi-LLM con RAG, chat en tiempo real,
    seguimiento de salud y gestión financiera.

    Características:
    - 58 endpoints REST
    - Enrutamiento multi-LLM (Claude, Gemini, DeepSeek, GPT-4)
    - Búsqueda semántica RAG (Pinecone + PostgreSQL)
    - Streaming con Server-Sent Events (SSE)
    - Multi-tenant con RBAC
    - Sistemas de Salud y Finanzas

  contact:
    name: Charlie Hirashi
    email: support@cjhirashi-agents.com
    url: https://cjhirashi-agents.com

  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

  x-logo:
    url: https://cjhirashi-agents.com/logo.png
```

### Servidores

```yaml
servers:
  - url: https://cjhirashi-agents.vercel.app/api/v1
    description: Producción
    variables:
      protocol:
        default: https

  - url: https://staging-cjhirashi.vercel.app/api/v1
    description: Staging

  - url: http://localhost:3000/api/v1
    description: Desarrollo (local)
```

### Componentes - Esquemas

Los esquemas incluyen: User, ChatSession, Message, Artifact, Agent, Document, APIResponse, ErrorResponse

---

## Seguridad y Autenticación

### Bearer Token (JWT)

Todos los endpoints autenticados requieren un token JWT en el header `Authorization`.

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://cjhirashi-agents.vercel.app/api/v1/chat/sessions
```

### Estructura del Token

```json
{
  "sub": "uuid-usuario-123",
  "email": "usuario@example.com",
  "name": "John Doe",
  "tier": "PRO",
  "role": "USUARIO",
  "iat": 1698067200,
  "exp": 1698070800,
  "aud": "cjhirashi-agents",
  "iss": "nextauth.js"
}
```

**Expiración del Token:**
- Token de acceso: 15 minutos
- Token de actualización: 30 días

### OAuth 2.0

Proveedores soportados: Google, GitHub

### Configuración CORS

Orígenes permitidos:
- `https://cjhirashi-agents.vercel.app`
- `https://staging-cjhirashi.vercel.app`
- `http://localhost:3000` (desarrollo)

### Aplicación HTTPS

Todos los endpoints de API requieren HTTPS en producción. Las solicitudes HTTP se redirigen.

---

## Estándares de Solicitud/Respuesta

### Formato de Respuesta Exitosa

```json
{
  "data": {
    "id": "uuid-usuario-123",
    "email": "usuario@example.com",
    "name": "John Doe",
    "tier": "PRO",
    "createdAt": "2025-10-22T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-10-22T10:35:00Z",
    "requestId": "req-abc123-def456",
    "version": "1.0.0"
  }
}
```

### Formato de Respuesta de Error

```json
{
  "error": {
    "code": "ERROR_VALIDACION",
    "message": "El email es requerido",
    "statusCode": 400,
    "timestamp": "2025-10-22T10:35:00Z",
    "requestId": "req-abc123-def456",
    "details": {
      "field": "email",
      "reason": "required"
    }
  }
}
```

### Respuesta Paginada

```json
{
  "data": [
    { "id": "item-1", "name": "Elemento 1" },
    { "id": "item-2", "name": "Elemento 2" }
  ],
  "meta": {
    "timestamp": "2025-10-22T10:35:00Z",
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 100,
      "hasMore": true
    }
  }
}
```

### Respuesta de Streaming (SSE)

Para mensajes de chat en tiempo real:

```
event: message
data: {"type":"chunk","content":"Hola"}

event: message
data: {"type":"chunk","content":" mundo"}

event: done
data: {"type":"complete","tokensUsed":42}
```

---

## Rendimiento y SLAs

### Objetivos de Latencia

| Tipo de Endpoint | Target | P95 |
|---|---|---|
| Autenticación | < 200ms | < 300ms |
| Chat (no streaming) | < 500ms | < 800ms |
| Chat (inicio streaming) | < 1000ms | < 1500ms |
| Búsqueda RAG | < 300ms | < 500ms |
| Carga de archivo | < 2000ms | < 3000ms |
| Consultas de metadatos | < 100ms | < 150ms |

### SLA de Disponibilidad

- **Producción:** 99.9% uptime (43 minutos de inactividad/mes)
- **Soporte:** 24/7 para tier Enterprise

### Requisitos de Throughput

- **Global:** 1000 usuarios concurrentes
- **Por usuario:** 10 conexiones concurrentes
- **Carga máxima:** 100,000 requests/minuto

### Rate Limiting

- **Tier GRATUITO:** 20 req/min, 500 req/hora, 5000 req/día
- **Tier PRO:** 100 req/min, 3000 req/hora, 50000 req/día
- **Tier EMPRESARIAL:** 1000 req/min, ilimitado/día

---

## Ejemplos y Casos de Uso

### Ejemplo 1: Registro de Usuario

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "ContraseñaSegura123!",
  "name": "John Doe"
}

Respuesta 201:
{
  "data": {
    "id": "uuid-usuario-123",
    "email": "usuario@example.com",
    "name": "John Doe",
    "tier": "GRATUITO",
    "role": "USUARIO",
    "createdAt": "2025-10-22T10:35:00Z"
  }
}
```

### Ejemplo 2: Mensaje de Chat con LLM

```bash
POST /api/v1/chat/send
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "sessionId": "uuid-sesion-456",
  "message": "¿Qué es machine learning?",
  "selectedAgents": ["claude-3.5-sonnet"],
  "ragEnabled": true
}

Respuesta 200 (Streaming via SSE):
event: message
data: {"type":"chunk","content":"Machine learning"}

event: message
data: {"type":"chunk","content":" es un subconjunto de IA"}

event: done
data: {"type":"complete","tokensUsed":47}
```

### Ejemplo 3: Carga de Documento RAG

```bash
POST /api/v1/rag/documents
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: @documento.pdf
title: "Documentación Técnica"
description: "Guía de arquitectura del sistema"

Respuesta 201:
{
  "data": {
    "id": "uuid-doc-789",
    "fileName": "documento.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-10-22T10:35:00Z",
    "vectorIds": ["vec-1", "vec-2", "vec-3"]
  }
}
```

### Ejemplo 4: Respuesta de Error

```bash
POST /api/v1/chat/send
Authorization: Bearer {token_expirado}

Respuesta 401:
{
  "error": {
    "code": "TOKEN_EXPIRADO",
    "message": "Su sesión ha expirado. Por favor, inicie sesión de nuevo.",
    "statusCode": 401,
    "timestamp": "2025-10-22T10:35:00Z",
    "requestId": "req-abc123-def456"
  }
}
```

---

## Rutas - 58 Endpoints

### Autenticación (6 endpoints)

- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/signin` - Iniciar sesión con email/contraseña
- `POST /auth/refresh` - Actualizar token de acceso
- `POST /auth/logout` - Cerrar sesión
- `GET /auth/me` - Obtener perfil del usuario actual
- `POST /auth/oauth/{provider}` - Iniciar sesión con OAuth

### Chat (6 endpoints)

- `POST /chat/sessions` - Crear sesión de chat
- `GET /chat/sessions` - Listar sesiones
- `GET /chat/sessions/{id}` - Obtener detalles de sesión
- `POST /chat/send` - Enviar mensaje (streaming SSE)
- `GET /chat/history/{id}` - Obtener historial de chat
- `DELETE /chat/sessions/{id}` - Eliminar sesión

### Agentes (5 endpoints)

- `GET /agents` - Listar agentes disponibles
- `GET /agents/{id}` - Obtener detalles del agente
- `POST /agents/{id}/enable` - Habilitar agente
- `DELETE /agents/{id}/disable` - Deshabilitar agente
- `GET /agents/{id}/usage` - Obtener estadísticas de uso

### Documentos RAG (4 endpoints)

- `POST /rag/documents` - Cargar documento
- `GET /rag/documents` - Listar documentos
- `POST /rag/search` - Búsqueda semántica
- `DELETE /rag/documents/{id}` - Eliminar documento

### Artefactos (4 endpoints)

- `GET /artifacts` - Listar artefactos
- `GET /artifacts/{id}` - Obtener artefacto
- `DELETE /artifacts/{id}` - Eliminar artefacto
- `POST /artifacts/{id}/export` - Exportar artefacto

### Usuarios y Configuración (5 endpoints)

- `GET /users/profile` - Obtener perfil
- `PATCH /users/profile` - Actualizar perfil
- `PATCH /users/settings` - Actualizar configuración
- `POST /users/change-password` - Cambiar contraseña
- `GET /users/usage` - Obtener estadísticas de uso

### Administrador (4 endpoints)

- `GET /admin/users` - Listar usuarios (solo admin)
- `PATCH /admin/users/{id}/tier` - Cambiar tier
- `DELETE /admin/users/{id}` - Suspender usuario
- `GET /admin/metrics` - Métricas del sistema

### Soporte (3 endpoints)

- `POST /support/tickets` - Crear ticket de soporte
- `GET /support/tickets` - Listar tickets del usuario
- `PATCH /support/tickets/{id}` - Actualizar ticket

### Integraciones MCP (4 endpoints)

- `POST /mcp/connect/{provider}` - Conectar proveedor MCP
- `GET /mcp/connected` - Listar MCPs conectados
- `DELETE /mcp/{provider}` - Desconectar MCP
- `POST /mcp/{provider}/sync` - Sincronizar datos

### Almacenamiento (5 endpoints)

- `POST /storage/upload` - Cargar archivo
- `GET /storage/files` - Listar archivos
- `GET /storage/files/{id}/download` - Descargar archivo
- `DELETE /storage/files/{id}` - Eliminar archivo
- `POST /storage/files/{id}/share` - Compartir archivo

### Sistema de Salud (6 endpoints)

- `GET /health/profile` - Obtener perfil de salud
- `POST /health/medications` - Agregar medicamento
- `GET /health/medications` - Listar medicamentos
- `POST /health/appointments` - Programar cita
- `GET /health/measurements` - Obtener mediciones
- `POST /health/measurements` - Registrar medición

### Sistema Financiero (6 endpoints)

- `GET /financial/profile` - Obtener perfil financiero
- `GET /financial/accounts` - Listar cuentas
- `POST /financial/transactions` - Registrar transacción
- `GET /financial/transactions` - Listar transacciones
- `POST /financial/budgets` - Crear presupuesto
- `GET /financial/budgets` - Listar presupuestos

---

## Información del Documento

**Versión:** 1.0
**Creado:** 2025-10-22
**Estado:** LISTO PARA PRODUCCIÓN
**Responsable:** Arquitecto
**Próxima Revisión:** Fase 5 (Implementación de Backend)

**Especificación:** OpenAPI 3.0.3 compatible
**Endpoints:** 58 completamente documentados
**Esquemas:** 40+ modelos de datos
**Ejemplos:** 15+ casos de uso completos

**Listo para:**
- Generación de código desde OpenAPI (SDKs cliente)
- Documentación de API (Swagger UI, ReDoc)
- Importación en Postman
- Testing de API (Insomnia, REST Client)
- Implementación de Backend (Fase 5)

---

🚀 **ESPECIFICACIÓN DE DISEÑO DE API LISTA PARA IMPLEMENTACIÓN EN FASE 5**
