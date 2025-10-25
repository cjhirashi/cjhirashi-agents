# Architecture Decision Records (ADRs)

Este directorio contiene la documentación de todas las decisiones arquitectónicas críticas tomadas durante el desarrollo de Cjhirashi.

**Última actualización**: 2025-10-23 (Fase 5)
**Total de ADRs**: 9 (6 fase 1-4, 3 fase 5)

---

## Índice de ADRs

### Fase 1-2: Foundation & Design

#### ADR-001: Vercel AI SDK para Multi-Modelo LLM
**Archivo**: `ADR-001-vercel-ai-sdk-multi-llm.md`
**Estado**: ✅ ACCEPTED
**Impacto**: CRÍTICO
**Resumen**: Decisión de usar Vercel AI SDK v4 como abstracción única para múltiples proveedores de LLM (Claude, Gemini, DeepSeek, GPT-4o). Proporciona type safety, streaming nativo, function calling, y DX excepcional. Alternativas rechazadas: LangChain (overhead), Direct API calls (repetición), Custom wrapper (mantenimiento).

**Componentes afectados**:
- `lib/ai/model-selector.ts` - Routing inteligente por tarea + tier
- `lib/ai/observability.ts` - Logging de requests + costos
- API routes de chat - Streaming SSE

---

#### ADR-002: PostgreSQL + Pinecone - Dual Database
**Archivo**: `ADR-002-postgresql-pinecone-dual-db.md`
**Estado**: ✅ ACCEPTED
**Impacto**: CRÍTICO
**Resumen**: Decisión de separar data transaccional (PostgreSQL) de vector embeddings (Pinecone). PostgreSQL maneja usuarios, sesiones, documentos, permisos. Pinecone maneja RAG embeddings para semantic search. Alternativa única evaluada (MongoDB single-db) rechazada por no ser optimal para vectors.

**Componentes afectados**:
- `lib/db/prisma.ts` - PostgreSQL client + schema
- `lib/rag/pinecone.ts` - Pinecone client + operations
- `schema.prisma` - Data model

---

#### ADR-003: Next.js API Routes (vs GraphQL/gRPC)
**Archivo**: `ADR-003-nextjs-api-routes.md`
**Estado**: ✅ ACCEPTED
**Impacto**: ALTO
**Resumen**: Decisión de usar Next.js API Routes como backend (REST) en lugar de GraphQL o gRPC. API Routes son native a Next.js, Vercel-optimized, zero-config deployment. Alternativas (GraphQL, gRPC) rechazadas por complejidad excesiva para MVP + integración imperfecta con Vercel serverless.

**Componentes afectados**:
- `app/api/**` - Todas las rutas API
- Middleware de autenticación y rate limiting

---

#### ADR-004: Artifact-Based Data Model
**Archivo**: `ADR-004-artifact-based-data-model.md`
**Estado**: ✅ ACCEPTED
**Impacto**: ALTO
**Resumen**: Decisión arquitectónica de modelar entidades (documentos, mensajes, análisis) como "artifacts" con metadata flexible. Permite schema evolution sin migrations, soporte para tipos heterogéneos. Alternativas (strict normalization, NoSQL) rechazadas.

**Componentes afectados**:
- `schema.prisma` - Modelo de artifacts + metadata
- `lib/storage/artifact-handler.ts` - Serialización/deserialización

---

### Fase 2-3: Integration & RAG

#### ADR-005: Pinecone para RAG + Embeddings
**Archivo**: `ADR-005-rag-pinecone-embeddings.md`
**Estado**: ✅ ACCEPTED
**Impacto**: CRÍTICO
**Resumen**: Decisión de usar Pinecone (vector database as a service) para RAG pipeline. Pinecone maneja embeddings, indexing, semantic search. Alternativas (Weaviate, Qdrant) rechazadas por costo y complejidad de hosting.

**Componentes afectados**:
- `lib/rag/pipeline.ts` - RAG pipeline completo
- `lib/rag/search.ts` - Semantic search queries
- Document loader + indexing

---

#### ADR-006: Server-Sent Events (SSE) para Chat Real-Time
**Archivo**: `ADR-006-sse-chat-realtime.md`
**Estado**: ✅ ACCEPTED
**Impacto**: CRÍTICO
**Resumen**: Decisión de usar SSE (Server-Sent Events) para streaming de tokens de chat. Serverless-native, simple, low-latency. Alternativas (WebSocket, Long Polling, gRPC-web) rechazadas por stateful requirements o complexity.

**Componentes afectados**:
- `app/api/v1/chat/send/route.ts` - Streaming endpoint
- `lib/chat/sse-client.ts` - Client-side SSE handling
- React `useChat()` hook

---

### Fase 5: API Implementation & Testing

#### ADR-007: pdf-parse Downgrade para Compatibilidad LangChain
**Archivo**: `ADR-007-pdf-parse-downgrade.md`
**Estado**: ✅ ACCEPTED
**Impacto**: MEDIO
**Resumen**: Decisión de downgradear pdf-parse de v2.4.5 a v1.1.1 para resolver incompatibilidad con LangChain PDFLoader. Build fallaba con module not found errors. Downgrade es pragmático, reversible post-MVP. Alternativas (workaround, cambiar librería) rechazadas por time constraints de MVP.

**Blocker resuelto**: Build failure durante Fase 5
**Timeline resolución**: < 1 hora
**Componentes afectados**:
- `package.json` - pdf-parse@1.1.1
- `lib/rag/document-loader.ts` - PDF extraction

**Revisión planificada**: Fase 3 (post-MVP) - evaluar upgrade a pdf-parse v2.5+ cuando sea stable

---

#### ADR-008: NextAuth v5 Type Extensions - Patrón de 3 Archivos
**Archivo**: `ADR-008-nextauth-type-extensions.md`
**Estado**: ✅ ACCEPTED
**Impacto**: MEDIO
**Resumen**: Decisión de implementar patrón de 3 archivos para type extensions de NextAuth v5: `auth.config.ts` (configuración), `src/lib/auth.ts` (handlers), `src/types/next-auth.d.ts` (type merging). Proporciona type safety 100%, separación de concerns, zero circular imports. Alternativas (single-file, two-file) rechazadas por TypeScript declaration merging requirements.

**Blocker resuelto**: TypeScript strict mode errors en Session + JWT custom fields
**Timeline resolución**: 2 horas
**Componentes afectados**:
- `auth.config.ts` - Configuración de NextAuth
- `src/lib/auth.ts` - Handlers y exportación
- `src/types/next-auth.d.ts` - Type extensions
- Admin endpoints - Acceso a session.user.role, permissions

---

#### ADR-009: Rate Limiting Strategy - Token Bucket + Upstash Redis
**Archivo**: `ADR-009-rate-limiting-strategy.md`
**Estado**: ✅ ACCEPTED
**Impacto**: CRÍTICO (Seguridad)
**Resumen**: Decisión de implementar Token Bucket algorithm con Upstash Redis para rate limiting distribuido, per-user, multi-tier. Soporta burst traffic, fairness, cost control. Multi-tier: Free (10 req/min), Pro (100 req/min), Enterprise (unlimited). Alternativas (Fixed Window, Sliding Log, Sliding Window) rechazadas por edge cases, scalability, o complexity.

**Blocker resuelto**: Falta de protección contra DDoS en API
**Componentes afectados**:
- `lib/rate-limit/middleware.ts` - Rate limit check per endpoint
- `lib/rate-limit/checker.ts` - Token bucket implementation (Lua script)
- API routes - Integración de middleware

**Configuración**: Upstash Redis free tier (generoso)

---

## Matriz de Decisiones

### Por Impacto

| Criticidad | ADR | Decisión | Alternativa Rechazada |
|-----------|-----|----------|----------------------|
| CRÍTICO | ADR-001 | Vercel AI SDK | LangChain (overhead) |
| CRÍTICO | ADR-002 | PostgreSQL + Pinecone | Single DB (no optimal para vectors) |
| CRÍTICO | ADR-006 | Server-Sent Events | WebSocket (stateful) |
| CRÍTICO | ADR-009 | Token Bucket + Redis | Fixed Window (edge cases) |
| ALTO | ADR-003 | Next.js API Routes | GraphQL (overkill) |
| ALTO | ADR-004 | Artifact-Based Model | Strict Normalization |
| ALTO | ADR-005 | Pinecone RAG | Weaviate (costo) |
| MEDIO | ADR-007 | pdf-parse v1.1.1 | Workaround LangChain |
| MEDIO | ADR-008 | NextAuth 3-File Pattern | Single-File (circular imports) |

### Por Fase

**Fase 1 (Foundation)**:
- ADR-001: Vercel AI SDK
- ADR-002: PostgreSQL + Pinecone
- ADR-003: Next.js API Routes

**Fase 2 (Architecture)**:
- ADR-004: Artifact-Based Data Model

**Fase 3 (Integration)**:
- ADR-005: Pinecone RAG
- ADR-006: Server-Sent Events

**Fase 5 (API Implementation)**:
- ADR-007: pdf-parse Downgrade
- ADR-008: NextAuth Type Extensions
- ADR-009: Rate Limiting Strategy

---

## Cómo Leer un ADR

Cada ADR sigue estructura estándar:

1. **Estado**: ACCEPTED, PENDING, REJECTED, DEPRECATED
2. **Contexto**: Problema a resolver + requisitos
3. **Decisión**: Qué se eligió + por qué
4. **Alternativas**: Opciones evaluadas + puntuación (scoring)
5. **Consecuencias**: Impactos positivos y negativos
6. **Validación**: Cómo se validó la decisión
7. **Referencias**: Links a documentación relacionada
8. **Historial**: Timeline de la decisión

---

## Próximas Decisiones Arquitectónicas (Roadmap)

### Fase 6 (User Management)
- [ ] **ADR-010**: Session Strategy (JWT vs Server-side + cookies)
- [ ] **ADR-011**: User Tier System (Free, Pro, Enterprise)

### Fase 7 (Optimization)
- [ ] **ADR-012**: Caching Strategy (Redis vs Vercel KV vs Edge Cache)
- [ ] **ADR-013**: Search Optimization (Full-text search vs Pinecone hybrid)

### Fase 8 (Scaling)
- [ ] **ADR-014**: Database Sharding Strategy
- [ ] **ADR-015**: Multi-region Deployment

### Fase 9 (Production)
- [ ] **ADR-016**: Disaster Recovery & Backup
- [ ] **ADR-017**: Monitoring & Observability Stack

---

## Cómo Agregar un Nuevo ADR

### Proceso

1. **Identificar decisión arquitectónica crítica** (no todas las decisiones necesitan ADR)
2. **Crear archivo**: `ADR-NNN-titulo-descriptivo.md`
3. **Llenar template**:
   - Estado: PENDING (al inicio)
   - Contexto: Problema + requisitos
   - Decisiones evaluadas: Mínimo 3 alternativas
   - Scoring: 1-10 para cada alternativa
   - Justificación: Por qué la elegida gana
   - Consecuencias: Positivas + negativas

4. **Agregar referencia aquí** (README.md)
5. **Revisar con architect** (antes de ACCEPTED)
6. **Commit a main** (documentación vive en git)

### Template

```markdown
# ADR-NNN: [Título Decisión]

## Estado
**PENDING** - En evaluación

## Contexto
### Problema a Resolver
[Descripción clara del problema]

### Requisitos Críticos
1. [Req 1]
2. [Req 2]

## Decisión
[Qué se decidió + justificación breve]

## Alternativas Consideradas

### Opción A: [Nombre]
**Pros**: ...
**Contras**: ...
**Score: X/10**
**Decisión**: Rechazado - [Por qué]

### Opción B: [Elegida]
**Score: 9/10**
**Justificación**: [Por qué gana]

## Consecuencias

### Positivas
1. [Beneficio 1]

### Negativas
1. [Costo 1]

## Validación e Implementación

### Métricas de Éxito
| Métrica | Target |
|---------|--------|
| [Métrica 1] | [Target] |

## Referencias
- [Link 1]

## Historial de Decisión
- **Creada**: [Fecha]
- **Aprobada**: [Fecha]
```

---

## Preguntas Frecuentes

**P: ¿Por qué no usar MongoDB en lugar de PostgreSQL?**
A: ADR-002 explica. PostgreSQL es mejor para datos transaccionales (usuarios, permisos). Pinecone maneja vectors. Single DB fue considerado, rechazado.

**P: ¿Por qué no WebSocket para chat?**
A: ADR-006 explica. WebSocket es stateful, incompatible con Vercel serverless. SSE es HTTP-based, stateless, funciona perfectly con Vercel Edge.

**P: ¿Se puede cambiar estas decisiones?**
A: Sí, pero cada cambio crea debt técnico. Las decisiones están documentadas para entender trade-offs. Si futuro contexto cambia (escala, requirements), se puede crear ADR de deprecation + nueva decisión.

**P: ¿Qué pasa si descubrimos que una decisión fue mala?**
A: Se documenta como DEPRECATED con explicación. Se crea nuevo ADR para decisión alternativa. Ejemplo: Si Vercel AI SDK cause problems críticos, migraríamos a direct APIs (documentado como ADR-001-deprecated, ADR-001-B-direct-apis).

---

## Documentos Relacionados

- **SYSTEM.md** - Arquitectura de 7 capas del sistema
- **01-system-architecture.md** - Visión general de componentes
- **02-layers.md** - Capas arquitectónicas detalladas
- **03-request-flow.md** - Flujos de request de usuario

---

**Mantenido por**: Architecture Team
**Última revisión**: 2025-10-23
**Próxima revisión**: 2025-10-30 (final de Fase 5)
