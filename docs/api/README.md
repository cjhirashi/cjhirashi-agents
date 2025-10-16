# 🔌 API Reference

**CJHIRASHI Agents - Documentación Completa de API**

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Endpoints](#endpoints)
   - [Auth](#auth-api)
   - [Users](#users-api)
   - [Agents](#agents-api)
   - [Conversations](#conversations-api)
   - [Health](#health-api)
   - [Finance](#finance-api)
4. [Errores](#errores)
5. [Rate Limiting](#rate-limiting)
6. [Webhooks](#webhooks)

---

## 🎯 Introducción

### Base URL

```
Producción:  https://agents.cjhirashi.com/api
Desarrollo:  http://localhost:3000/api
```

### Formato de Respuesta

Todas las respuestas siguen el formato JSON:

```typescript
// Respuesta exitosa
{
  "data": { /* ... */ },
  "meta": {
    "timestamp": "2025-10-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}

// Respuesta con error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { /* ... */ }
  },
  "meta": {
    "timestamp": "2025-10-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Versionado

La API actualmente está en **v1**. Todos los endpoints incluyen la versión en el path cuando sea necesario.

```
/api/v1/users
/api/v1/agents
```

---

## 🔐 Autenticación

### Métodos de Autenticación

#### 1. Session Cookie (Recomendado para Web)

Después de iniciar sesión con NextAuth, se establece una cookie de sesión HTTP-only:

```typescript
// El navegador envía automáticamente la cookie
fetch("https://agents.cjhirashi.com/api/users/me", {
  credentials: "include", // Incluir cookies
});
```

#### 2. API Key (Para integraciones)

**Obtener API Key**:

```bash
POST /api/auth/api-keys
Authorization: Bearer <session_token>

# Response
{
  "apiKey": "cj_live_abc123...",
  "expiresAt": "2026-10-15T00:00:00Z"
}
```

**Usar API Key**:

```bash
curl -H "Authorization: Bearer cj_live_abc123..." \
  https://agents.cjhirashi.com/api/users/me
```

### Headers Requeridos

```
Content-Type: application/json
Authorization: Bearer <token>  # Solo para API keys
```

---

## 📡 Endpoints

### Auth API

#### `POST /api/auth/signin`

Iniciar sesión (redirige a Google OAuth).

**Request**:
```http
POST /api/auth/signin
```

**Response**:
```
302 Redirect to Google OAuth
```

---

#### `POST /api/auth/signout`

Cerrar sesión.

**Request**:
```http
POST /api/auth/signout
```

**Response**:
```json
{
  "data": {
    "message": "Signed out successfully"
  }
}
```

---

#### `GET /api/auth/session`

Obtener sesión actual.

**Request**:
```http
GET /api/auth/session
```

**Response**:
```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "image": "https://...",
      "subscriptionTier": "FREE"
    },
    "expires": "2025-11-15T10:30:00Z"
  }
}
```

---

### Users API

#### `GET /api/users/me`

Obtener perfil del usuario actual.

**Request**:
```http
GET /api/users/me
```

**Response**:
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "subscriptionTier": "FREE",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00Z",
    "limits": {
      "monthlyMessages": 100,
      "monthlyTokens": 100000,
      "agentsAllowed": 3
    },
    "usage": {
      "messagesUsed": 45,
      "tokensUsed": 32000
    }
  }
}
```

---

#### `PATCH /api/users/me`

Actualizar perfil del usuario actual.

**Request**:
```http
PATCH /api/users/me
Content-Type: application/json

{
  "name": "John Smith",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Response**:
```json
{
  "data": {
    "id": "usr_abc123",
    "name": "John Smith",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

---

#### `GET /api/users` 🔒 ADMIN

Listar todos los usuarios (solo admins).

**Query Parameters**:
- `page` (number): Página (default: 1)
- `limit` (number): Items por página (default: 20, max: 100)
- `role` (string): Filtrar por rol (`ADMIN`, `USER`)
- `search` (string): Buscar por email o nombre

**Request**:
```http
GET /api/users?page=1&limit=20&role=USER&search=john
```

**Response**:
```json
{
  "data": {
    "users": [
      {
        "id": "usr_abc123",
        "email": "john@example.com",
        "name": "John Doe",
        "role": "USER",
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

#### `POST /api/users/invite` 🔒 ADMIN

Invitar un nuevo usuario.

**Request**:
```http
POST /api/users/invite
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "USER",
  "message": "Welcome to CJHIRASHI Agents!"
}
```

**Response**:
```json
{
  "data": {
    "invitationId": "inv_xyz789",
    "email": "newuser@example.com",
    "expiresAt": "2025-10-22T10:00:00Z",
    "inviteUrl": "https://agents.cjhirashi.com/invite/inv_xyz789"
  }
}
```

---

#### `DELETE /api/users/:id` 🔒 ADMIN

Eliminar un usuario.

**Request**:
```http
DELETE /api/users/usr_abc123
```

**Response**:
```json
{
  "data": {
    "message": "User deleted successfully",
    "deletedUserId": "usr_abc123"
  }
}
```

---

### Agents API

#### `GET /api/agents`

Listar agentes disponibles para el usuario.

**Query Parameters**:
- `category` (string): Filtrar por categoría (`personal`, `health`, `finance`)
- `isPublic` (boolean): Solo agentes públicos

**Request**:
```http
GET /api/agents?category=personal&isPublic=true
```

**Response**:
```json
{
  "data": {
    "agents": [
      {
        "id": "agt_personal_001",
        "name": "Personal Assistant",
        "description": "Your personal AI assistant",
        "category": "personal",
        "model": "gemini-2.0-flash-exp",
        "isPublic": true,
        "createdBy": "system",
        "capabilities": [
          "health_management",
          "financial_analysis",
          "productivity_optimization"
        ]
      }
    ]
  }
}
```

---

#### `GET /api/agents/:id`

Obtener detalles de un agente.

**Request**:
```http
GET /api/agents/agt_personal_001
```

**Response**:
```json
{
  "data": {
    "id": "agt_personal_001",
    "name": "Personal Assistant",
    "description": "Your personal AI assistant that learns from you",
    "category": "personal",
    "model": "gemini-2.0-flash-exp",
    "isPublic": true,
    "config": {
      "temperature": 0.7,
      "maxTokens": 8000,
      "topP": 0.9
    },
    "capabilities": [
      "health_management",
      "financial_analysis",
      "productivity_optimization"
    ],
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

#### `POST /api/agents` 🔒 USER

Crear un agente personalizado.

**Request**:
```http
POST /api/agents
Content-Type: application/json

{
  "name": "My Custom Agent",
  "description": "An agent for X task",
  "model": "gemini-2.0-flash-exp",
  "config": {
    "temperature": 0.8,
    "maxTokens": 4000
  },
  "systemPrompt": "You are a helpful assistant that...",
  "isPublic": false
}
```

**Response**:
```json
{
  "data": {
    "id": "agt_custom_123",
    "name": "My Custom Agent",
    "endpointUrl": "/api/agents/agt_custom_123/chat",
    "createdAt": "2025-10-15T10:30:00Z"
  }
}
```

---

#### `DELETE /api/agents/:id` 🔒 OWNER/ADMIN

Eliminar un agente.

**Request**:
```http
DELETE /api/agents/agt_custom_123
```

**Response**:
```json
{
  "data": {
    "message": "Agent deleted successfully",
    "deletedAgentId": "agt_custom_123"
  }
}
```

---

### Conversations API

#### `GET /api/conversations`

Listar conversaciones del usuario.

**Query Parameters**:
- `agentId` (string): Filtrar por agente
- `cursor` (string): Cursor para paginación
- `limit` (number): Items por página (default: 20, max: 100)

**Request**:
```http
GET /api/conversations?agentId=agt_personal_001&limit=20
```

**Response**:
```json
{
  "data": {
    "conversations": [
      {
        "id": "conv_abc123",
        "title": "Discusión sobre medicamentos",
        "agentId": "agt_personal_001",
        "createdAt": "2025-10-15T09:00:00Z",
        "updatedAt": "2025-10-15T10:30:00Z",
        "messageCount": 12
      }
    ],
    "pagination": {
      "nextCursor": "conv_xyz789",
      "hasMore": true
    }
  }
}
```

---

#### `GET /api/conversations/:id`

Obtener una conversación con sus mensajes.

**Query Parameters**:
- `messageLimit` (number): Número de mensajes (default: 50, max: 200)

**Request**:
```http
GET /api/conversations/conv_abc123?messageLimit=50
```

**Response**:
```json
{
  "data": {
    "id": "conv_abc123",
    "title": "Discusión sobre medicamentos",
    "agentId": "agt_personal_001",
    "createdAt": "2025-10-15T09:00:00Z",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "¿Cuándo debo tomar mi metformina?",
        "timestamp": "2025-10-15T09:00:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "Según tu perfil, debes tomar Metformina 500mg cada 8 horas...",
        "timestamp": "2025-10-15T09:00:05Z"
      }
    ]
  }
}
```

---

#### `POST /api/conversations`

Crear una nueva conversación.

**Request**:
```http
POST /api/conversations
Content-Type: application/json

{
  "agentId": "agt_personal_001",
  "title": "Nueva conversación",
  "initialMessage": "Hola, necesito ayuda con mis finanzas"
}
```

**Response**:
```json
{
  "data": {
    "id": "conv_new123",
    "title": "Nueva conversación",
    "agentId": "agt_personal_001",
    "createdAt": "2025-10-15T10:35:00Z"
  }
}
```

---

#### `POST /api/conversations/:id/messages`

Enviar un mensaje en una conversación.

**Request**:
```http
POST /api/conversations/conv_abc123/messages
Content-Type: application/json

{
  "content": "¿Cuánto he gastado este mes?"
}
```

**Response** (Streaming):
```
Server-Sent Events (SSE)

event: token
data: {"token": "Este"}

event: token
data: {"token": " mes"}

event: token
data: {"token": " has"}

event: token
data: {"token": " gastado"}

event: token
data: {"token": " $"}

event: token
data: {"token": "12"}

event: token
data: {"token": ","}

event: token
data: {"token": "450"}

event: done
data: {
  "messageId": "msg_003",
  "tokensUsed": 156,
  "timestamp": "2025-10-15T10:36:00Z"
}
```

---

#### `DELETE /api/conversations/:id`

Eliminar una conversación.

**Request**:
```http
DELETE /api/conversations/conv_abc123
```

**Response**:
```json
{
  "data": {
    "message": "Conversation deleted successfully",
    "deletedConversationId": "conv_abc123"
  }
}
```

---

### Health API

#### `GET /api/health/profile`

Obtener perfil de salud del usuario.

**Request**:
```http
GET /api/health/profile
```

**Response**:
```json
{
  "data": {
    "id": "hlth_abc123",
    "userId": "usr_abc123",
    "bloodType": "O+",
    "height": 175,
    "weight": 70,
    "allergies": [
      {
        "id": "alg_001",
        "name": "Penicilina",
        "severity": "HIGH"
      }
    ],
    "conditions": [
      {
        "id": "cond_001",
        "name": "Diabetes Tipo 2",
        "diagnosedAt": "2020-05-15T00:00:00Z"
      }
    ]
  }
}
```

---

#### `PATCH /api/health/profile`

Actualizar perfil de salud.

**Request**:
```http
PATCH /api/health/profile
Content-Type: application/json

{
  "bloodType": "O+",
  "height": 175,
  "weight": 70
}
```

**Response**:
```json
{
  "data": {
    "id": "hlth_abc123",
    "bloodType": "O+",
    "height": 175,
    "weight": 70,
    "updatedAt": "2025-10-15T10:40:00Z"
  }
}
```

---

#### `GET /api/health/medications`

Listar medicamentos del usuario.

**Request**:
```http
GET /api/health/medications
```

**Response**:
```json
{
  "data": {
    "medications": [
      {
        "id": "med_001",
        "name": "Metformina",
        "dosage": "500mg",
        "frequency": "Cada 8 horas",
        "startDate": "2020-06-01T00:00:00Z",
        "isActive": true,
        "adherenceRate": 92.5
      }
    ]
  }
}
```

---

#### `POST /api/health/medications`

Agregar un medicamento.

**Request**:
```http
POST /api/health/medications
Content-Type: application/json

{
  "name": "Metformina",
  "dosage": "500mg",
  "frequency": "Cada 8 horas",
  "startDate": "2025-10-15T00:00:00Z",
  "instructions": "Tomar con alimentos"
}
```

**Response**:
```json
{
  "data": {
    "id": "med_new001",
    "name": "Metformina",
    "dosage": "500mg",
    "frequency": "Cada 8 horas",
    "createdAt": "2025-10-15T10:45:00Z"
  }
}
```

---

#### `GET /api/health/appointments`

Listar citas médicas.

**Query Parameters**:
- `upcoming` (boolean): Solo próximas citas (default: true)
- `from` (date): Fecha inicio
- `to` (date): Fecha fin

**Request**:
```http
GET /api/health/appointments?upcoming=true
```

**Response**:
```json
{
  "data": {
    "appointments": [
      {
        "id": "apt_001",
        "title": "Consulta con Dr. García",
        "type": "CHECKUP",
        "datetime": "2025-10-20T14:00:00Z",
        "location": "Hospital Central",
        "notes": "Llevar estudios de laboratorio"
      }
    ]
  }
}
```

---

### Finance API

#### `GET /api/finance/profile`

Obtener perfil financiero.

**Request**:
```http
GET /api/finance/profile
```

**Response**:
```json
{
  "data": {
    "id": "fin_abc123",
    "userId": "usr_abc123",
    "currency": "MXN",
    "monthlyIncome": 25000,
    "totalAssets": 150000,
    "totalLiabilities": 80000,
    "netWorth": 70000
  }
}
```

---

#### `GET /api/finance/accounts`

Listar cuentas bancarias.

**Request**:
```http
GET /api/finance/accounts
```

**Response**:
```json
{
  "data": {
    "accounts": [
      {
        "id": "acc_001",
        "name": "Cuenta de Ahorro",
        "type": "SAVINGS",
        "balance": 45000,
        "currency": "MXN",
        "institution": "BBVA"
      },
      {
        "id": "acc_002",
        "name": "Tarjeta de Crédito",
        "type": "CREDIT_CARD",
        "balance": -12000,
        "creditLimit": 30000,
        "institution": "Santander"
      }
    ]
  }
}
```

---

#### `GET /api/finance/transactions`

Listar transacciones.

**Query Parameters**:
- `accountId` (string): Filtrar por cuenta
- `from` (date): Fecha inicio
- `to` (date): Fecha fin
- `category` (string): Filtrar por categoría
- `cursor` (string): Paginación

**Request**:
```http
GET /api/finance/transactions?accountId=acc_001&from=2025-10-01&to=2025-10-31
```

**Response**:
```json
{
  "data": {
    "transactions": [
      {
        "id": "txn_001",
        "accountId": "acc_001",
        "amount": -350.50,
        "description": "Supermercado",
        "category": "FOOD",
        "date": "2025-10-14T10:00:00Z",
        "type": "EXPENSE"
      },
      {
        "id": "txn_002",
        "accountId": "acc_001",
        "amount": 25000,
        "description": "Salario",
        "category": "INCOME",
        "date": "2025-10-01T00:00:00Z",
        "type": "INCOME"
      }
    ],
    "summary": {
      "totalIncome": 25000,
      "totalExpenses": 12450,
      "netFlow": 12550
    },
    "pagination": {
      "nextCursor": "txn_050",
      "hasMore": true
    }
  }
}
```

---

#### `POST /api/finance/transactions`

Registrar una transacción manual.

**Request**:
```http
POST /api/finance/transactions
Content-Type: application/json

{
  "accountId": "acc_001",
  "amount": -150.00,
  "description": "Gasolina",
  "category": "TRANSPORT",
  "date": "2025-10-15T08:00:00Z"
}
```

**Response**:
```json
{
  "data": {
    "id": "txn_new001",
    "accountId": "acc_001",
    "amount": -150.00,
    "description": "Gasolina",
    "category": "TRANSPORT",
    "createdAt": "2025-10-15T10:50:00Z"
  }
}
```

---

#### `GET /api/finance/budgets`

Listar presupuestos.

**Request**:
```http
GET /api/finance/budgets
```

**Response**:
```json
{
  "data": {
    "budgets": [
      {
        "id": "bdg_001",
        "name": "Alimentación Octubre",
        "category": "FOOD",
        "amount": 4000,
        "spent": 2850.50,
        "remaining": 1149.50,
        "percentage": 71.26,
        "status": "ON_TRACK",
        "period": "MONTHLY",
        "startDate": "2025-10-01T00:00:00Z",
        "endDate": "2025-10-31T23:59:59Z"
      }
    ]
  }
}
```

---

## ❌ Errores

### Códigos de Error

| Código HTTP | Código Interno | Descripción |
|-------------|----------------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 401 | `UNAUTHORIZED` | No autenticado |
| 403 | `FORBIDDEN` | Sin permisos |
| 404 | `NOT_FOUND` | Recurso no encontrado |
| 409 | `CONFLICT` | Conflicto (ej: email ya existe) |
| 429 | `RATE_LIMIT_EXCEEDED` | Demasiadas peticiones |
| 500 | `INTERNAL_ERROR` | Error del servidor |
| 503 | `SERVICE_UNAVAILABLE` | Servicio temporalmente no disponible |

### Formato de Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format",
      "expected": "string (email)"
    }
  },
  "meta": {
    "timestamp": "2025-10-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## ⏱️ Rate Limiting

### Límites por Tier

| Tier | Requests/hora | Requests/día | Mensajes/mes |
|------|---------------|--------------|--------------|
| **FREE** | 100 | 1,000 | 100 |
| **PRO** | 1,000 | 10,000 | 5,000 |
| **BUSINESS** | 10,000 | 100,000 | Ilimitado |

### Headers de Rate Limit

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1697375400
```

### Respuesta al exceder límite

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your rate limit",
    "details": {
      "limit": 100,
      "resetAt": "2025-10-15T11:00:00Z"
    }
  }
}
```

---

## 🔔 Webhooks

### Configurar Webhook

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": [
    "conversation.created",
    "message.sent",
    "agent.invoked"
  ],
  "secret": "whsec_your_secret"
}
```

### Eventos Disponibles

| Evento | Descripción |
|--------|-------------|
| `conversation.created` | Nueva conversación creada |
| `conversation.deleted` | Conversación eliminada |
| `message.sent` | Mensaje enviado por usuario |
| `message.received` | Respuesta del agente |
| `agent.created` | Nuevo agente creado |
| `agent.invoked` | Agente ejecutado |
| `user.created` | Nuevo usuario registrado |

### Payload del Webhook

```json
{
  "event": "message.sent",
  "timestamp": "2025-10-15T10:30:00Z",
  "data": {
    "messageId": "msg_abc123",
    "conversationId": "conv_xyz789",
    "userId": "usr_abc123",
    "content": "¿Cuánto he gastado?",
    "tokensUsed": 12
  }
}
```

### Verificación de Firma

```typescript
import crypto from "crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Uso
const signature = req.headers["x-webhook-signature"];
const isValid = verifyWebhookSignature(
  JSON.stringify(req.body),
  signature,
  process.env.WEBHOOK_SECRET
);
```

---

## 📚 SDKs y Librerías

### JavaScript/TypeScript

```bash
npm install @cjhirashi/agents-sdk
```

```typescript
import { CJHirashiAgents } from "@cjhirashi/agents-sdk";

const client = new CJHirashiAgents({
  apiKey: process.env.CJHIRASHI_API_KEY,
});

// Listar agentes
const agents = await client.agents.list();

// Crear conversación
const conversation = await client.conversations.create({
  agentId: "agt_personal_001",
  initialMessage: "Hola",
});

// Enviar mensaje
for await (const token of conversation.sendMessage("¿Cómo estás?")) {
  process.stdout.write(token);
}
```

### Python

```bash
pip install cjhirashi-agents
```

```python
from cjhirashi_agents import Client

client = Client(api_key=os.getenv("CJHIRASHI_API_KEY"))

# Listar agentes
agents = client.agents.list()

# Crear conversación
conversation = client.conversations.create(
    agent_id="agt_personal_001",
    initial_message="Hola"
)

# Enviar mensaje (streaming)
for token in conversation.send_message("¿Cómo estás?"):
    print(token, end="", flush=True)
```

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Chat completo

```typescript
// 1. Crear conversación
const conversation = await fetch("/api/conversations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agentId: "agt_personal_001",
    title: "Consulta financiera",
    initialMessage: "¿Cuánto puedo ahorrar este mes?"
  }),
});

const { data: conv } = await conversation.json();

// 2. Escuchar respuesta (SSE)
const eventSource = new EventSource(
  `/api/conversations/${conv.id}/messages/stream`
);

eventSource.addEventListener("token", (event) => {
  const { token } = JSON.parse(event.data);
  console.log(token);
});

eventSource.addEventListener("done", (event) => {
  const { tokensUsed } = JSON.parse(event.data);
  console.log(`\nTokens used: ${tokensUsed}`);
  eventSource.close();
});
```

### Ejemplo 2: Análisis financiero

```typescript
// Obtener resumen del mes
const response = await fetch(
  "/api/finance/transactions?" +
    new URLSearchParams({
      from: "2025-10-01",
      to: "2025-10-31",
    })
);

const { data } = await response.json();
const { transactions, summary } = data;

console.log(`Total gastos: $${summary.totalExpenses}`);
console.log(`Total ingresos: $${summary.totalIncome}`);
console.log(`Balance: $${summary.netFlow}`);
```

---

**Última actualización**: 15 de octubre, 2025
**Versión API**: v1.0.0
**Mantenedor**: Carlos Jiménez Hirashi
**Contacto**: [cjhirashi@gmail.com](mailto:cjhirashi@gmail.com)

---

> **💡 TIP**: Para explorar la API interactivamente, visita nuestro [Playground](https://agents.cjhirashi.com/playground).
