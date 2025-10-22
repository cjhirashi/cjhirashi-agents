# ADR-002: PostgreSQL + Pinecone Dual Database Architecture

## Estado
**ACCEPTED** - Implementado en Fase 1

## Contexto

### Problema a Resolver

El sistema Cjhirashi requiere dos tipos fundamentalmente diferentes de almacenamiento:

**1. Datos Relacionales Estructurados:**
- Usuarios, sesiones, autenticación
- Chats, mensajes, artifacts
- Configuraciones, preferencias
- Historial de interacciones
- Relaciones complejas (1:N, N:M)
- Transacciones ACID
- Consultas SQL complejas con JOINs

**2. Búsqueda Semántica de Alta Performance:**
- Embeddings de documentos (RAG knowledge base)
- Búsqueda por similitud vectorial (cosine similarity)
- Filtrado por metadata (source, date, author)
- Latency crítica: < 500ms P95
- Escalabilidad: 100K+ documentos
- Actualizaciones frecuentes de índice

**Requisitos Críticos:**

- **ACID Compliance**: Transacciones críticas (pagos, auth) requieren garantías fuertes
- **Low Latency RAG**: Búsquedas semánticas < 500ms para UX fluida
- **Type Safety**: Schema validado con TypeScript + Prisma
- **Escalabilidad**: 10K users en Fase 3, 100K+ docs en knowledge base
- **Costos Controlados**: Budget mensual < $100 en databases (startup stage)
- **Backup/Recovery**: RPO < 1 hora, RTO < 4 horas
- **Developer Experience**: Migraciones fáciles, queries type-safe

### Limitaciones del Proyecto

- **Budget**: $50-100/mes máximo en databases
- **Team Size**: 1-2 devs, no DBA dedicado
- **Timeline**: MVP en 8 semanas
- **Compliance**: No PII sensible aún (fase futura)

## Decisión

**Adoptamos arquitectura dual database:**
1. **PostgreSQL (Neon Serverless)** para datos relacionales
2. **Pinecone (Serverless Tier)** para embeddings y búsqueda vectorial

### Arquitectura de Integración

```
┌─────────────────────────────────────────────────────┐
│                  Next.js App                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────┐    ┌──────────────────┐    │
│  │  Prisma Client    │    │  Pinecone Client │    │
│  │  (ORM)            │    │  (Vector Store)  │    │
│  └────────┬──────────┘    └────────┬─────────┘    │
│           │                        │              │
└───────────┼────────────────────────┼──────────────┘
            │                        │
            ▼                        ▼
   ┌────────────────┐       ┌───────────────┐
   │  PostgreSQL    │       │   Pinecone    │
   │  (Neon)        │       │   Serverless  │
   │                │       │               │
   │  - Users       │       │  - Embeddings │
   │  - Chats       │       │  - Metadata   │
   │  - Messages    │       │  - Index      │
   │  - Artifacts   │       │               │
   └────────────────┘       └───────────────┘
         ACID                  Vector Search
     Relational               Cosine Similarity
```

### PostgreSQL Schema (Prisma)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================
// AUTHENTICATION & USERS
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?

  // Relations
  accounts      Account[]
  sessions      Session[]
  chats         Chat[]
  artifacts     Artifact[]
  settings      UserSettings?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ============================================
// CHAT & CONVERSATIONS
// ============================================

model Chat {
  id          String   @id @default(cuid())
  title       String
  userId      String
  archived    Boolean  @default(false)

  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    Message[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([createdAt])
}

model Message {
  id          String   @id @default(cuid())
  chatId      String
  role        String   // 'user', 'assistant', 'system'
  content     String   @db.Text

  // Metadata
  model       String?  // LLM usado
  tokensUsed  Int?
  latencyMs   Int?

  // Relations
  chat        Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  artifacts   Artifact[]

  createdAt   DateTime @default(now())

  @@index([chatId])
  @@index([createdAt])
}

// ============================================
// ARTIFACTS (Flexible Output)
// ============================================

model Artifact {
  id          String   @id @default(cuid())
  messageId   String?
  userId      String

  // Core Fields
  type        String   // 'code', 'json', 'html', 'markdown', 'diagram', 'image', 'latex', 'table'
  title       String?
  content     String   @db.Text
  language    String?  // Para code: 'typescript', 'python', etc

  // Metadata (JSONB)
  metadata    Json?    // Flexible metadata por tipo

  // Blob Storage (para files grandes)
  blobUrl     String?  // Vercel Blob URL si > 1MB
  blobSize    Int?     // Bytes

  // Relations
  message     Message? @relation(fields: [messageId], references: [id], onDelete: SetNull)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([type])
  @@index([createdAt])
}

// ============================================
// SETTINGS & PREFERENCES
// ============================================

model UserSettings {
  id                  String  @id @default(cuid())
  userId              String  @unique

  // LLM Preferences
  defaultModel        String  @default("gemini-2.0-flash")
  temperature         Float   @default(0.7)
  maxTokens           Int     @default(4096)

  // UI Preferences
  theme               String  @default("system")
  language            String  @default("es")
  codeTheme           String  @default("vs-dark")

  // RAG Settings
  ragEnabled          Boolean @default(true)
  ragTopK             Int     @default(5)
  ragMinScore         Float   @default(0.7)

  // Notifications
  emailNotifications  Boolean @default(true)

  user                User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// ============================================
// RAG METADATA (PostgreSQL side)
// ============================================

model Document {
  id          String   @id @default(cuid())
  userId      String?  // null = public docs

  // Document Info
  title       String
  source      String   // 'upload', 'url', 'api', 'system'
  sourceUrl   String?
  mimeType    String?

  // Indexing
  indexed     Boolean  @default(false)
  vectorIds   String[] // Array de Pinecone vector IDs
  chunkCount  Int      @default(0)

  // Metadata
  tags        String[]
  metadata    Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([indexed])
  @@index([createdAt])
}
```

### Pinecone Configuration

```typescript
// lib/pinecone/client.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const PINECONE_CONFIG = {
  indexName: 'cjhirashi-knowledge',
  dimension: 1536, // Cohere embed-multilingual-v3.0
  metric: 'cosine',
  cloud: 'aws',
  region: 'us-east-1',
} as const;

export async function initPineconeIndex() {
  const indexes = await pinecone.listIndexes();

  const indexExists = indexes.indexes?.some(
    (index) => index.name === PINECONE_CONFIG.indexName
  );

  if (!indexExists) {
    await pinecone.createIndex({
      name: PINECONE_CONFIG.indexName,
      dimension: PINECONE_CONFIG.dimension,
      metric: PINECONE_CONFIG.metric,
      spec: {
        serverless: {
          cloud: PINECONE_CONFIG.cloud,
          region: PINECONE_CONFIG.region,
        },
      },
    });
  }

  return pinecone.index(PINECONE_CONFIG.indexName);
}

// Vector operations
export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>
) {
  const index = await initPineconeIndex();

  return await index.upsert(vectors);
}

export async function queryVectors(
  queryVector: number[],
  topK: number = 5,
  filter?: Record<string, any>
) {
  const index = await initPineconeIndex();

  return await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
    filter,
  });
}

export async function deleteVectors(ids: string[]) {
  const index = await initPineconeIndex();

  return await index.deleteMany(ids);
}
```

### Metadata Schema en Pinecone

```typescript
// Estructura de metadata almacenada con cada vector
interface PineconeMetadata {
  // Identificación
  documentId: string;        // Referencia a Document en PostgreSQL
  chunkIndex: number;        // Índice del chunk dentro del documento

  // Contenido
  text: string;              // Texto original del chunk (< 40KB)
  title: string;             // Título del documento

  // Source
  source: 'upload' | 'url' | 'api' | 'system';
  sourceUrl?: string;

  // User context
  userId?: string;           // null para docs públicos

  // Temporal
  createdAt: number;         // Unix timestamp

  // Tags para filtrado
  tags: string[];
  language: string;          // 'es', 'en', etc.

  // Custom metadata
  [key: string]: any;
}
```

### Sync Strategy (PostgreSQL ↔ Pinecone)

```typescript
// lib/rag/sync.ts
import prisma from '@/lib/prisma';
import { upsertVectors, deleteVectors } from '@/lib/pinecone/client';
import { generateEmbedding } from '@/lib/embeddings/cohere';

export async function indexDocument(documentId: string) {
  // 1. Fetch document from PostgreSQL
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc) throw new Error('Document not found');

  // 2. Load content (from blob if necessary)
  const content = await loadDocumentContent(doc);

  // 3. Chunk content
  const chunks = chunkText(content, {
    maxChunkSize: 512,
    overlap: 50,
  });

  // 4. Generate embeddings (batch)
  const embeddings = await generateEmbedding(chunks);

  // 5. Prepare vectors
  const vectors = chunks.map((chunk, idx) => ({
    id: `${documentId}-chunk-${idx}`,
    values: embeddings[idx],
    metadata: {
      documentId,
      chunkIndex: idx,
      text: chunk,
      title: doc.title,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      userId: doc.userId,
      createdAt: Date.now(),
      tags: doc.tags,
      language: 'es',
    },
  }));

  // 6. Upsert to Pinecone
  await upsertVectors(vectors);

  // 7. Update PostgreSQL status
  await prisma.document.update({
    where: { id: documentId },
    data: {
      indexed: true,
      vectorIds: vectors.map(v => v.id),
      chunkCount: chunks.length,
    },
  });

  return { vectorCount: vectors.length };
}

export async function deleteDocument(documentId: string) {
  // 1. Fetch vector IDs from PostgreSQL
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { vectorIds: true },
  });

  if (!doc || !doc.vectorIds.length) return;

  // 2. Delete from Pinecone
  await deleteVectors(doc.vectorIds);

  // 3. Delete from PostgreSQL
  await prisma.document.delete({
    where: { id: documentId },
  });
}
```

## Alternativas Consideradas

### Opción A: PostgreSQL Solo (con pgvector)

**Descripción**: Usar extensión pgvector de PostgreSQL para búsqueda vectorial.

**Pros**:
- Base de datos única (menos complejidad operacional)
- Transacciones ACID para todo
- Sin costos adicionales de Pinecone
- Queries SQL unificados (JOINs directos)
- No necesita sincronización entre DBs

**Contras**:
- **Performance**: pgvector es ~5-10x más lento que Pinecone en queries
  - Pinecone: ~50-100ms P95
  - pgvector: ~300-500ms P95 (con índice HNSW)
- **Escalabilidad**: Degradación con > 100K vectores
- **Índice**: Construcción de HNSW puede tomar horas con datasets grandes
- **Hosted Support**: Neon no soporta pgvector en tier gratuito (requiere Pro: $69/mes)
- **Expertise**: Tuning de HNSW (m, efConstruction) requiere conocimiento especializado

**Score: 6/10**

**Decisión**: Rechazado - Latency crítica para UX. Pinecone especializado es superior.

---

### Opción B: MongoDB + Pinecone

**Descripción**: MongoDB Atlas para datos + Pinecone para vectores.

**Pros**:
- Esquema flexible (JSON nativo)
- Agregaciones potentes
- Sharding horizontal fácil
- Full-text search built-in

**Contras**:
- **No ACID Multi-Document**: Transacciones limitadas vs PostgreSQL
- **Type Safety**: Sin soporte Prisma maduro (Mongoose es menos type-safe)
- **Learning Curve**: Team más familiarizado con SQL
- **Cost**: Atlas M10 (producción mínima) = $57/mes vs Neon $29/mes
- **Overkill**: No necesitamos sharding en Fase 1-2

**Score: 5/10**

**Decisión**: Rechazado - Type safety y ACID críticos. PostgreSQL superior para nuestro caso.

---

### Opción C: Supabase (PostgreSQL + pgvector managed)

**Descripción**: Supabase como backend completo (Auth + DB + Storage + Vector).

**Pros**:
- All-in-one platform
- Auth integrado
- Realtime subscriptions
- pgvector managed
- Generous free tier

**Contras**:
- **Vendor Lock-in**: Más profundo que Neon
- **Performance Vector**: Mismo problema que pgvector (no especializado)
- **Latency**: Menos optimizado que Pinecone para similarity search
- **Cost**: Pro tier ($25/mes) requerido para vector search en producción
- **Control**: Menos flexible que separar concerns

**Score: 7/10**

**Decisión**: Rechazado - Preferimos best-of-breed: Neon (PostgreSQL) + Pinecone (Vectors). Más control.

---

### Opción Elegida: **PostgreSQL (Neon) + Pinecone Serverless**

**Score: 9/10**

**Pros Clave**:
- **Performance**: Pinecone ~10x más rápido que pgvector para vector search
- **Separation of Concerns**: PostgreSQL para relacional, Pinecone para vectores
- **Type Safety**: Prisma + TypeScript = DX excepcional
- **Serverless**: Ambos escalan a cero (Neon + Pinecone serverless)
- **Cost Optimizado**:
  - Neon Free: 0.5GB (suficiente MVP) → Upgrade a Launch $29/mes (10GB)
  - Pinecone Serverless: Pay-per-use, ~$25-50/mes con 100K vectors
- **Expertise Team**: SQL conocido, Pinecone API simple
- **Backup**: Neon automated backups, Pinecone multi-AZ replication

**Contras Mitigados**:
- **Sincronización**: Manejado con transacciones + retry logic + event sourcing
- **Consistency**: Eventual consistency aceptable (RAG no requiere strong consistency)
- **Complejidad**: Mitigado con abstracciones (Repository pattern)

**Justificación**:
- Latency crítica para UX: Pinecone necesario
- ACID para transacciones: PostgreSQL necesario
- Best-of-breed > monolith para nuestro caso

## Consecuencias

### Positivas

1. **Performance Óptima**
   - Vector queries: 50-100ms P95 (Pinecone)
   - SQL queries: < 50ms P95 (Neon)
   - Total RAG latency: < 500ms (target cumplido)

2. **Escalabilidad**
   - Neon: Hasta 10GB sin degradación (Launch tier)
   - Pinecone: 1M+ vectors sin impacto (serverless auto-scaling)
   - Separación permite escalar independientemente

3. **Developer Experience**
   - Prisma: Type-safe queries, migrations automáticas
   - Pinecone SDK: API simple, well-documented
   - Testing: Easy mocking de ambas DBs

4. **Costos Predecibles**
   - Neon: $0-29/mes (tiers claros)
   - Pinecone: ~$25/mes (100K vectors, 1M queries/mes)
   - Total: $54/mes (dentro de budget $100)

5. **Disaster Recovery**
   - Neon: Point-in-time recovery (7 días)
   - Pinecone: Multi-AZ replication automática
   - RPO < 1 hora, RTO < 4 horas (cumple requisito)

### Negativas

1. **Eventual Consistency**
   - Sync PostgreSQL → Pinecone no es instantáneo (~1-5s)
   - **Mitigación**: Aceptable para RAG (no critical path)
   - **Plan B**: Optimistic UI updates + background sync

2. **Complejidad Operacional**
   - Monitorear 2 databases vs 1
   - **Mitigación**: Centralized logging (Axiom), unified dashboard
   - **Tooling**: Scripts de sync, health checks

3. **Data Duplication**
   - Metadata duplicado (PostgreSQL + Pinecone)
   - **Impacto**: ~10-20KB por documento (despreciable)
   - **Beneficio**: Queries más rápidos (sin JOINs cross-DB)

4. **Sync Failures**
   - Posible desincronización si Pinecone falla
   - **Mitigación**:
     - Retry queue con exponential backoff
     - Dead letter queue para failures
     - Reconciliation job nightly

5. **Vendor Lock-in (Dual)**
   - Dependencia de Neon + Pinecone
   - **Plan B Neon**: Migración a cualquier PostgreSQL (<1 día, Prisma portable)
   - **Plan B Pinecone**: Migración a Weaviate/Qdrant (~1 semana, abstracción repository)

## Validación e Implementación

### Costos Proyectados

**Fase 1 (MVP - Primeros 3 meses):**
| Recurso | Tier | Costo Mensual |
|---------|------|---------------|
| Neon PostgreSQL | Free (0.5GB) | $0 |
| Pinecone Serverless | Pay-per-use | ~$10-15 |
| **Total Fase 1** | | **$10-15/mes** |

**Fase 2 (100 users activos):**
| Recurso | Tier | Costo Mensual |
|---------|------|---------------|
| Neon PostgreSQL | Launch (10GB) | $29 |
| Pinecone Serverless | ~50K vectors | ~$25 |
| **Total Fase 2** | | **$54/mes** |

**Fase 3 (1000 users activos):**
| Recurso | Tier | Costo Mensual |
|---------|------|---------------|
| Neon PostgreSQL | Scale ($69 + compute) | ~$100 |
| Pinecone Serverless | ~200K vectors | ~$75 |
| **Total Fase 3** | | **$175/mes** |

### Database Setup Scripts

```bash
# Setup Neon PostgreSQL
npx prisma init
npx prisma migrate dev --name init
npx prisma generate

# Setup Pinecone
npm install @pinecone-database/pinecone
node scripts/init-pinecone.ts
```

```typescript
// scripts/init-pinecone.ts
import { initPineconeIndex } from '@/lib/pinecone/client';

async function main() {
  console.log('Initializing Pinecone index...');
  const index = await initPineconeIndex();

  const stats = await index.describeIndexStats();
  console.log('Pinecone index ready:', stats);
}

main();
```

### Métricas de Monitoreo

| Métrica | Target | Alertas |
|---------|--------|---------|
| **PostgreSQL Query P95** | < 50ms | > 200ms (warn), > 500ms (critical) |
| **Pinecone Query P95** | < 100ms | > 300ms (warn), > 1000ms (critical) |
| **Sync Lag** | < 5s | > 30s (warn), > 2min (critical) |
| **Sync Failure Rate** | < 0.1% | > 1% (warn), > 5% (critical) |
| **DB Connection Pool** | < 80% | > 90% (warn), 100% (critical) |
| **Pinecone Index Size** | Track | 80% quota (warn) |

### Backup Strategy

**PostgreSQL (Neon):**
- Automated backups: Daily (7 días retention)
- Point-in-time recovery: 7 días
- Manual snapshots antes de migrations críticas

**Pinecone:**
- Multi-AZ replication: Automático
- Backup exports: Semanal (scripts custom)
- Re-indexing desde PostgreSQL: Posible en < 4 horas

### Testing Strategy

```typescript
// __tests__/lib/db/integration.test.ts
import prisma from '@/lib/prisma';
import { indexDocument, queryRAG } from '@/lib/rag/sync';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Setup test databases
    await prisma.$executeRaw`TRUNCATE TABLE "Document" CASCADE`;
    // Clear Pinecone test namespace
  });

  test('indexes document and enables RAG search', async () => {
    // 1. Create document in PostgreSQL
    const doc = await prisma.document.create({
      data: {
        title: 'Test Document',
        source: 'api',
        tags: ['test'],
      },
    });

    // 2. Index to Pinecone
    const result = await indexDocument(doc.id);
    expect(result.vectorCount).toBeGreaterThan(0);

    // 3. Verify PostgreSQL updated
    const updated = await prisma.document.findUnique({
      where: { id: doc.id },
    });
    expect(updated?.indexed).toBe(true);

    // 4. Query RAG
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for eventual consistency
    const ragResults = await queryRAG('test query');
    expect(ragResults.length).toBeGreaterThan(0);
  });
});
```

## Referencias

- [ARCHITECTURE.md - Capa 1: Data Layer](../ARCHITECTURE.md#capa-1-data-layer)
- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)
- [RAG_IMPLEMENTATION.md](../ai/RAG_IMPLEMENTATION.md)
- [ADR-005: RAG Pinecone Embeddings](./ADR-005-rag-pinecone-embeddings.md)
- [Neon Documentation](https://neon.tech/docs)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Prisma Documentation](https://www.prisma.io/docs)

## Historial de Decisión

- **Creada**: 2025-10-22
- **Revisada por**: Data Architect, Architect, Cost Analyzer
- **Implementación**: Fase 1 (Semanas 1-2)
- **Última actualización**: 2025-10-22
- **Siguiente revisión**: Fase 3 - Evaluar si pgvector en Neon Pro es viable para consolidar
- **Aprobada por**: Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Dual database con PostgreSQL + Pinecone maximiza performance y mantiene costos controlados. Separation of concerns permite optimizar cada workload independientemente.
