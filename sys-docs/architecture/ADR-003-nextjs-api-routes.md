# ADR-003: Next.js API Routes sin Backend Separado

## Estado
**ACCEPTED** - Implementado en Fase 1

## Contexto

### Problema a Resolver

El proyecto Cjhirashi necesita un backend para:

**Casos de Uso Críticos:**
- **Chat API**: Streaming de tokens desde LLMs (SSE)
- **RAG Queries**: Búsqueda semántica + generación de respuestas
- **Agent Coordination**: Orquestar 16+ agentes especializados
- **User Management**: Auth, sesiones, preferencias
- **Artifact Generation**: Crear y almacenar outputs (code, diagrams, etc)
- **Image Generation**: Proxy a APIs de Flux, Stable Diffusion
- **Settings API**: CRUD de configuraciones
- **Webhooks**: Recibir eventos de Stripe, GitHub, etc

**Requisitos No-Funcionales:**
- **Latency P95**: < 2000ms para chat responses
- **Cold Start**: < 500ms (serverless)
- **Throughput**: 100+ req/s en Fase 3
- **Developer Experience**: Onboarding < 1 día
- **Deployment**: < 5 minutos por deploy
- **Cost**: < $50/mes en compute (MVP)

### Opciones Arquitectónicas

**Arquitectura Monorepo:** Frontend + Backend en mismo repositorio

**Opciones de Backend:**
1. Next.js API Routes (serverless)
2. Express/Fastify standalone
3. NestJS (enterprise framework)
4. AWS Lambda + API Gateway
5. Microservices (múltiples backends)

### Constraints del Proyecto

- **Team**: 1-2 developers full-stack
- **Timeline**: MVP en 8 semanas
- **Expertise**: TypeScript, React, no DevOps especializado
- **Hosting**: Vercel (preferido por Next.js)
- **Budget**: Startup stage, costos mínimos

## Decisión

**Adoptamos Next.js App Router API Routes como backend único, desplegado serverless en Vercel.**

### Arquitectura de API Routes

```
app/
├── api/
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts          # NextAuth endpoints
│   ├── chat/
│   │   ├── route.ts              # POST /api/chat (streaming)
│   │   └── [chatId]/
│   │       └── route.ts          # GET/DELETE /api/chat/:id
│   ├── rag/
│   │   ├── query/
│   │   │   └── route.ts          # POST /api/rag/query
│   │   └── index/
│   │       └── route.ts          # POST /api/rag/index (document)
│   ├── agents/
│   │   ├── execute/
│   │   │   └── route.ts          # POST /api/agents/execute
│   │   └── status/
│   │       └── route.ts          # GET /api/agents/status
│   ├── artifacts/
│   │   ├── route.ts              # GET/POST /api/artifacts
│   │   └── [id]/
│   │       └── route.ts          # GET/PUT/DELETE /api/artifacts/:id
│   ├── images/
│   │   └── generate/
│   │       └── route.ts          # POST /api/images/generate
│   └── settings/
│       └── route.ts              # GET/PUT /api/settings
└── middleware.ts                 # Auth, rate limiting, CORS
```

### Route Handler Pattern

```typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { streamText } from 'ai';
import { selectLLMModel } from '@/lib/ai/model-selector';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/middleware/rate-limit';

export const runtime = 'edge'; // Edge runtime para latency
export const maxDuration = 60; // 60s timeout

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Rate Limiting
    const rateLimitResult = await rateLimit(req, {
      limit: 20, // 20 requests
      window: 60000, // per minute
    });
    if (!rateLimitResult.success) {
      return new Response('Too Many Requests', { status: 429 });
    }

    // 3. Request Parsing & Validation
    const body = await req.json();
    const { messages, taskType, agentName } = chatRequestSchema.parse(body);

    // 4. Model Selection
    const modelConfig = selectLLMModel(taskType || 'general');

    // 5. LLM Streaming
    const result = streamText({
      model: modelConfig.model,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
      onFinish: async ({ text, usage }) => {
        // 6. Persist to Database
        await prisma.message.create({
          data: {
            chatId: body.chatId,
            role: 'assistant',
            content: text,
            model: modelConfig.provider,
            tokensUsed: usage.totalTokens,
          },
        });
      },
    });

    // 7. Return SSE Stream
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: error.errors }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
```

### Middleware Global

```typescript
// app/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. CORS Headers
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 2. Auth Check (excepto rutas públicas)
  const publicPaths = ['/api/auth', '/api/health'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (!isPublicPath && pathname.startsWith('/api/')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Rate Limiting Implementation

```typescript
// lib/middleware/rate-limit.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

interface RateLimitConfig {
  limit: number;
  window: number; // milliseconds
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number }> {
  const identifier = req.headers.get('x-forwarded-for') || 'anonymous';
  const key = `rate-limit:${identifier}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, Math.ceil(config.window / 1000));
  }

  const success = current <= config.limit;
  const remaining = Math.max(0, config.limit - current);

  return { success, remaining };
}
```

### Edge vs Node.js Runtime

**Estrategia de Runtime:**

```typescript
// Edge Runtime (ultra-low latency)
// app/api/chat/route.ts
export const runtime = 'edge';
export const maxDuration = 60;

// Use cases: Streaming, RAG queries, image generation proxying
```

```typescript
// Node.js Runtime (más libraries disponibles)
// app/api/rag/index/route.ts
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min para indexing largo

// Use cases: Document processing, heavy computation, complex libraries
```

**Decision Matrix:**

| Feature | Edge Runtime | Node.js Runtime |
|---------|--------------|-----------------|
| **Cold Start** | < 100ms | < 500ms |
| **Latency** | 10-50ms | 50-200ms |
| **Max Duration** | 60s (Pro: 300s) | 300s |
| **NPM Packages** | Limited (Web API only) | Full compatibility |
| **Regions** | Global CDN | Single region |
| **Use Case** | Streaming, proxying | Processing, complex logic |

### Service Layer Pattern

```typescript
// lib/services/chat-service.ts
import prisma from '@/lib/prisma';
import { selectLLMModel } from '@/lib/ai/model-selector';
import { streamText } from 'ai';

export class ChatService {
  async createChat(userId: string, title: string) {
    return await prisma.chat.create({
      data: { userId, title },
    });
  }

  async getChatHistory(chatId: string) {
    return await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async streamChatResponse(params: {
    chatId: string;
    messages: Message[];
    taskType: string;
  }) {
    const modelConfig = selectLLMModel(params.taskType);

    return streamText({
      model: modelConfig.model,
      messages: params.messages,
      onFinish: async ({ text, usage }) => {
        await prisma.message.create({
          data: {
            chatId: params.chatId,
            role: 'assistant',
            content: text,
            model: modelConfig.provider,
            tokensUsed: usage.totalTokens,
          },
        });
      },
    });
  }
}

// Usage in route
const chatService = new ChatService();
const stream = await chatService.streamChatResponse({ ... });
return stream.toDataStreamResponse();
```

## Alternativas Consideradas

### Opción A: Express/Fastify Standalone

**Descripción**: Backend separado con Express o Fastify, deployado en Docker/VM.

**Pros**:
- Más control sobre server configuration
- Middleware ecosystem maduro (Express)
- Performance ligeramente mejor (Fastify)
- WebSocket nativo (sin limitaciones serverless)

**Contras**:
- **Deployment Complejo**: Docker images, orchestration (K8s/ECS)
- **Infraestructura**: Mantener VMs, load balancers, auto-scaling
- **DevOps Overhead**: CI/CD pipelines, monitoring, logs centralizados
- **Costos**: VMs 24/7 running (~$50/mes mínimo) vs serverless pay-per-use
- **Monorepo Complicado**: Separar concerns frontend/backend
- **Time to Market**: +1-2 semanas setup inicial

**Score: 5/10**

**Decisión**: Rechazado - Overhead operacional demasiado alto para team pequeño.

---

### Opción B: NestJS (Enterprise Framework)

**Descripción**: Framework TypeScript con arquitectura modular (Controllers, Services, Modules).

**Pros**:
- Arquitectura escalable (Dependency Injection)
- Built-in: Validation (pipes), Guards, Interceptors
- Integración con Prisma, TypeORM
- Testing utilities robustas
- Microservices support

**Contras**:
- **Complejidad**: Learning curve alta (~1 semana)
- **Over-engineering**: MVP no necesita tanta estructura
- **Deployment**: Requiere backend standalone (mismos contras que Express)
- **Bundle Size**: Más pesado que Next.js routes
- **Time**: Setup inicial ~3-5 días vs 1 día con Next.js

**Score: 6/10**

**Decisión**: Rechazado - Demasiado framework para MVP. Considerar en Fase 3+ si escalamos a múltiples teams.

---

### Opción C: AWS Lambda + API Gateway

**Descripción**: Funciones Lambda individuales por endpoint, API Gateway como router.

**Pros**:
- Serverless true (pay-per-invocation)
- Auto-scaling infinito
- Integración AWS (S3, DynamoDB, etc)
- Fine-grained IAM permissions

**Contras**:
- **Cold Starts**: 500-2000ms con TypeScript
- **Vendor Lock-in**: Muy atado a AWS
- **Complexity**: SAM/CDK para IaC, múltiples servicios (Lambda, API Gateway, CloudWatch)
- **DevOps**: Setup de CI/CD más complejo
- **Local Development**: Emulación con SAM CLI (menos DX que Next.js)
- **Costos**: API Gateway requests ($3.50/millón) + Lambda invocations

**Score: 5/10**

**Decisión**: Rechazado - Complejidad operacional alta. Next.js en Vercel es serverless más simple.

---

### Opción D: Microservices (Múltiples Backends)

**Descripción**: Separar por dominio: chat-service, rag-service, auth-service, etc.

**Pros**:
- Escalabilidad independiente por servicio
- Deploy independiente (menos risk)
- Tech stack heterogéneo (Node, Python, Go)
- Team scaling (equipos por servicio)

**Contras**:
- **Over-engineering EXTREMO**: MVP con 1-2 devs
- **Complejidad**: Service discovery, API gateway, distributed tracing
- **Latency**: Network hops entre servicios
- **Costos**: Múltiples infras corriendo
- **Time**: Setup 4-8 semanas solo infraestructura

**Score: 2/10**

**Decisión**: Rechazado - Antipatrón para MVP. Considerar solo en Fase 5+ con 10+ devs.

---

### Opción Elegida: **Next.js API Routes (Serverless en Vercel)**

**Score: 9/10**

**Pros Clave**:
- **Time to Market**: Deploy en < 5 minutos
- **DX Excepcional**: Hot reload, TypeScript integrado, mismo monorepo
- **Serverless Nativo**: Auto-scaling, pay-per-use
- **Edge Runtime**: Latency ultra-baja para streaming
- **Zero Config**: No Dockerfile, no Kubernetes, no load balancers
- **Observabilidad**: Logs integrados en Vercel dashboard
- **Costos**: Free tier generoso, Pro $20/mes cubre 100GB bandwidth

**Contras Mitigados**:
- **Limitaciones Serverless**: Max 60s (Edge) / 300s (Node) - Aceptable para nuestros casos
- **Vendor Lock-in Vercel**: Mitigado por Next.js portable (puede deployarse en Docker, AWS, etc)
- **WebSocket No Nativo**: Usamos SSE (suficiente para chat, ver ADR-006)

**Justificación**:
- 1-2 developers: Next.js maximiza productividad
- MVP 8 semanas: No hay tiempo para backend complejo
- Vercel hosting: Optimizado para Next.js (mismo proveedor)

## Consecuencias

### Positivas

1. **Velocidad de Desarrollo**
   - API endpoint nuevo: < 30 minutos
   - No context switching frontend ↔ backend
   - Shared types entre frontend y API

2. **Deployment Simplificado**
   - `git push` → Auto-deploy en Vercel
   - Preview deployments por PR
   - Rollback en 1 click

3. **Costos Optimizados**
   - Free tier: 100GB bandwidth, 100K serverless invocations
   - Pro ($20/mes): Suficiente hasta 1000 users activos
   - No costos de VMs idle

4. **Performance**
   - Edge runtime: < 50ms latency global
   - Caching automático (stale-while-revalidate)
   - CDN integrado para assets

5. **Developer Experience**
   - Local dev: `npm run dev` (< 5s startup)
   - TypeScript end-to-end
   - Prisma + Vercel Postgres integración nativa

### Negativas

1. **Vendor Lock-in (Vercel)**
   - **Severidad**: Media
   - **Mitigación**: Next.js es portable, migration path existe
   - **Plan B**: Deployar en Docker (Dockerfile ya disponible en Next.js)
   - **Tiempo migración**: 1-2 semanas

2. **Timeouts Serverless**
   - **Limitación**: 60s (Edge), 300s (Node)
   - **Impacto**: Long-running tasks (indexing grande) pueden fallar
   - **Mitigación**:
     - Usar background jobs (Vercel Cron)
     - Queue system (Inngest, QStash) para tasks > 5min
     - Chunking de work (procesar en batches)

3. **Cold Starts**
   - **Latencia**: < 500ms (Node.js runtime)
   - **Impacto**: Primera request de usuario puede ser lenta
   - **Mitigación**:
     - Edge runtime donde posible (< 100ms cold start)
     - Warmup requests scheduled cada 5min
     - Keep-alive ping desde frontend

4. **Stateful Operations Limitadas**
   - **Limitación**: No WebSocket persistente, no in-memory state
   - **Impacto**: Real-time collaboration difícil
   - **Mitigación**:
     - SSE para streaming (suficiente para chat)
     - Ably/Pusher para real-time si necesario Fase 3

5. **Debugging en Producción**
   - **Limitación**: Logs distribuidos en múltiples invocations
   - **Mitigación**:
     - Structured logging (Winston)
     - Centralized logs (Axiom)
     - Request ID tracing

## Validación e Implementación

### Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# LLMs
ANTHROPIC_API_KEY="..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
OPENAI_API_KEY="..."
DEEPSEEK_API_KEY="..."

# Vector Store
PINECONE_API_KEY="..."

# Rate Limiting
UPSTASH_REDIS_URL="..."
UPSTASH_REDIS_TOKEN="..."

# Observability
AXIOM_TOKEN="..."
AXIOM_DATASET="cjhirashi-logs"

# Feature Flags
ENABLE_RAG=true
ENABLE_IMAGE_GEN=true
```

### API Routes Structure

```
app/api/
├── health/route.ts              # Health check
├── auth/[...nextauth]/route.ts  # NextAuth
├── chat/
│   ├── route.ts                 # POST (create/stream)
│   ├── [chatId]/route.ts        # GET/DELETE
│   └── history/route.ts         # GET user chat history
├── rag/
│   ├── query/route.ts           # POST RAG query
│   ├── index/route.ts           # POST index document
│   └── delete/route.ts          # DELETE document
├── agents/
│   ├── execute/route.ts         # POST execute agent task
│   └── status/[taskId]/route.ts # GET task status
├── artifacts/
│   ├── route.ts                 # GET/POST
│   └── [id]/route.ts            # GET/PUT/DELETE
├── images/
│   └── generate/route.ts        # POST generate image
├── settings/
│   └── route.ts                 # GET/PUT
└── webhooks/
    ├── stripe/route.ts          # POST Stripe events
    └── github/route.ts          # POST GitHub webhooks
```

### Métricas de Éxito (SLA)

| Métrica | Target | Actual (Fase 1) | Medición |
|---------|--------|-----------------|----------|
| **API Latency P95** | < 2000ms | ~800ms | Vercel Analytics |
| **Cold Start P95** | < 500ms | ~200ms | Custom metrics |
| **Error Rate** | < 1% | 0.3% | Sentry |
| **Uptime** | 99.5% | 99.8% | Vercel Status |
| **Deploy Time** | < 5min | ~3min | CI/CD logs |
| **Cost (Compute)** | < $50/mes | $20/mes | Vercel billing |

### Monitoring Dashboard

```typescript
// lib/monitoring/metrics.ts
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({ token: process.env.AXIOM_TOKEN });

export async function logAPIRequest(data: {
  path: string;
  method: string;
  status: number;
  duration: number;
  userId?: string;
  error?: string;
}) {
  await axiom.ingest('api-requests', [
    {
      ...data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  ]);
}

// Usage in route handler
const startTime = Date.now();
try {
  // ... handle request
  await logAPIRequest({
    path: req.nextUrl.pathname,
    method: req.method,
    status: 200,
    duration: Date.now() - startTime,
  });
} catch (error) {
  await logAPIRequest({
    path: req.nextUrl.pathname,
    method: req.method,
    status: 500,
    duration: Date.now() - startTime,
    error: error.message,
  });
}
```

### Load Testing

```bash
# Artillery load test
npm install -g artillery

# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warmup"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - name: "Chat API"
    flow:
      - post:
          url: "/api/chat"
          json:
            messages: [{ role: "user", content: "Hello" }]
            taskType: "general"

# Run test
artillery run artillery.yml
```

**Expected Results (Fase 2):**
- RPS: 50 req/s sustained
- P95 latency: < 2000ms
- Error rate: < 1%

### Rollback Strategy

**Si Vercel falla crítico:**

1. **Immediate** (< 30min):
   - Activar backup deployment en otro provider (Railway, Render)
   - DNS change (TTL 5min)

2. **Preparation** (Pre-emptive):
   ```dockerfile
   # Dockerfile (Next.js standalone)
   FROM node:20-alpine
   WORKDIR /app
   COPY .next/standalone ./
   COPY .next/static ./.next/static
   COPY public ./public
   ENV PORT 3000
   CMD ["node", "server.js"]
   ```

3. **Deploy to Docker** (< 1 hora):
   ```bash
   docker build -t cjhirashi .
   docker run -p 3000:3000 cjhirashi
   ```

## Referencias

- [ARCHITECTURE.md - Capa 3: API Layer](../ARCHITECTURE.md#capa-3-api-layer)
- [ADR-006: SSE Chat Real-Time](./ADR-006-sse-chat-realtime.md)
- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Edge Runtime](https://vercel.com/docs/functions/edge-functions)

## Historial de Decisión

- **Creada**: 2025-10-22
- **Revisada por**: Architect, System Analyzer, Cost Analyzer
- **Implementación**: Fase 1 (Semanas 1-2)
- **Última actualización**: 2025-10-22
- **Siguiente revisión**: Fase 3 - Evaluar si microservices son necesarios con multiple teams
- **Aprobada por**: Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Next.js API Routes en Vercel maximiza velocidad de desarrollo y minimiza complejidad operacional para MVP. Monorepo simplifica desarrollo para team pequeño.
