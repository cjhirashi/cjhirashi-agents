# PHASE 5: CORE BACKEND IMPLEMENTATION - DETAILED PLAN

**Versión:** 1.0
**Fecha Creación:** 2025-10-22
**Estado:** 🔵 LISTO PARA INICIAR
**Duración Estimada:** 2-3 semanas
**Fecha Inicio:** 2025-10-23
**Fecha Finalización Estimada:** 2025-11-09

---

## 📑 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura de Implementación](#arquitectura-de-implementación)
3. [Desglose de Tareas por Especialista](#desglose-de-tareas-por-especialista)
4. [Algoritmo de LLM Routing Hybrid](#algoritmo-de-llm-routing-hybrid)
5. [Estructura de Código](#estructura-de-código)
6. [Dependencias y Setup](#dependencias-y-setup)
7. [Testing Strategy](#testing-strategy)
8. [Criterios de Finalización](#criterios-de-finalización)
9. [Riesgos y Mitigación](#riesgos-y-mitigación)
10. [Cronograma Detallado](#cronograma-detallado)

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo Fase 5

Implementar la **lógica central del backend** que permite que el MVP funcione como un sistema integrado de:
- **Chat API** con streaming SSE en tiempo real
- **RAG (Retrieval-Augmented Generation)** integrado con Pinecone
- **Multi-LLM Routing** con algoritmo híbrido (calidad + costo + disponibilidad)
- **Autenticación y RBAC** con NextAuth.js
- **Rate limiting** basado en tiers
- **Tests unitarios e integración** > 80% cobertura

### Dependencias Previas (Completadas)

✅ **Fase 1:** Requirements & Technical Stack
✅ **Fase 2:** Architecture Design (7-layer)
✅ **Fase 3:** Database Design (54 tablas + Pinecone schema)
✅ **Fase 4:** API Specification (58 endpoints, OpenAPI 3.0, RBAC matrix)

### Entregables Esperados

| Entregable | Tipo | Responsable | Estimado |
|-----------|------|-------------|----------|
| Chat API (POST /api/v1/chat/send) | Código | coder | 4 días |
| Chat Sessions CRUD | Código | coder | 2 días |
| LLM Router (Hybrid algorithm) | Código | ai-specialist | 5 días |
| RAG Document Upload | Código | ai-specialist | 3 días |
| RAG Semantic Search | Código | ai-specialist | 3 días |
| NextAuth Setup + RBAC | Código | coder + security-specialist | 3 días |
| Rate Limiting Middleware | Código | coder | 2 días |
| Unit + Integration Tests | Código | coder + tester | 5 días |
| Documentation Updates | Documentación | documenter | 2 días |

---

## 🏗️ ARQUITECTURA DE IMPLEMENTACIÓN

### 1. Chat API con SSE Streaming

**Endpoint:** `POST /api/v1/chat/send`

```typescript
// Request
{
  "sessionId": "session-uuid",
  "message": "Explica RAG",
  "selectedAgents": ["claude-3.5-sonnet-20241022"],
  "ragEnabled": true,
  "temperature": 0.7,
  "maxTokens": 4096
}

// Response (Server-Sent Events)
event: start
data: {"messageId": "msg-uuid", "timestamp": "2025-10-22T10:30:00Z"}

event: chunk
data: {"content": "RAG stands for", "delta": "RAG stands for"}

event: chunk
data: {"content": "RAG stands for Retrieval", "delta": " Retrieval"}

event: done
data: {"messageId": "msg-uuid", "tokensUsed": 250, "completedAt": "..."}
```

**Flujo de Ejecución:**
```
1. Validar request + auth
2. Obtener chat session
3. Guardar user message en DB
4. Si RAG enabled:
   a. Buscar documentos relevantes en Pinecone
   b. Construir context string
5. Seleccionar LLM model via router
6. Generar system prompt + context
7. Llamar a modelo vía Vercel AI SDK
8. Streamear response como SSE
9. Guardar assistant message + metadata en DB
10. Retornar tokens used + cost
```

### 2. LLM Routing Hybrid Algorithm

**Componentes del Algoritmo:**

```typescript
interface ModelScore {
  model: string;
  qualityScore: number;    // 0-1: capabilities match
  costScore: number;       // 0-1: cost efficiency (inverse)
  availabilityScore: number; // 0-1: uptime + latency
  finalScore: number;      // weighted average
}

// Scoring Logic:
const finalScore = (
  0.4 * qualityScore +     // 40% calidad del modelo
  0.3 * costScore +        // 30% eficiencia de costo
  0.3 * availabilityScore  // 30% disponibilidad/latencia
)

// Models Available:
const models = {
  "claude-3.5-sonnet-20241022": {
    quality: 0.95,         // Mejor para código, análisis
    costPer1kTokens: 0.003,
    avgLatency: 800        // ms
  },
  "gpt-4o": {
    quality: 0.92,         // Versátil, bueno para todo
    costPer1kTokens: 0.015,
    avgLatency: 1200
  },
  "gemini-2.0-flash": {
    quality: 0.88,         // Rápido, económico
    costPer1kTokens: 0.001,
    avgLatency: 500
  },
  "deepseek-chat": {
    quality: 0.85,         // Alternativa económica
    costPer1kTokens: 0.0005,
    avgLatency: 1500
  }
};

// Fallback Strategy:
// Si modelo primario falla → intenta siguiente mejor score
// Máximo 3 reintentos
// Timeout: 30 segundos por intento
```

**Reglas de Selección:**

```
IF user.tier = "FREE":
  → Preferir Gemini (costo bajo)
  → Evitar GPT-4 (costo alto)

IF user.tier = "PRO":
  → Balancear calidad + costo
  → Preferir Claude para tareas técnicas
  → Preferir Gemini para tareas rápidas

IF user.tier = "ENTERPRISE":
  → Preferir Claude (mejor calidad)
  → Usar GPT-4 como fallback
  → Disponible: Cualquier modelo

IF prompt_contains("code"):
  → Boost Claude quality score +0.1

IF prompt_contains("imagen"):
  → Preferir Gemini (soporte multimodal)

IF latency > 2000ms:
  → Penalizar modelo (-0.2 score)
  → Favorecer modelos rápidos
```

### 3. RAG Pipeline

**Componentes:**

```
Document Upload → Chunking → Embedding → Pinecone Storage → Semantic Search

1. Document Upload (POST /api/v1/rag/documents)
   - Soportado: PDF, TXT, MD, DOCX, JSON, CSV
   - Límites por tier (10MB FREE, 100MB PRO)
   - Almacenamiento: Vercel Blob Storage

2. Chunking Strategy
   - Tamaño chunks: 800 caracteres
   - Overlap: 200 caracteres
   - Preservar estructura (títulos, tablas)
   - Metadata: source, page, section

3. Embedding Generation
   - Modelo: text-embedding-3-small (OpenAI)
   - Dimensiones: 1536
   - Caché local para documentos duplicados

4. Pinecone Storage
   - Index: "cjhirashi-agents-mvp"
   - Namespace: "{userId}-{documentId}"
   - Metadata: document_id, user_id, chunk_index, source

5. Semantic Search (POST /api/v1/rag/search)
   - Query embedding via OpenAI
   - Threshold: 0.7 similarity
   - Retornar top-5 resultados
   - Include metadata + source

6. Context Injection
   - Top-5 chunks concatenados
   - Formato: "From [source] page [page]: [content]"
   - Límite: 2000 tokens máximo
   - Append a system prompt
```

### 4. Authentication & RBAC

**Implementación NextAuth.js:**

```typescript
// .env.local
NEXTAUTH_URL=https://cjhirashi-agents.vercel.app
NEXTAUTH_SECRET=<generated>

// Providers:
1. CredentialsProvider (Email + Password)
2. GoogleProvider (OAuth)
3. GitHubProvider (OAuth)

// Session Strategy: JWT
// Token lifetime: 15 minutes (access) + 30 days (refresh)
// Cookie: httpOnly, secure, sameSite=lax

// RBAC Implementation:
enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN"
}

enum UserTier {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE"
}

// Middleware Guards:
- requireAuth(): Check JWT valid
- requireRole(role): Check user role
- requireTier(tier): Check subscription tier
- checkRateLimit(endpoint): Check quota
```

### 5. Rate Limiting

**Token Bucket Algorithm:**

```
FREE tier:
  - 20 requests/minute
  - 100 requests/hour
  - 1,000 requests/day
  - 100 messages/month
  - 5 documents/month

PRO tier:
  - 100 requests/minute
  - 1,000 requests/hour
  - 10,000 requests/day
  - Unlimited messages
  - 50 documents/month

ENTERPRISE tier:
  - 1,000 requests/minute
  - 10,000 requests/hour
  - Unlimited/day
  - Unlimited messages
  - Unlimited documents

// Response Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## 🎯 DESGLOSE DE TAREAS POR ESPECIALISTA

### ESPECIALISTA 1: CODER (Backend Lead)

**Responsabilidad Total:** Chat API, endpoints CRUD, middleware, tests

**Tareas Detalladas:**

#### T1.1: Setup Next.js Backend Infrastructure (2 días)
```
Subtareas:
- [ ] Crear estructura de carpetas (app/api/v1/*, lib/*, types/*)
- [ ] Setup Prisma client + conexión PostgreSQL
- [ ] Setup Vercel AI SDK client
- [ ] Variables de entorno (.env.local, .env.production)
- [ ] Middleware de error handling global
- [ ] Logger setup (Winston o Pino)
- [ ] Setup TypeScript paths
```

**Deliverables:**
- Estructura de código lista
- Configuración funcionando
- Ejemplo de endpoint funcionando

#### T1.2: Implementar Chat API con SSE (4 días)
```
Subtareas:
- [ ] POST /api/v1/chat/send (SSE streaming)
  - Validación de request
  - Obtener chat session
  - Guardar user message
  - Llamar LLM via ai-specialist's router
  - Stream response como Server-Sent Events
  - Guardar assistant message + metadata
  - Calcular tokens + costo

- [ ] GET /api/v1/chat/sessions (lista sesiones)
- [ ] POST /api/v1/chat/sessions (crear sesión)
- [ ] GET /api/v1/chat/sessions/{id} (detalle sesión)
- [ ] DELETE /api/v1/chat/sessions/{id} (borrar sesión)
- [ ] GET /api/v1/chat/history/{id} (historial con paginación)
```

**Deliverables:**
- Endpoint POST /chat/send funcionando con SSE
- CRUD completo para sessions
- Historial paginado funcionando

#### T1.3: Implementar NextAuth.js Setup (2 días)
```
Subtareas:
- [ ] Configurar NextAuth con Credentials provider
- [ ] Configurar Google OAuth
- [ ] Configurar GitHub OAuth
- [ ] JWT token generation + refresh logic
- [ ] Session persistence en DB
- [ ] Callbacks para session enrichment
- [ ] Pages customizadas (signin, error, welcome)
```

**Deliverables:**
- Login/signup funcionando
- Token generation + refresh
- Session management

#### T1.4: Rate Limiting Middleware (2 días)
```
Subtareas:
- [ ] Token bucket algorithm implementation
- [ ] Tier-based quota configuration
- [ ] Middleware para validar límites
- [ ] Response headers (X-RateLimit-*)
- [ ] Error 429 handling
- [ ] Redis client para distributed rate limiting
```

**Deliverables:**
- Middleware funcionando
- Rate limits enforcement
- Documentación de limits

#### T1.5: Unit + Integration Tests (4 días)
```
Subtareas:
- [ ] Jest setup + test infrastructure
- [ ] Unit tests para endpoints (mocks)
- [ ] Integration tests (DB + LLM)
- [ ] E2E tests para chat flow completo
- [ ] Performance tests (latency SLAs)
- [ ] Error scenario tests
- [ ] Coverage report (target: 80%+)
```

**Deliverables:**
- Test suite > 80% cobertura
- Tests pasando localmente
- CI/CD pipeline ready

**Total Coder:** ~15 días de trabajo

---

### ESPECIALISTA 2: AI-SPECIALIST

**Responsabilidad Total:** LLM routing, RAG integration, model integration

**Tareas Detalladas:**

#### T2.1: Hybrid LLM Router Implementation (5 días)
```
Subtareas:
- [ ] Implementar scoring logic (quality, cost, availability)
- [ ] Integrar con Vercel AI SDK
- [ ] Implementar fallback strategy (max 3 retries)
- [ ] Model configuration management
- [ ] Cost tracking por modelo
- [ ] Latency monitoring
- [ ] Logging para análisis de decisiones
```

**Deliverables:**
- Router funcionando con algoritmo hybrid
- Fallback strategy implementada
- Cost + latency tracking

#### T2.2: RAG Document Management (3 días)
```
Subtareas:
- [ ] POST /api/v1/rag/documents (upload + indexing)
  - File validation
  - Vercel Blob Storage upload
  - Trigger chunking + embedding
  - Save metadata en DB

- [ ] DELETE /api/v1/rag/documents/{id}
  - Eliminar documento
  - Limpiar embeddings de Pinecone
  - Limpiar Blob storage

- [ ] GET /api/v1/rag/documents (lista documentos)
```

**Deliverables:**
- Upload endpoint funcionando
- Document metadata en DB
- Blob storage integration

#### T2.3: RAG Chunking + Embedding Pipeline (3 días)
```
Subtareas:
- [ ] Implementar document chunking
  - Detectar formato (PDF, MD, TXT, etc)
  - Splits por 800 caracteres + 200 overlap
  - Preservar metadata (página, sección)

- [ ] Embedding generation
  - Call OpenAI text-embedding-3-small
  - Cache para duplicates
  - Batch processing
```

**Deliverables:**
- Chunking working for all file types
- Embedding generation working
- Pipeline automated

#### T2.4: RAG Semantic Search (3 días)
```
Subtareas:
- [ ] Pinecone index setup
  - Index name: "cjhirashi-agents-mvp"
  - Namespace strategy: userId-documentId
  - Metadata filtering

- [ ] POST /api/v1/rag/search (semantic search)
  - Query embedding generation
  - Pinecone vector search
  - Threshold filtering (0.7)
  - Return top-5 + metadata

- [ ] Context injection en prompts
  - Format context string
  - Límite 2000 tokens
  - Include source attribution
```

**Deliverables:**
- Pinecone integration working
- Search endpoint functioning
- Context injection in chat flow

#### T2.5: Multi-Model Integration (4 días)
```
Subtareas:
- [ ] Claude integration via Vercel AI SDK
- [ ] GPT-4o integration
- [ ] Gemini integration
- [ ] DeepSeek integration
- [ ] Prompt optimization por modelo
- [ ] Token counting para billing
```

**Deliverables:**
- All 4 models working
- Prompts optimized
- Token tracking

**Total AI-Specialist:** ~10 días de trabajo

---

### ESPECIALISTA 3: ARCHITECT (Oversight)

**Responsabilidad:** Validar que implementación siga arquitectura, resolver blockers

**Tareas:**

#### T3.1: Architecture Review & Validation (5 días)
```
- [ ] Daily sync (15 min) con coder + ai-specialist
- [ ] Code review para architectural decisions
- [ ] Validar que layers se respetan
- [ ] Resolver conflictos de diseño
- [ ] Performance optimization suggestions
- [ ] Security review
```

**Deliverables:**
- Architecture maintained
- Blockers resolved
- Performance optimized

---

## 🧠 ALGORITMO DE LLM ROUTING HYBRID

### Scoring Components

```typescript
interface RoutingDecision {
  selectedModel: string;
  scores: {
    quality: number;      // 0-1
    cost: number;         // 0-1
    availability: number; // 0-1
    final: number;        // 0-1
  };
  reasoning: string;
  fallbacks: string[];    // ranked list
}

// QUALITY SCORE (40% weight)
// Basado en: capabilities, training data, specialization
const getQualityScore = (model: string, context: RequestContext) => {
  let score = baselineScore[model]; // Claude: 0.95, GPT-4o: 0.92, etc.

  // Boost para code tasks
  if (context.prompt.includes("code") && model.includes("claude")) {
    score += 0.1;
  }

  // Boost para análisis
  if (context.prompt.includes("análisis") && model.includes("gpt")) {
    score += 0.05;
  }

  // Reduce si latencia está alta
  if (model.avgLatency > 2000) {
    score -= 0.1;
  }

  return Math.min(1, score);
};

// COST SCORE (30% weight)
// Basado en: precio por token, tokens esperados
const getCostScore = (model: string, estimatedTokens: number) => {
  const cost = models[model].costPer1kTokens * (estimatedTokens / 1000);
  const maxCost = 0.10; // $0.10 es considerado "caro"

  // Score inverso: costo bajo = score alto
  const score = 1 - Math.min(1, cost / maxCost);

  return score;
};

// AVAILABILITY SCORE (30% weight)
// Basado en: uptime, latencia actual, queue depth
const getAvailabilityScore = (model: string, systemMetrics: any) => {
  let score = 1.0;

  // Restar por downtime
  score -= (1 - systemMetrics[model].uptime) * 0.5;

  // Restar por latencia alta
  if (systemMetrics[model].currentLatency > 3000) {
    score -= 0.3;
  } else if (systemMetrics[model].currentLatency > 1500) {
    score -= 0.1;
  }

  // Restar por queue depth
  if (systemMetrics[model].queueDepth > 100) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
};

// TIER-BASED CONSTRAINTS
const getTierConstraints = (tier: UserTier): string[] => {
  switch (tier) {
    case "FREE":
      return ["gemini-2.0-flash", "deepseek-chat"]; // Económicos
    case "PRO":
      return ["claude-3.5-sonnet", "gpt-4o", "gemini-2.0-flash"];
    case "ENTERPRISE":
      return ["claude-3.5-sonnet", "gpt-4o", "gemini-2.0-flash", "deepseek-chat"];
  }
};

// FINAL ROUTING
const routeToModel = (
  context: RequestContext,
  systemMetrics: any
): RoutingDecision => {
  const allowedModels = getTierConstraints(context.user.tier);

  const scores = allowedModels.map(model => ({
    model,
    quality: getQualityScore(model, context),
    cost: getCostScore(model, context.estimatedTokens),
    availability: getAvailabilityScore(model, systemMetrics),
  }));

  // Calculate final scores
  scores.forEach(score => {
    score.final =
      0.4 * score.quality +
      0.3 * score.cost +
      0.3 * score.availability;
  });

  // Sort by final score
  const sorted = scores.sort((a, b) => b.final - a.final);

  return {
    selectedModel: sorted[0].model,
    scores: sorted[0],
    reasoning: generateReasoning(sorted[0], context),
    fallbacks: sorted.slice(1).map(s => s.model),
  };
};
```

### Fallback Strategy

```typescript
const callModelWithFallback = async (
  routing: RoutingDecision,
  prompt: string,
  context: any
): Promise<Response> => {
  const models = [routing.selectedModel, ...routing.fallbacks];
  let lastError: Error | null = null;

  for (let i = 0; i < Math.min(models.length, 3); i++) {
    try {
      const model = models[i];

      // Set timeout: 30 seconds
      const response = await Promise.race([
        callLLM(model, prompt, context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 30000)
        ),
      ]);

      return response;
    } catch (error) {
      lastError = error;
      console.log(`Model ${models[i]} failed, trying fallback...`);

      // Log attempt
      await logRoutingAttempt({
        requestId: context.requestId,
        model: models[i],
        success: false,
        error: error.message,
        attempt: i + 1,
      });
    }
  }

  // All models failed
  throw new Error(
    `All models failed after 3 attempts. Last error: ${lastError.message}`
  );
};
```

---

## 📁 ESTRUCTURA DE CÓDIGO

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts              (NextAuth routes)
│   │   │   ├── signin/page.tsx           (Login page)
│   │   │   ├── signup/page.tsx           (Register page)
│   │   │   └── callback/[provider]/route.ts (OAuth callback)
│   │   │
│   │   └── v1/
│   │       ├── chat/
│   │       │   ├── send/
│   │       │   │   └── route.ts          (SSE streaming)
│   │       │   ├── sessions/
│   │       │   │   ├── route.ts          (GET list, POST create)
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts      (GET detail, DELETE)
│   │       │   │       └── messages/route.ts
│   │       │   └── history/
│   │       │       └── [sessionId]/route.ts (GET paginated)
│   │       │
│   │       ├── rag/
│   │       │   ├── documents/
│   │       │   │   ├── route.ts          (POST upload, GET list)
│   │       │   │   └── [id]/
│   │       │   │       └── route.ts      (DELETE)
│   │       │   ├── search/
│   │       │   │   └── route.ts          (POST semantic search)
│   │       │   └── embeddings/
│   │       │       └── route.ts          (Internal: generate embeddings)
│   │       │
│   │       ├── agents/
│   │       │   ├── route.ts              (GET list)
│   │       │   ├── [id]/route.ts         (GET detail)
│   │       │   ├── [id]/enable/route.ts  (POST enable)
│   │       │   └── [id]/usage/route.ts   (GET usage stats)
│   │       │
│   │       └── health/
│   │           └── route.ts              (GET health check)
│   │
│   ├── middleware.ts                     (Auth + rate limiting)
│   ├── layout.tsx
│   └── globals.css
│
├── lib/
│   ├── ai/
│   │   ├── router.ts                     (Hybrid routing logic)
│   │   ├── models.ts                     (Model configs)
│   │   ├── prompts.ts                    (System prompts)
│   │   ├── vercel-ai.ts                  (Vercel AI SDK client)
│   │   └── tokens.ts                     (Token counting)
│   │
│   ├── rag/
│   │   ├── embedding.ts                  (Embedding generation)
│   │   ├── chunking.ts                   (Document chunking)
│   │   ├── search.ts                     (Semantic search)
│   │   ├── pinecone.ts                   (Pinecone client)
│   │   └── storage.ts                    (Vercel Blob)
│   │
│   ├── auth/
│   │   ├── nextauth.ts                   (NextAuth configuration)
│   │   ├── rbac.ts                       (RBAC middleware)
│   │   ├── session.ts                    (Session utilities)
│   │   └── guards.ts                     (requireAuth, requireTier, etc)
│   │
│   ├── db/
│   │   ├── prisma.ts                     (Prisma client singleton)
│   │   ├── queries.ts                    (Common queries)
│   │   ├── transactions.ts               (Transaction helpers)
│   │   └── seed.ts                       (Database seeding)
│   │
│   ├── api/
│   │   ├── rate-limit.ts                 (Token bucket)
│   │   ├── error-handler.ts              (Error formatting)
│   │   ├── validators.ts                 (Zod schemas)
│   │   └── response.ts                   (Response formatting)
│   │
│   ├── logging/
│   │   ├── logger.ts                     (Winston setup)
│   │   ├── audit.ts                      (Audit logging)
│   │   └── metrics.ts                    (Metrics tracking)
│   │
│   └── utils/
│       ├── constants.ts
│       └── helpers.ts
│
├── types/
│   ├── api.ts                            (API request/response types)
│   ├── models.ts                         (Domain models)
│   ├── db.ts                             (Database types)
│   ├── auth.ts                           (Auth types)
│   └── llm.ts                            (LLM types)
│
├── __tests__/
│   ├── api/
│   │   ├── chat.test.ts
│   │   ├── rag.test.ts
│   │   ├── auth.test.ts
│   │   └── agents.test.ts
│   │
│   ├── integration/
│   │   ├── chat-flow.test.ts
│   │   ├── rag-pipeline.test.ts
│   │   └── auth-flow.test.ts
│   │
│   ├── unit/
│   │   ├── router.test.ts
│   │   ├── chunking.test.ts
│   │   └── rate-limit.test.ts
│   │
│   └── e2e/
│       └── chat-complete-flow.test.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── .env.local                            (Local development)
├── .env.production                       (Production config)
├── .env.example
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## 📦 DEPENDENCIAS Y SETUP

### package.json Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",

    "ai": "^3.4.0",
    "@openai/api": "^4.50.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@google/generative-ai": "^0.10.0",
    "openai": "^4.52.0",

    "@pinecone-database/pinecone": "^3.0.0",
    "@prisma/client": "^5.7.0",

    "next-auth": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.1.0",

    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",

    "redis": "^4.6.0",
    "ioredis": "^5.3.0",

    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/jest": "^29.5.0",

    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0",

    "typescript-eslint": "^6.13.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",

    "tsx": "^4.7.0"
  }
}
```

### Environment Variables

```env
# .env.local
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cjhirashi_agents_dev

# LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...

# RAG
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west-2

# Storage
BLOB_READ_WRITE_TOKEN=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
```

### Initial Setup Commands

```bash
# 1. Clone repo (already done)
# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with real values

# 4. Setup database
npx prisma migrate dev --name init

# 5. Run development server
npm run dev

# 6. Run tests
npm run test

# 7. Build for production
npm run build
```

---

## 🧪 TESTING STRATEGY

### Testing Pyramid

```
        /\
       /  \  E2E Tests (10%)
      /    \  - Full chat flow
     /      \ - Auth + RAG
    /        \ Integration (30%)
   /          \ - Chat + DB
  /            \ - RAG pipeline
 /              \ Unit Tests (60%)
/________________\ - Router, chunking, etc
```

### Test Coverage Goals

```
Overall Coverage: > 80%

By Component:
- API Endpoints:        > 85%
- LLM Router:          > 90%
- RAG Pipeline:        > 85%
- Auth + RBAC:         > 90%
- Database Queries:    > 80%
- Utils:               > 75%
```

### Test Examples

#### Unit Test: LLM Router

```typescript
// __tests__/unit/router.test.ts
describe("LLM Router - Hybrid Algorithm", () => {
  describe("Score Calculation", () => {
    it("should calculate quality score based on model", () => {
      const score = getQualityScore("claude-3.5-sonnet", context);
      expect(score).toBeGreaterThan(0.9);
    });

    it("should boost Claude score for code tasks", () => {
      const codeContext = { prompt: "write Python code" };
      const score = getQualityScore("claude-3.5-sonnet", codeContext);
      expect(score).toBeGreaterThan(0.95);
    });

    it("should penalize slow models", () => {
      const slowModelContext = { avgLatency: 3000 };
      const score = getAvailabilityScore("slow-model", metrics);
      expect(score).toBeLessThan(0.8);
    });
  });

  describe("Tier Constraints", () => {
    it("FREE tier should only use economic models", () => {
      const constraints = getTierConstraints("FREE");
      expect(constraints).toContain("gemini-2.0-flash");
      expect(constraints).not.toContain("gpt-4o");
    });
  });

  describe("Fallback Strategy", () => {
    it("should retry with fallback model if primary fails", async () => {
      const response = await callModelWithFallback(routing, prompt, context);
      expect(response).toBeDefined();
    });

    it("should fail after 3 retries", async () => {
      await expect(
        callModelWithFallback(routingAllFails, prompt, context)
      ).rejects.toThrow("All models failed");
    });
  });
});
```

#### Integration Test: Chat Flow

```typescript
// __tests__/integration/chat-flow.test.ts
describe("Chat Flow - Integration", () => {
  it("should create session, send message, and get response", async () => {
    // 1. Create session
    const sessionRes = await request(app)
      .post("/api/v1/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test Chat" });

    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id;

    // 2. Send message with streaming
    const messageRes = await request(app)
      .post("/api/v1/chat/send")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId,
        message: "Hello, explain RAG",
        ragEnabled: true,
      });

    expect(messageRes.status).toBe(200);

    // 3. Verify message saved
    const messages = await db.message.findMany({ where: { sessionId } });
    expect(messages).toHaveLength(2); // user + assistant
  });

  it("should integrate RAG search with chat response", async () => {
    // Upload document
    const docRes = await uploadDocument(token, pdfFile);
    const docId = docRes.body.data.id;

    // Wait for indexing
    await sleep(2000);

    // Send question
    const chatRes = await request(app)
      .post("/api/v1/chat/send")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId,
        message: "What's in the document?",
        ragEnabled: true,
      });

    expect(chatRes.status).toBe(200);
    // Verify RAG context was used
  });
});
```

#### E2E Test: Complete Chat

```typescript
// __tests__/e2e/chat-complete-flow.test.ts
describe("E2E: Complete Chat Flow", () => {
  it("should handle full user journey: register -> chat -> rag -> response", async () => {
    // 1. Register
    const signupRes = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: "test@example.com",
        password: "TestPassword123!",
        name: "Test User",
      });
    expect(signupRes.status).toBe(201);
    const token = signupRes.body.data.token;

    // 2. Create session
    const sessionRes = await request(app)
      .post("/api/v1/chat/sessions")
      .set("Authorization", `Bearer ${token}`);
    const sessionId = sessionRes.body.data.id;

    // 3. Upload RAG document
    const docRes = await request(app)
      .post("/api/v1/rag/documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pdfPath);
    expect(docRes.status).toBe(201);

    // 4. Send chat message
    const chatRes = await request(app)
      .post("/api/v1/chat/send")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId,
        message: "Summarize the document",
        ragEnabled: true,
      });
    expect(chatRes.status).toBe(200);

    // 5. Get response
    const response = chatRes.body.data;
    expect(response.content).toBeTruthy();
    expect(response.tokensUsed).toBeGreaterThan(0);
    expect(response.cost).toBeGreaterThan(0);
  });
});
```

---

## ✅ CRITERIOS DE FINALIZACIÓN

### Criterios Técnicos

- [ ] **Chat API Funcional**
  - [ ] POST /api/v1/chat/send retorna SSE streaming
  - [ ] Streaming incluye eventos: start, chunk, done
  - [ ] Response headers correctos
  - [ ] Manejo de errores apropiado

- [ ] **All 58 Endpoints Implemented**
  - [ ] Authentication: 6/6 ✓
  - [ ] Chat: 6/6 ✓
  - [ ] Agents: 5/5 ✓
  - [ ] RAG: 4/4 ✓
  - [ ] Artifacts: 4/4 ✓
  - [ ] Users: 5/5 ✓
  - [ ] Admin: 4/4 ✓
  - [ ] Support: 3/3 ✓
  - [ ] MCP: 4/4 ✓
  - [ ] Storage: 5/5 ✓
  - [ ] Health: 6/6 ✓
  - [ ] Finance: 6/6 ✓

- [ ] **LLM Routing Hybrid Working**
  - [ ] Scores calculados correctamente
  - [ ] Tier constraints aplicados
  - [ ] Fallback strategy funciona
  - [ ] Timeout: 30s implementado
  - [ ] Cost tracking funciona

- [ ] **RAG Pipeline Funcional**
  - [ ] Documento upload working
  - [ ] Chunking preserva metadata
  - [ ] Embedding generation OK
  - [ ] Pinecone storage OK
  - [ ] Semantic search OK (threshold 0.7)
  - [ ] Context injection en prompts

- [ ] **Authentication & Security**
  - [ ] NextAuth setup completo
  - [ ] JWT tokens generados
  - [ ] RBAC middleware funciona
  - [ ] Rate limiting enforced
  - [ ] No secrets en logs

- [ ] **Testing Coverage > 80%**
  - [ ] Unit tests: 60%+
  - [ ] Integration tests: 30%+
  - [ ] E2E tests: 10%+
  - [ ] All critical paths tested
  - [ ] Error scenarios covered

### Criterios de Quality

- [ ] TypeScript strict mode: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Prettier: code formatted
- [ ] No console.logs en production code
- [ ] Logging strategy implemented
- [ ] Error messages user-friendly
- [ ] Performance: <2s latency p95
- [ ] Database queries optimized
- [ ] Zero N+1 queries

### Criterios de Documentation

- [ ] API documentation updated
- [ ] Code comments for complex logic
- [ ] README for backend setup
- [ ] Environment variables documented
- [ ] Database migration guide
- [ ] Deployment checklist

### Sign-Off Criteria

- [ ] All tests passing
- [ ] Code reviewed + approved
- [ ] Security review passed
- [ ] Performance SLAs met
- [ ] Documentation complete
- [ ] Ready for Fase 6 (Frontend)

---

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| LLM API rate limits/outages | Media | Alto | Fallback strategy, queue system, monitoring |
| Pinecone vector search slow | Baja | Medio | Proper indexing, caching, pre-computed embeddings |
| Large documents chunking issues | Baja | Medio | Robust parsing, fallback to simple chunking |
| SSE streaming connection drops | Media | Bajo | Automatic reconnect logic, client-side retry |
| Database connection pool exhaustion | Baja | Alto | Connection pooling, monitoring, alerts |
| Token counting inaccuracies | Baja | Medio | Validate against actual API response |
| Memory leak in streaming | Baja | Medio | Proper cleanup, memory monitoring |
| Auth token expiration edge cases | Media | Bajo | Refresh token logic, session refresh |

---

## 📅 CRONOGRAMA DETALLADO

### Semana 1: Infrastructure + Chat Basics

**Coder:**
- Day 1-2: Setup infraestructura (Prisma, Vercel AI, env)
- Day 3-5: Implementar Chat API básico (send, sessions CRUD)

**AI-Specialist:**
- Day 1-2: Hybrid router skeleton
- Day 3-5: Empezar integraciones modelo (Claude)

**Architect:**
- Daily: Oversight, code review, blocker resolution

**Deliverables:**
- Setup funcionando
- Chat API básica con 1 modelo
- Tests setup

### Semana 2: LLM Routing + RAG Pipeline

**Coder:**
- Day 1-3: NextAuth setup + RBAC
- Day 4-5: Rate limiting

**AI-Specialist:**
- Day 1-5: Complete router + RAG (embedding, chunking, search)

**Deliverables:**
- Hybrid router fully working
- 4 modelos integrados
- RAG pipeline completo
- Auth + rate limiting working

### Semana 3: Testing + Polish

**Coder:**
- Day 1-4: Tests (unit, integration, E2E)
- Day 5: Bug fixes, optimization

**Tester:**
- Day 1-5: Test planning, validation, edge cases

**Architect:**
- Daily: Final review, performance optimization

**Deliverables:**
- >80% test coverage
- All SLAs met
- Documentation complete
- Production ready

---

## 🚀 LISTO PARA DELEGAR

Este plan está listo para presentar a:
1. **coder** - Backend implementation lead
2. **ai-specialist** - LLM routing + RAG
3. **architect** - Oversight + validation
4. **tester** - Test strategy
5. **code-reviewer** - Quality assurance

**Próximo paso:** Crear tasks específicas para cada especialista basadas en este plan.

---

**FASE 5 IMPLEMENTATION PLAN READY FOR EXECUTION**

Documento generado: 2025-10-22
Estado: ✅ APROBADO PARA DELEGACIÓN
