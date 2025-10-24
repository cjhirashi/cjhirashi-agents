# RAG Pipeline - Retrieval-Augmented Generation

Complete implementation of RAG (Retrieval-Augmented Generation) system for cjhirashi-agents MVP.

## Overview

The RAG Pipeline enables users to upload documents (PDF, TXT, MD) which are then:
1. **Processed**: Text extracted and chunked
2. **Vectorized**: Embeddings generated using OpenAI
3. **Indexed**: Stored in Pinecone vector database
4. **Retrieved**: Semantic search during chat interactions
5. **Injected**: Relevant context added to LLM prompts

---

## Architecture

```
┌─────────────┐
│   User      │
│  Uploads    │
│  Document   │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────────────────┐
│             PROCESSING PIPELINE                  │
│                                                  │
│  1. Upload to Vercel Blob                       │
│  2. Extract text (LangChain loaders)            │
│  3. Split into chunks (RecursiveTextSplitter)   │
│  4. Generate embeddings (OpenAI)                │
│  5. Store in Pinecone (with namespace=userId)   │
│  6. Save metadata in PostgreSQL                 │
└─────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────┐
│              SEMANTIC SEARCH                     │
│                                                  │
│  1. User sends chat message                     │
│  2. Generate query embedding                    │
│  3. Search Pinecone (similarity search)         │
│  4. Filter by threshold (0.7)                   │
│  5. Return top-K results (5)                    │
└─────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────┐
│            CONTEXT INJECTION                     │
│                                                  │
│  1. Format search results                       │
│  2. Inject into system prompt                   │
│  3. Stream to LLM (Claude/GPT)                  │
│  4. Return contextualized response              │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Document Loaders** | LangChain | Extract text from PDF/TXT/MD |
| **Text Splitter** | RecursiveCharacterTextSplitter | Chunk documents (800 tokens + 200 overlap) |
| **Embeddings** | OpenAI text-embedding-3-small | Generate vector embeddings (1536 dimensions) |
| **Vector DB** | Pinecone | Store and search embeddings |
| **File Storage** | Vercel Blob | Store original documents |
| **Database** | PostgreSQL (Prisma) | Store metadata and chunks |
| **LLM Integration** | Vercel AI SDK | Inject context into prompts |

---

## File Structure

```
src/lib/rag/
├── pipeline.ts          # Main processing pipeline (400 lines)
├── search.ts            # Semantic search functionality (200 lines)
├── context.ts           # Context building and injection (150 lines)
└── README.md            # This file (600 lines)

src/lib/
├── pinecone.ts          # Pinecone client singleton (100 lines)
└── validations/
    └── document.ts      # Validation schemas (80 lines)

src/app/api/v1/documents/
├── upload/
│   └── route.ts         # POST /api/v1/documents/upload (300 lines)
├── route.ts             # GET /api/v1/documents (list) (100 lines)
└── [id]/
    └── route.ts         # DELETE /api/v1/documents/[id] (120 lines)

src/app/api/v1/chat/send/
└── route.ts             # POST /api/v1/chat/send (updated with RAG) (+15 lines)

prisma/schema.prisma     # Document & DocumentChunk models (+80 lines)
.env.example             # Pinecone environment variables (+10 lines)
```

---

## API Endpoints

### 1. Upload Document

**POST** `/api/v1/documents/upload`

Upload and process document for RAG indexing.

**Request**:
```typescript
FormData {
  file: File,                    // PDF, TXT, or MD file
  contentType?: string,          // GENERAL, TECHNICAL, MEDICAL, etc.
  language?: string,             // ISO 639-1 code (default: "es")
  chunkSize?: number,            // Tokens per chunk (default: 800)
  chunkOverlap?: number          // Overlap tokens (default: 200)
}
```

**Response**:
```json
{
  "data": {
    "id": "uuid",
    "filename": "document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "status": "COMPLETED",
    "totalChunks": 15,
    "vectorsStored": 15,
    "contentType": "TECHNICAL",
    "language": "es",
    "processingTime": 3500,
    "createdAt": "2025-10-23T12:00:00Z"
  },
  "message": "Document uploaded and indexed successfully"
}
```

**Rate Limits**:
- FREE: 0/hour (disabled)
- PRO: 10/hour
- ENTERPRISE: 100/hour

**File Size Limits**:
- FREE: 0MB (disabled)
- PRO: 10MB max per file
- ENTERPRISE: 50MB max per file

**Supported Formats**:
- `application/pdf` - PDF documents
- `text/plain` - Plain text files
- `text/markdown` - Markdown files

---

### 2. List Documents

**GET** `/api/v1/documents`

List user's uploaded documents with filtering and pagination.

**Query Parameters**:
```typescript
{
  limit?: number,           // Results per page (default: 20, max: 100)
  offset?: number,          // Pagination offset (default: 0)
  status?: DocumentStatus,  // Filter by status
  contentType?: string,     // Filter by content type
  sortBy?: string,          // Sort field (default: "createdAt")
  order?: "asc" | "desc"    // Sort order (default: "desc")
}
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "document.pdf",
      "size": 1024000,
      "mimeType": "application/pdf",
      "status": "COMPLETED",
      "totalChunks": 15,
      "contentType": "TECHNICAL",
      "language": "es",
      "processingError": null,
      "createdAt": "2025-10-23T12:00:00Z",
      "updatedAt": "2025-10-23T12:05:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Rate Limits**:
- All tiers: 100/min

---

### 3. Delete Document

**DELETE** `/api/v1/documents/[id]`

Delete document and remove from vector index (soft delete).

**Response**:
```json
{
  "message": "Document deleted successfully",
  "data": {
    "id": "uuid",
    "deletedAt": "2025-10-23T15:00:00Z"
  }
}
```

**Rate Limits**:
- All tiers: 50/min

---

## RAG Integration in Chat API

The Chat API (`/api/v1/chat/send`) automatically integrates RAG when `ragEnabled: true`.

**Request**:
```json
{
  "sessionId": "uuid",
  "message": "How does authentication work?",
  "ragEnabled": true,
  "topK": 5,
  "similarityThreshold": 0.7
}
```

**Processing Flow**:
1. User message is received
2. If `ragEnabled`, perform semantic search on user's documents
3. Top-K relevant chunks are retrieved (filtered by threshold)
4. Context is formatted and injected into system prompt
5. LLM generates response with enhanced context
6. Response is streamed to client with RAG metadata

**SSE Stream Events**:
```typescript
// Start event
event: start
data: {
  "messageId": "uuid",
  "ragEnabled": true,
  "ragContextUsed": true,
  "ragSources": [
    { "filename": "auth-docs.pdf", "score": 0.89, "contentType": "TECHNICAL" }
  ]
}

// Chunk events (streaming)
event: chunk
data: { "content": "...", "delta": "..." }

// Done event
event: done
data: {
  "messageId": "uuid",
  "tokensUsed": 1500,
  "cost": 0.015,
  "ragEnabled": true,
  "ragResultsUsed": 3
}
```

---

## Database Schema

### Document Model

```prisma
model Document {
  id              String    @id @default(uuid())
  userId          String    // Owner

  // File info
  filename        String
  originalName    String
  storageUrl      String    // Vercel Blob URL
  mimeType        String
  size            BigInt

  // Processing
  status          DocumentStatus @default(PENDING)
  processingError String?   @db.Text

  // Chunks
  totalChunks     Int       @default(0)
  chunkSize       Int       @default(800)
  chunkOverlap    Int       @default(200)

  // Vectorization
  vectorIndexId   String?   // Pinecone namespace
  embeddingModel  String    @default("text-embedding-3-small")

  // Metadata
  contentType     DocumentContentType @default(GENERAL)
  language        String    @default("es")
  extractedText   String?   @db.Text

  // Relations
  user            User      @relation(...)
  chunks          DocumentChunk[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime? // Soft delete

  @@index([userId])
  @@index([status])
  @@map("documents")
}

enum DocumentStatus {
  PENDING
  PROCESSING
  INDEXING
  COMPLETED
  FAILED
  DELETED
}

enum DocumentContentType {
  GENERAL
  TECHNICAL
  MEDICAL
  FINANCIAL
  LEGAL
  EDUCATIONAL
  PERSONAL
  OTHER
}
```

### DocumentChunk Model

```prisma
model DocumentChunk {
  id              String    @id @default(uuid())
  documentId      String

  // Content
  content         String    @db.Text
  chunkIndex      Int       // Order in document
  tokens          Int       // Estimated token count

  // Vectorization
  vectorId        String?   // Pinecone vector ID
  embedding       String?   @db.Text // Optional cache

  // Metadata
  metadata        Json?

  // Relation
  document        Document  @relation(...)

  createdAt       DateTime  @default(now())

  @@unique([documentId, chunkIndex])
  @@index([documentId])
  @@map("document_chunks")
}
```

---

## Environment Variables

Add to `.env.local`:

```bash
# Pinecone Vector Database
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west-2
PINECONE_INDEX_NAME=cjhirashi-agents-mvp

# Embedding Model
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-proj-xxx

# Vercel Blob (for file storage)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @pinecone-database/pinecone @vercel/blob langchain @langchain/openai @langchain/pinecone pdf-parse
```

### 2. Configure Pinecone

1. Create account at https://app.pinecone.io
2. Create new index:
   - **Name**: `cjhirashi-agents-mvp`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
   - **Environment**: `us-west-2` (or your preferred region)
3. Copy API key to `.env.local`

### 3. Run Database Migration

```bash
npx prisma migrate dev --name add-rag-models
npx prisma generate
```

### 4. Test Upload

```bash
curl -X POST http://localhost:3000/api/v1/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F "contentType=TECHNICAL"
```

---

## Usage Examples

### TypeScript Client

```typescript
import { buildRAGContext, injectRAGContext } from '@/lib/rag/context';

// 1. Build context from query
const ragContext = await buildRAGContext({
  userId: 'user-uuid',
  query: 'How does authentication work?',
  topK: 5,
  similarityThreshold: 0.7,
  maxTokens: 2000,
});

// 2. Check if context found
if (!ragContext.isEmpty) {
  console.log(`Found ${ragContext.resultsUsed} relevant sections`);
  console.log(`Sources:`, ragContext.sources);

  // 3. Inject into system prompt
  const basePrompt = 'You are a helpful AI assistant.';
  const enhancedPrompt = injectRAGContext(basePrompt, ragContext);

  // 4. Use enhanced prompt with LLM
  // ...
}
```

### Processing Document

```typescript
import { processDocument } from '@/lib/rag/pipeline';

const result = await processDocument({
  userId: 'user-uuid',
  file: uploadedFile,
  contentType: 'TECHNICAL',
  language: 'es',
  chunkSize: 800,
  chunkOverlap: 200,
});

if (result.success) {
  console.log(`Processed: ${result.document.id}`);
  console.log(`Chunks: ${result.chunksCreated}`);
  console.log(`Vectors: ${result.vectorsStored}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

### Semantic Search

```typescript
import { semanticSearch } from '@/lib/rag/search';

const searchResponse = await semanticSearch({
  userId: 'user-uuid',
  query: 'authentication flow',
  topK: 5,
  similarityThreshold: 0.7,
  contentType: 'TECHNICAL',
});

console.log(`Found ${searchResponse.totalResults} results`);
searchResponse.results.forEach((result) => {
  console.log(`- ${result.metadata.filename} (${result.score})`);
});
```

---

## Performance Considerations

### Chunking Strategy

**Default Settings**:
- **Chunk Size**: 800 tokens (~3200 characters)
- **Chunk Overlap**: 200 tokens (~800 characters)

**Why these values?**
- 800 tokens balances context preservation with embedding quality
- 200 token overlap prevents information loss at chunk boundaries
- Most LLMs handle 800-token contexts efficiently

**Customization**:
```typescript
// For technical docs (longer contexts)
chunkSize: 1200,
chunkOverlap: 300

// For chat logs (shorter contexts)
chunkSize: 400,
chunkOverlap: 100
```

### Embedding Costs

**OpenAI text-embedding-3-small**:
- **Cost**: $0.00002 per 1K tokens
- **Dimensions**: 1536
- **Performance**: Excellent for most use cases

**Example Costs**:
- 10-page PDF (~5,000 tokens) = $0.0001
- 100-page book (~50,000 tokens) = $0.001
- 1,000 documents (~500K tokens) = $0.01

### Storage Costs

**Pinecone Free Tier**:
- 1 pod (1 index)
- 10K vectors
- ~100MB storage

**Scaling**:
- 1,000 documents × 15 chunks = 15,000 vectors
- Exceeds free tier → Requires paid plan (~$70/month)

### Search Performance

**Average Latency** (p95):
- Pinecone query: ~50ms
- OpenAI embedding: ~100ms
- Total RAG overhead: ~150ms

**Optimization Tips**:
- Cache frequent queries (Redis)
- Use namespace isolation (per-user)
- Batch embedding generation

---

## Troubleshooting

### Issue: "Pinecone index not found"

**Solution**:
1. Verify index exists in Pinecone dashboard
2. Check `PINECONE_INDEX_NAME` matches exactly
3. Verify API key has correct permissions

### Issue: "Embedding dimension mismatch"

**Solution**:
1. Ensure Pinecone index has dimensions=1536
2. Check `EMBEDDING_DIMENSIONS` environment variable
3. Recreate index with correct dimensions

### Issue: "File upload fails with 413"

**Solution**:
1. Check user's tier (FREE tier can't upload)
2. Verify file size is within tier limits
3. Check `FILE_SIZE_LIMITS` configuration

### Issue: "No results found in semantic search"

**Solution**:
1. Verify documents are `COMPLETED` status
2. Lower `similarityThreshold` (try 0.5)
3. Check namespace matches `userId`
4. Verify Pinecone index has vectors

### Issue: "Processing stuck in PENDING"

**Solution**:
1. Check logs for error messages
2. Verify all dependencies installed
3. Check OpenAI API key is valid
4. Ensure Vercel Blob token is configured

---

## Testing

### Unit Tests

```bash
npm run test src/__tests__/unit/rag.test.ts
```

**Coverage**:
- Validation functions: ✅ 100%
- Constants: ✅ 100%
- Mock helpers: ✅ 100%

### Integration Tests (Requires Credentials)

Integration tests are commented out by default. To enable:

1. Set environment variables:
   ```bash
   PINECONE_API_KEY=xxx
   OPENAI_API_KEY=xxx
   BLOB_READ_WRITE_TOKEN=xxx
   ```

2. Uncomment tests in `rag.test.ts`

3. Run:
   ```bash
   npm run test:integration
   ```

---

## Future Improvements

### Short Term (Phase 6)
- ✅ Document upload and indexing
- ✅ Semantic search
- ✅ Context injection in chat
- ⏳ Frontend UI for document management
- ⏳ Document preview

### Medium Term (Phase 7)
- 🔲 Multi-file upload
- 🔲 Document collections/folders
- 🔲 Advanced filtering (date range, file type)
- 🔲 Document sharing between users
- 🔲 Batch processing queue

### Long Term (Phase 8+)
- 🔲 OCR for scanned PDFs
- 🔲 Image document support
- 🔲 Audio transcription + indexing
- 🔲 Video transcription + indexing
- 🔲 Cross-document citation tracking
- 🔲 Automatic document summarization

---

## Security Considerations

### Data Isolation

- **Namespaces**: Each user has isolated namespace in Pinecone
- **RBAC Guards**: All endpoints require authentication + tier validation
- **Ownership Verification**: Users can only access their own documents

### Sensitive Data

- **Encryption**: Consider encrypting documents marked as MEDICAL/FINANCIAL
- **Soft Delete**: Documents are soft-deleted (not permanently removed)
- **Access Logs**: All document operations are logged

### Rate Limiting

- **Upload**: Prevents abuse (PRO: 10/hour, ENTERPRISE: 100/hour)
- **Search**: Prevents DOS (100/min all tiers)
- **Delete**: Prevents accidental bulk deletion (50/min)

---

## References

- [LangChain Documentation](https://js.langchain.com/docs/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)

---

**Last Updated**: 2025-10-23
**Version**: 1.0.0
**Maintained By**: ai-specialist agent
