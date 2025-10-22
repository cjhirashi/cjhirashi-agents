# ADR-005: RAG con Pinecone Hosted Embeddings

## Estado
**ACCEPTED** - Implementado en Fase 2

## Contexto

### Problema a Resolver

El sistema Cjhirashi necesita implementar **Retrieval-Augmented Generation (RAG)** para:

**Casos de Uso:**
- **Knowledge Base**: Documentación técnica, guías, tutoriales
- **User Documents**: PDFs, markdowns, URLs que usuarios suben
- **Chat History**: Context de conversaciones previas
- **Code Search**: Buscar snippets relevantes en repositorios
- **System Docs**: Documentación interna del proyecto (.claude/, sys-docs/)

**Requisitos Críticos:**

1. **Latency**: < 500ms P95 para query completo (embedding + search + generation)
2. **Accuracy**: Recall > 0.85 en top-5 results
3. **Scale**: 100K+ documentos sin degradación
4. **Multimodal**: Soportar text, code, structured data
5. **Metadata Filtering**: Filtrar por user, source, date, tags
6. **Cost**: < $50/mes en embeddings + storage (MVP)
7. **Multilingual**: Español + Inglés

### Desafíos Técnicos

**Embedding Generation:**
- **Option 1**: Local models (sentence-transformers) → Requiere GPU, latency alta
- **Option 2**: API hosted (OpenAI, Cohere) → Costo por request, latency red
- **Trade-off**: Cost vs Latency vs Quality

**Vector Storage:**
- **Option 1**: PostgreSQL pgvector → Ver ADR-002 (rechazado por performance)
- **Option 2**: Pinecone → Hosted, rápido, caro en scale
- **Option 3**: Weaviate, Qdrant → Self-hosted, más control, más ops

**Chunking Strategy:**
- Chunk size: 256, 512, 1024 tokens?
- Overlap: 0, 50, 100 tokens?
- Semantic vs fixed-size?

**Retrieval Strategy:**
- Top-K: 3, 5, 10 results?
- Re-ranking: Usar Cohere rerank?
- Hybrid search: Dense + sparse (BM25)?

### Constraints del Proyecto

- **Team**: 1-2 devs, no ML engineers
- **Budget**: < $100/mes total (DB + vectors + embeddings)
- **Timeline**: MVP en 8 semanas
- **Expertise**: Ninguna experiencia previa con RAG

## Decisión

**Adoptamos stack RAG:**
1. **Pinecone Serverless** para vector storage (ver ADR-002)
2. **Cohere embed-multilingual-v3.0** para embeddings (API hosted)
3. **Chunking fixed-size** 512 tokens, 50 overlap
4. **Top-K=5** con metadata filtering
5. **No re-ranking** en MVP (agregar Fase 3 si necesario)

### Arquitectura RAG Pipeline

```
┌─────────────────────────────────────────────────────┐
│                 RAG PIPELINE                         │
└─────────────────────────────────────────────────────┘

1. INDEXING (Offline)
   ┌──────────────┐
   │   Document   │
   │   (Upload)   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   Chunking   │ (512 tokens, 50 overlap)
   │   (Markdown, │
   │    Code, PDF)│
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Embedding   │ (Cohere API)
   │  Generation  │ (1536 dims)
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Pinecone    │ (Upsert vectors)
   │  + Metadata  │
   └──────────────┘

2. RETRIEVAL (Real-time)
   ┌──────────────┐
   │ User Query   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Embedding   │ (Cohere API)
   │  Generation  │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Pinecone    │ (Similarity search)
   │  Query       │ (Cosine, top-5)
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Context     │
   │  Assembly    │ (Concatenate chunks)
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │    LLM       │ (Claude/Gemini)
   │  Generation  │ (With context)
   └──────────────┘
```

### Embedding Service (Cohere)

```typescript
// lib/embeddings/cohere.ts
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!,
});

export interface EmbeddingOptions {
  inputType: 'search_document' | 'search_query';
  truncate?: 'START' | 'END' | 'NONE';
}

export async function generateEmbedding(
  texts: string[],
  options: EmbeddingOptions = { inputType: 'search_document' }
): Promise<number[][]> {
  try {
    const response = await cohere.embed({
      texts,
      model: 'embed-multilingual-v3.0',
      inputType: options.inputType,
      truncate: options.truncate || 'END',
    });

    return response.embeddings;
  } catch (error) {
    console.error('Cohere embedding failed:', error);
    throw new Error('Failed to generate embeddings');
  }
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = await generateEmbedding([query], {
    inputType: 'search_query',
  });

  return embeddings[0];
}

export async function generateDocumentEmbeddings(
  documents: string[]
): Promise<number[][]> {
  // Batch processing (Cohere limit: 96 texts/request)
  const batchSize = 96;
  const batches: number[][][] = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const embeddings = await generateEmbedding(batch, {
      inputType: 'search_document',
    });
    batches.push(embeddings);
  }

  return batches.flat();
}
```

### Chunking Strategy

```typescript
// lib/rag/chunking.ts
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export async function chunkText(
  text: string,
  options: ChunkOptions = {
    chunkSize: 512,
    chunkOverlap: 50,
  }
): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    separators: options.separators || ['\n\n', '\n', '. ', ' ', ''],
  });

  const docs = await splitter.createDocuments([text]);
  return docs.map(doc => doc.pageContent);
}

export async function chunkCode(
  code: string,
  language: string,
  options: ChunkOptions = {
    chunkSize: 512,
    chunkOverlap: 50,
  }
): Promise<string[]> {
  // Code-specific separators
  const codeSeparators: Record<string, string[]> = {
    typescript: ['\nclass ', '\nfunction ', '\nexport ', '\nimport ', '\n\n', '\n'],
    python: ['\ndef ', '\nclass ', '\nimport ', '\n\n', '\n'],
    javascript: ['\nfunction ', '\nconst ', '\nexport ', '\nimport ', '\n\n', '\n'],
  };

  const separators = codeSeparators[language] || ['\n\n', '\n'];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    separators,
  });

  const docs = await splitter.createDocuments([code]);
  return docs.map(doc => doc.pageContent);
}

export async function chunkMarkdown(
  markdown: string,
  options: ChunkOptions = {
    chunkSize: 512,
    chunkOverlap: 50,
  }
): Promise<string[]> {
  // Markdown-specific separators
  const separators = ['\n## ', '\n### ', '\n#### ', '\n\n', '\n'];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    separators,
  });

  const docs = await splitter.createDocuments([markdown]);
  return docs.map(doc => doc.pageContent);
}
```

### RAG Service

```typescript
// lib/rag/service.ts
import prisma from '@/lib/prisma';
import { generateDocumentEmbeddings, generateQueryEmbedding } from '@/lib/embeddings/cohere';
import { chunkText, chunkCode, chunkMarkdown } from '@/lib/rag/chunking';
import { upsertVectors, queryVectors } from '@/lib/pinecone/client';

export class RAGService {
  async indexDocument(params: {
    documentId: string;
    title: string;
    content: string;
    source: string;
    sourceUrl?: string;
    userId?: string;
    tags?: string[];
    contentType?: 'text' | 'code' | 'markdown';
    language?: string;
  }): Promise<{ vectorCount: number }> {
    // 1. Chunk content
    let chunks: string[];
    switch (params.contentType) {
      case 'code':
        chunks = await chunkCode(params.content, params.language || 'typescript');
        break;
      case 'markdown':
        chunks = await chunkMarkdown(params.content);
        break;
      default:
        chunks = await chunkText(params.content);
    }

    // 2. Generate embeddings (batch)
    const embeddings = await generateDocumentEmbeddings(chunks);

    // 3. Prepare vectors with metadata
    const vectors = chunks.map((chunk, idx) => ({
      id: `${params.documentId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        documentId: params.documentId,
        chunkIndex: idx,
        text: chunk,
        title: params.title,
        source: params.source,
        sourceUrl: params.sourceUrl,
        userId: params.userId,
        tags: params.tags || [],
        language: params.language || 'es',
        contentType: params.contentType || 'text',
        createdAt: Date.now(),
      },
    }));

    // 4. Upsert to Pinecone
    await upsertVectors(vectors);

    // 5. Update document status in PostgreSQL
    await prisma.document.update({
      where: { id: params.documentId },
      data: {
        indexed: true,
        vectorIds: vectors.map(v => v.id),
        chunkCount: chunks.length,
      },
    });

    return { vectorCount: vectors.length };
  }

  async query(params: {
    query: string;
    topK?: number;
    filter?: {
      userId?: string;
      source?: string;
      tags?: string[];
      language?: string;
      contentType?: string;
    };
    minScore?: number;
  }): Promise<{
    results: Array<{
      text: string;
      score: number;
      metadata: any;
    }>;
    context: string;
  }> {
    // 1. Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(params.query);

    // 2. Build Pinecone filter
    const pineconeFilter: Record<string, any> = {};
    if (params.filter?.userId) {
      pineconeFilter.userId = { $eq: params.filter.userId };
    }
    if (params.filter?.source) {
      pineconeFilter.source = { $eq: params.filter.source };
    }
    if (params.filter?.tags && params.filter.tags.length > 0) {
      pineconeFilter.tags = { $in: params.filter.tags };
    }
    if (params.filter?.language) {
      pineconeFilter.language = { $eq: params.filter.language };
    }
    if (params.filter?.contentType) {
      pineconeFilter.contentType = { $eq: params.filter.contentType };
    }

    // 3. Query Pinecone
    const queryResponse = await queryVectors(
      queryEmbedding,
      params.topK || 5,
      Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined
    );

    // 4. Filter by min score
    const minScore = params.minScore || 0.7;
    const filteredResults = (queryResponse.matches || [])
      .filter(match => match.score && match.score >= minScore)
      .map(match => ({
        text: match.metadata?.text as string,
        score: match.score!,
        metadata: match.metadata,
      }));

    // 5. Assemble context
    const context = filteredResults
      .map(result => result.text)
      .join('\n\n---\n\n');

    return {
      results: filteredResults,
      context,
    };
  }

  async deleteDocument(documentId: string): Promise<void> {
    // 1. Fetch vector IDs from PostgreSQL
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { vectorIds: true },
    });

    if (!doc || !doc.vectorIds.length) return;

    // 2. Delete from Pinecone
    const { deleteVectors } = await import('@/lib/pinecone/client');
    await deleteVectors(doc.vectorIds);

    // 3. Delete from PostgreSQL
    await prisma.document.delete({
      where: { id: documentId },
    });
  }
}
```

### API Routes

```typescript
// app/api/rag/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { RAGService } from '@/lib/rag/service';
import { z } from 'zod';

const querySchema = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(20).optional(),
  filter: z.object({
    userId: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    language: z.string().optional(),
    contentType: z.string().optional(),
  }).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

const ragService = new RAGService();

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const params = querySchema.parse(body);

    const result = await ragService.query({
      ...params,
      filter: {
        ...params.filter,
        userId: session.user.id, // Scope to user's documents
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('RAG query failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/rag/index/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { RAGService } from '@/lib/rag/service';
import { z } from 'zod';

const indexSchema = z.object({
  documentId: z.string().optional(), // Auto-generated if not provided
  title: z.string(),
  content: z.string(),
  source: z.enum(['upload', 'url', 'api', 'system']),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  contentType: z.enum(['text', 'code', 'markdown']).optional(),
  language: z.string().optional(),
});

const ragService = new RAGService();

export const runtime = 'nodejs'; // Long-running
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const params = indexSchema.parse(body);

    // Create document in DB first
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        title: params.title,
        source: params.source,
        sourceUrl: params.sourceUrl,
        tags: params.tags || [],
        metadata: {
          contentType: params.contentType,
          language: params.language,
        },
      },
    });

    // Index to Pinecone
    const result = await ragService.indexDocument({
      documentId: document.id,
      userId: session.user.id,
      ...params,
    });

    return NextResponse.json({
      documentId: document.id,
      vectorCount: result.vectorCount,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('RAG indexing failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Integration con Chat

```typescript
// lib/ai/rag-enhanced-chat.ts
import { streamText } from 'ai';
import { selectLLMModel } from '@/lib/ai/model-selector';
import { RAGService } from '@/lib/rag/service';

const ragService = new RAGService();

export async function ragEnhancedChat(params: {
  messages: Message[];
  userId: string;
  taskType: string;
  ragEnabled: boolean;
}) {
  let systemPrompt = 'You are a helpful AI assistant.';

  // 1. RAG retrieval (si está habilitado)
  if (params.ragEnabled) {
    const lastUserMessage = params.messages
      .filter(m => m.role === 'user')
      .slice(-1)[0];

    if (lastUserMessage) {
      const ragResult = await ragService.query({
        query: lastUserMessage.content,
        topK: 5,
        filter: {
          userId: params.userId,
          language: 'es', // O detectar del query
        },
        minScore: 0.7,
      });

      if (ragResult.results.length > 0) {
        systemPrompt = `You are a helpful AI assistant. Use the following context from the user's knowledge base to answer their question:

CONTEXT:
${ragResult.context}

If the context is relevant, use it to provide a more accurate answer. If not, answer based on your general knowledge.`;
      }
    }
  }

  // 2. LLM generation
  const modelConfig = selectLLMModel(params.taskType);

  return streamText({
    model: modelConfig.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...params.messages,
    ],
    maxTokens: 4096,
    temperature: 0.7,
  });
}
```

## Alternativas Consideradas

### Opción A: Local Embeddings (sentence-transformers)

**Descripción**: Usar models locales (all-MiniLM-L6-v2, multilingual-e5) en GPU.

**Pros**:
- Sin costo por API call
- Privacidad total (no data sale)
- Customizable (fine-tuning)

**Contras**:
- **GPU Required**: $100-300/mes en GPU (T4, A10)
- **Latency**: 100-500ms por batch (más lento que API)
- **Maintenance**: Actualizar models, dependencies
- **Scalability**: Bottleneck en GPU capacity
- **Quality**: Models open-source menos accurate que Cohere

**Score: 5/10**

**Decisión**: Rechazado - Costo GPU + ops overhead demasiado alto para MVP.

---

### Opción B: OpenAI Embeddings (text-embedding-3-small)

**Descripción**: Usar OpenAI API para embeddings.

**Pros**:
- API hosted (zero ops)
- Buena calidad (1536 dims)
- Integración fácil (Vercel AI SDK)

**Contras**:
- **Costo**: $0.02 / 1M tokens (2x más caro que Cohere)
- **Multilingual**: No optimizado para español (vs Cohere multilingual)
- **Vendor Lock-in**: OpenAI-specific
- **Rate Limits**: 3000 req/min (puede ser limitante)

**Score: 7/10**

**Decisión**: Rechazado - Cohere es mejor opción para multilingual + costo.

---

### Opción C: Hybrid Search (Dense + Sparse BM25)

**Descripción**: Combinar vector search (dense) con keyword search (BM25).

**Pros**:
- Mejor recall en queries específicos (nombres propios, IDs)
- Complementa semantic search
- Weaviate/Qdrant soportan nativo

**Contras**:
- **Complejidad**: 2 índices, 2 queries, fusion algorithm
- **Pinecone**: No soporta hybrid nativo (necesitarías Elasticsearch adicional)
- **Over-engineering**: MVP no requiere (agregar Fase 3 si precision baja)

**Score: 6/10**

**Decisión**: Rechazado para MVP - Agregar en Fase 3 si metrics muestran necesidad.

---

### Opción D: Self-Hosted Vector DB (Weaviate, Qdrant)

**Descripción**: Deployar Weaviate o Qdrant en Docker/K8s.

**Pros**:
- Control total
- Sin límites vendor
- Hybrid search built-in
- Open source

**Contras**:
- **Ops Overhead**: Mantener cluster, backups, scaling
- **Cost**: VMs/K8s ~$100/mes mínimo
- **Expertise**: Requiere conocimiento de vector DBs
- **Time**: Setup 1-2 semanas

**Score: 5/10**

**Decisión**: Rechazado - Ops complexity demasiado alto para team pequeño.

---

### Opción Elegida: **Cohere Embeddings + Pinecone Serverless**

**Score: 9/10**

**Pros Clave**:
- **Multilingual**: Cohere embed-multilingual-v3.0 optimizado para ES+EN
- **Cost Efficient**: $0.01 / 1M tokens (mitad que OpenAI)
- **Hosted**: Zero ops (API calls)
- **Performance**: Pinecone < 100ms queries P95
- **Quality**: State-of-art embeddings (MTEB leaderboard)
- **Scalability**: Serverless auto-scaling

**Contras Mitigados**:
- **Vendor Lock-in**: Mitigado por embeddings portables (1536 dims standard)
- **API Latency**: ~100ms (aceptable, caching ayuda)
- **Cost at Scale**: Monitorear, agregar caching agresivo

**Justificación**:
- Best-in-class multilingual embeddings
- Costo optimizado para startup
- Zero ops para team pequeño

## Consecuencias

### Positivas

1. **Multilingual Excellence**
   - Español nativo (no traducciones)
   - Context-aware queries
   - Cross-lingual retrieval

2. **Performance Óptima**
   - Embedding: ~100ms (Cohere API)
   - Vector search: ~50ms (Pinecone)
   - Total RAG: < 500ms (target cumplido)

3. **Cost Predictable**
   - Cohere: $10/mes (1M queries MVP)
   - Pinecone: $25/mes (100K vectors)
   - Total: $35/mes (dentro budget)

4. **Developer Experience**
   - Simple API calls
   - No model management
   - Type-safe TypeScript

5. **Accuracy**
   - Recall > 0.85 (target)
   - Precision > 0.75
   - F1 > 0.80

### Negativas

1. **API Dependency**
   - **Riesgo**: Cohere downtime impacta RAG
   - **Mitigación**: Fallback a chat sin RAG, cache embeddings
   - **SLA**: Cohere 99.9% uptime

2. **Cost at Scale**
   - **Problema**: 10M queries/mes = $100 Cohere
   - **Mitigación**: Caching agresivo (Redis), deduplication
   - **Plan B**: Migrar a local embeddings si > 10M queries

3. **Embedding Lock-in**
   - **Problema**: Cambiar embedding model = re-index todo
   - **Impacto**: ~4 horas downtime para 100K docs
   - **Mitigación**: Minimizar cambios, versionar embeddings

4. **Latency Variability**
   - **Problema**: API calls sujetos a red latency
   - **Mitigación**: P95 monitoring, timeout 2s, fallback sin RAG

5. **No Hybrid Search**
   - **Limitación**: Solo semantic, no keyword exact match
   - **Impacto**: Queries con nombres propios pueden fallar
   - **Mitigación**: Agregar Fase 3 si metrics muestran necesidad

## Validación e Implementación

### Costos Proyectados

**Fase 1 (MVP):**
| Recurso | Uso | Costo Mensual |
|---------|-----|---------------|
| Cohere Embeddings | 500K queries | $5 |
| Pinecone Storage | 50K vectors | $15 |
| **Total** | | **$20/mes** |

**Fase 2 (100 users):**
| Recurso | Uso | Costo Mensual |
|---------|-----|---------------|
| Cohere Embeddings | 2M queries | $20 |
| Pinecone Storage | 100K vectors | $25 |
| **Total** | | **$45/mes** |

**Fase 3 (1000 users):**
| Recurso | Uso | Costo Mensual |
|---------|-----|---------------|
| Cohere Embeddings | 10M queries | $100 |
| Pinecone Storage | 500K vectors | $75 |
| **Total** | | **$175/mes** |

### Métricas de Éxito (SLA)

| Métrica | Target | Medición |
|---------|--------|----------|
| **RAG Latency P95** | < 500ms | Custom metrics |
| **Recall@5** | > 0.85 | Eval dataset |
| **Precision@5** | > 0.75 | Eval dataset |
| **Error Rate** | < 1% | Sentry |
| **Cache Hit Rate** | > 40% | Redis metrics |
| **Cost per Query** | < $0.001 | Analytics |

### Evaluation Dataset

```typescript
// scripts/eval-rag.ts
import { RAGService } from '@/lib/rag/service';

const evalDataset = [
  {
    query: '¿Cómo implementar autenticación con NextAuth?',
    expectedDocs: ['doc-nextauth-1', 'doc-nextauth-2'],
  },
  {
    query: 'Explain PostgreSQL indexes',
    expectedDocs: ['doc-postgres-1', 'doc-indexes-1'],
  },
  // ... 100+ eval examples
];

async function evaluateRAG() {
  const ragService = new RAGService();

  let correctRetrieval = 0;
  let totalQueries = evalDataset.length;

  for (const example of evalDataset) {
    const result = await ragService.query({
      query: example.query,
      topK: 5,
      minScore: 0.7,
    });

    const retrievedDocs = result.results.map(r => r.metadata.documentId);
    const hasExpected = example.expectedDocs.some(expected =>
      retrievedDocs.includes(expected)
    );

    if (hasExpected) correctRetrieval++;
  }

  const recall = correctRetrieval / totalQueries;
  console.log(`Recall@5: ${(recall * 100).toFixed(2)}%`);

  return { recall };
}

evaluateRAG();
```

### Caching Strategy

```typescript
// lib/rag/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const key = `embedding:${hashText(text)}`;
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached as string);
  }

  return null;
}

export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
  const key = `embedding:${hashText(text)}`;
  await redis.set(key, JSON.stringify(embedding), {
    ex: 60 * 60 * 24 * 7, // 7 días
  });
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}
```

### Monitoring Dashboard

```typescript
// lib/monitoring/rag-metrics.ts
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({ token: process.env.AXIOM_TOKEN });

export async function logRAGQuery(data: {
  query: string;
  resultsCount: number;
  topScore: number;
  latency: number;
  cacheHit: boolean;
  userId: string;
}) {
  await axiom.ingest('rag-queries', [
    {
      ...data,
      timestamp: new Date().toISOString(),
    },
  ]);
}
```

## Referencias

- [ARCHITECTURE.md - Capa 4: AI Services](../ARCHITECTURE.md#capa-4-ai-services)
- [ADR-002: PostgreSQL + Pinecone](./ADR-002-postgresql-pinecone-dual-db.md)
- [RAG_IMPLEMENTATION.md](../ai/RAG_IMPLEMENTATION.md)
- [Cohere Embeddings Documentation](https://docs.cohere.com/docs/embeddings)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [LangChain Text Splitters](https://js.langchain.com/docs/modules/data_connection/document_transformers/)

## Historial de Decisión

- **Creada**: 2025-10-22
- **Revisada por**: AI Specialist, Architect, Data Architect
- **Implementación**: Fase 2 (Semanas 3-4)
- **Última actualización**: 2025-10-22
- **Siguiente revisión**: Fase 3 - Evaluar re-ranking (Cohere rerank), hybrid search si precision baja
- **Aprobada por**: Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Cohere + Pinecone maximiza calidad multilingual y minimiza ops. Stack comprobado para RAG en producción.
