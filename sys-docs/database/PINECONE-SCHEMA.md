# Pinecone Vector Database Schema & Configuration

**Documento de referencia para estrategia de embeddings, sincronización y recuperación de contexto RAG**

## Resumen Ejecutivo

### Configuración Principal

```yaml
index_name: cjhirashi-embeddings
dimensions: 1536
metric: cosine
cloud: aws
region: us-east-1
tier: serverless
pods: auto-scaling
replicas: 1
shards: 1
```

### Modelo de Embeddings

- **Provider**: Cohere
- **Model**: embed-multilingual-v3.0
- **Dimensions**: 1536
- **Input type**: search_document (indexing), search_query (retrieval)
- **Languages**: Español e inglés (multilingüe)
- **Max tokens**: 512 por chunk

### Cost Projection

**MVP (100 usuarios activos)**
- Storage: ~100K vectors = $0.25/mes
- Queries: ~50K queries/month = $0.02/mes
- Write operations: ~10K upserts/month = $0.02/mes
- **Total MVP**: ~$25/mes (tier mínimo serverless)

**Scale (1,000 usuarios)**
- Storage: ~1M vectors = $0.25/mes
- Queries: ~500K queries/month = $0.20/mes
- Write operations: ~100K upserts/month = $0.20/mes
- **Total Scale**: ~$25-50/mes

---

## Index Configuration

### Create Index

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

async function createIndex() {
  await pinecone.createIndex({
    name: 'cjhirashi-embeddings',
    dimension: 1536,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
    deletionProtection: 'enabled',
  });
}

const index = pinecone.index('cjhirashi-embeddings');
```

### Index Specifications

| Property | Value | Justificación |
|----------|-------|---------------|
| **Metric** | cosine | Mejor para embeddings normalizados |
| **Dimensions** | 1536 | Cohere embed-multilingual-v3.0 |
| **Tier** | serverless | Auto-scaling, cost-effective |
| **Deletion Protection** | enabled | Prevenir pérdida de datos |
| **Cloud** | AWS | Proximidad a Vercel |
| **Region** | us-east-1 | Latencia baja |

---

## Metadata Schema

### Vector Metadata Structure

```typescript
interface VectorMetadata {
  // IDENTITY & OWNERSHIP
  user_id: string;              // UUID del usuario propietario
  document_id: string;           // UUID en PostgreSQL
  conversation_id?: string;      // UUID de conversación (opcional)

  // CHUNKING
  chunk_index: number;           // Orden del chunk (0-based)
  total_chunks: number;          // Total de chunks del documento
  chunk_text: string;            // Texto del chunk

  // SOURCE TRACKING
  source_type: 'FILE' | 'PASTE' | 'URL' | 'MCP';
  source_name: string;           // Nombre del archivo o URL
  file_type?: string;            // pdf, docx, txt, md, etc

  // TIMESTAMPS
  created_at: number;            // Unix timestamp (ms)
  updated_at: number;            // Unix timestamp (ms)

  // CONTENT
  content_preview: string;       // Primeros 200 caracteres
  content_hash: string;          // SHA256 para deduplicación

  // TAGS & CATEGORIZATION
  tags: string[];                // Tags del documento
  category?: string;             // Categoría principal

  // VERSIONING
  version: number;               // Versión del documento
  is_active: boolean;            // false si borrado
}
```

### Example Vector

```json
{
  "id": "doc_abc123_chunk_0",
  "values": [0.123, -0.456, 0.789, ...],
  "metadata": {
    "user_id": "usr_xyz789",
    "document_id": "doc_abc123",
    "chunk_index": 0,
    "total_chunks": 5,
    "chunk_text": "This is the full text of chunk 0...",
    "source_type": "FILE",
    "source_name": "quarterly-report.pdf",
    "file_type": "pdf",
    "created_at": 1704067200000,
    "updated_at": 1704067200000,
    "content_preview": "This is the full text of chunk 0 which contains...",
    "content_hash": "a3f5c9e8b2d1f4a6c8e0b2d4f6a8c0e2",
    "tags": ["finance", "q4", "2024"],
    "category": "reports",
    "version": 1,
    "is_active": true
  }
}
```

---

## Namespace Strategy

### Recomendación: Per-User Namespaces

**Structure**: `user_{user_id}`

**Pros**:
- Aislamiento total por usuario
- Queries automáticamente filtradas
- Fácil borrado GDPR (delete entire namespace)
- Métricas por usuario claras

**Cons**:
- Más namespaces administrativos
- No permite compartir vectores

### Implementation

```typescript
// Upsert en namespace de usuario
const namespace = index.namespace(`user_${userId}`);
await namespace.upsert([
  {
    id: 'doc_abc123_chunk_0',
    values: embedding,
    metadata: { /* ... */ },
  },
]);

// Query en namespace de usuario
const results = await namespace.query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true,
});
```

---

## Document Chunking

### Algoritmo

```typescript
async function chunkDocument(
  text: string,
  maxTokens: number = 512,
  overlap: number = 50
): Promise<string[]> {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxTokens * 4) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks;
}
```

### Why 512 tokens + 50 overlap?

- **512 tokens**: Balance contexto vs precisión
- **50 overlap**: Previene pérdida de contexto en límites
- **Semantic split**: Preferir `\n\n` (párrafos) sobre cortes aleatorios

---

## Sync Strategy: PostgreSQL → Pinecone

### Arquitectura

```
User uploads document
        ↓
PostgreSQL: Document created
        ↓
Event: document.created
        ↓
Background Job
        ├─ Extract text
        ├─ Chunk text
        ├─ Generate embeddings (Cohere)
        └─ Upsert to Pinecone
        ↓
Success? → Update vector_status = 'synced'
Failed?  → Retry con exponential backoff
Max retries? → Dead Letter Queue + Alert admin
```

### Implementation

```typescript
// lib/workers/pinecone-sync-worker.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClient } from 'cohere-ai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
const index = pinecone.index('cjhirashi-embeddings');

async function syncDocumentToPinecone(documentId: string) {
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // 1. Fetch document
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      // 2. Extract text
      const text = await extractText(document);

      // 3. Chunk text
      const chunks = await chunkDocument(text);

      // 4. Generate embeddings
      const response = await cohere.embed({
        texts: chunks,
        model: 'embed-multilingual-v3.0',
        inputType: 'search_document',
      });

      // 5. Prepare vectors
      const vectors = chunks.map((chunk, index) => ({
        id: `${documentId}_chunk_${index}`,
        values: response.embeddings[index],
        metadata: {
          user_id: document.userId,
          document_id: documentId,
          chunk_index: index,
          total_chunks: chunks.length,
          chunk_text: chunk,
          source_type: document.sourceType,
          source_name: document.sourceName,
          created_at: document.createdAt.getTime(),
          updated_at: document.updatedAt.getTime(),
          content_preview: chunk.substring(0, 200),
          is_active: true,
        },
      }));

      // 6. Upsert to Pinecone
      const namespace = index.namespace(`user_${document.userId}`);
      await namespace.upsert(vectors);

      // 7. Update status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          vectorStatus: 'synced',
          lastSyncedAt: new Date(),
        },
      });

      console.log(`✅ Synced document ${documentId}`);
      return;

    } catch (error) {
      retries++;
      console.error(`Sync attempt ${retries}/${MAX_RETRIES} failed:`, error);

      if (retries >= MAX_RETRIES) {
        await prisma.document.update({
          where: { id: documentId },
          data: { vectorStatus: 'failed' },
        });
        throw error;
      }

      // Exponential backoff
      await sleep(Math.pow(2, retries) * 1000);
    }
  }
}
```

---

## Query Strategy: RAG Retrieval

### RAG Flow

```
User message
        ↓
Generate embedding (Cohere)
        ↓
Query Pinecone (user namespace)
        ↓
Get top 5 results
        ↓
Rerank by relevance (optional)
        ↓
Build context prompt
        ↓
Send to LLM with context
        ↓
Return response + sources
```

### Implementation

```typescript
// lib/services/rag-service.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClient } from 'cohere-ai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
const index = pinecone.index('cjhirashi-embeddings');

export async function retrieveContext(
  userId: string,
  query: string,
  topK: number = 5
) {
  const startTime = Date.now();

  try {
    // 1. Generate query embedding
    const queryResponse = await cohere.embed({
      texts: [query],
      model: 'embed-multilingual-v3.0',
      inputType: 'search_query',
    });

    const queryEmbedding = queryResponse.embeddings[0];

    // 2. Query Pinecone
    const namespace = index.namespace(`user_${userId}`);
    const results = await namespace.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        is_active: { $eq: true },
      },
    });

    // 3. Extract contexts
    const contexts = results.matches
      .filter((match) => match.score >= 0.7)
      .map((match) => match.metadata.chunk_text as string);

    const sources = results.matches
      .filter((match) => match.score >= 0.7)
      .map((match) => ({
        documentId: match.metadata.document_id as string,
        sourceName: match.metadata.source_name as string,
        score: match.score,
      }));

    return {
      contexts,
      sources,
      queryTime: Date.now() - startTime,
    };

  } catch (error) {
    console.error('RAG retrieval failed:', error);
    throw error;
  }
}

// Build LLM prompt with context
export function buildPrompt(contexts: string[], query: string): string {
  if (contexts.length === 0) {
    return `User: ${query}\n\nNo context available. Answer based on your knowledge.`;
  }

  const contextText = contexts
    .map((ctx, i) => `[Source ${i + 1}]\n${ctx}`)
    .join('\n\n---\n\n');

  return `Context:\n${contextText}\n\nUser: ${query}`;
}
```

---

## Monitoring & SLOs

### Key Metrics

| Métrica | Target | Crítico |
|---------|--------|---------|
| Query latency (p99) | < 400ms | > 600ms |
| Embedding latency | < 2s | > 5s |
| Sync success rate | > 99% | < 95% |
| Vector recall | > 0.85 | < 0.75 |

### Health Check

```typescript
// app/api/health/pinecone/route.ts
export async function GET() {
  try {
    const startTime = Date.now();

    const testEmbedding = Array(1536).fill(0);
    const namespace = index.namespace('health-check');

    await namespace.query({
      vector: testEmbedding,
      topK: 1,
    });

    return Response.json({
      status: 'healthy',
      latency: Date.now() - startTime,
    });
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    );
  }
}
```

---

## Fallback Strategy

### Si Pinecone Falla

```typescript
export async function retrieveContextWithFallback(
  userId: string,
  query: string
) {
  try {
    return await retrieveContext(userId, query);
  } catch (error) {
    console.error('Pinecone failed, using PostgreSQL fallback:', error);

    // Fallback a búsqueda en PostgreSQL
    return await retrieveContextFromPostgres(userId, query);
  }
}

async function retrieveContextFromPostgres(userId: string, query: string) {
  // Full-text search en PostgreSQL
  const results = await prisma.$queryRaw`
    SELECT id, content, source_name
    FROM documents
    WHERE user_id = ${userId}
    AND is_active = true
    ORDER BY created_at DESC
    LIMIT 5
  `;

  return {
    contexts: results.map((r) => r.content),
    sources: results.map((r) => ({
      documentId: r.id,
      sourceName: r.source_name,
    })),
    fallback: true,
  };
}
```

---

## Security

### API Key Management

```typescript
// ✅ CORRECTO: Server-side only
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// ❌ INCORRECTO: Expone key en cliente
const pinecone = new Pinecone({
  apiKey: 'pk-xxxx'
}); // En browser
```

### User Isolation

```typescript
// ✅ CORRECTO: Namespace aísla por usuario
const namespace = index.namespace(`user_${userId}`);
const results = await namespace.query({ vector });

// ❌ INCORRECTO: No filtra por usuario
const results = await index.query({ vector });
```

---

## GDPR: Borrar Datos de Usuario

```typescript
export async function deleteAllUserData(userId: string) {
  // 1. Delete Pinecone namespace completo
  const namespace = index.namespace(`user_${userId}`);
  await namespace.deleteAll();

  // 2. Delete PostgreSQL
  await prisma.document.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  console.log(`Deleted all data for user ${userId}`);
}
```

---

## Checklist de Implementación

- [ ] Crear index Pinecone (`cjhirashi-embeddings`)
- [ ] Obtener API key y guardar en .env
- [ ] Implementar sync worker (background job)
- [ ] Implementar RAG service (query)
- [ ] Integrar con chat API
- [ ] Setup health check endpoint
- [ ] Setup monitoring (Axiom/Datadog)
- [ ] Implementar fallback strategy
- [ ] Testing (unit + integration)
- [ ] Deploy y monitorear

---

## Referencias

- [DATABASE.md](./DATABASE.md) - Schema PostgreSQL
- [MIGRATIONS.md](./MIGRATIONS.md) - Prisma migrations
- [ADR-005-rag-pinecone-embeddings.md](../architecture/ADR-005-rag-pinecone-embeddings.md) - Decision record
- [Cohere Embeddings](https://docs.cohere.com/reference/embed)
- [Pinecone API](https://docs.pinecone.io)

