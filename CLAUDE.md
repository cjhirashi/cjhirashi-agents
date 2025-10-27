# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CJHIRASHI Agents** is a comprehensive AI-powered personal assistant platform that integrates health management, financial tracking, and customizable AI agents with RAG (Retrieval-Augmented Generation) capabilities. Built on Next.js 15, React 18, and a 7-layer architecture.

**Current Status**: Phase 6 completed (Frontend MVP) - 60% overall completion
**Production URL**: https://agents.cjhirashi.com

## Essential Commands

### Development
```bash
npm run dev                    # Start development server (localhost:3000)
npm run build                  # Production build (validates TypeScript + builds assets)
npm run start                  # Start production server
npm run lint                   # Run ESLint (strict mode)
```

### Database Operations
```bash
npx prisma generate            # Regenerate Prisma client (run after schema changes)
npx prisma db push             # Apply schema changes to database (no migrations)
npx prisma studio              # Open visual database browser
npx prisma migrate dev         # Create migration (for production-ready changes)
```

### Testing
```bash
npm run test                   # Run Vitest unit tests
npm run test:ui                # Run tests with UI
npm run test:coverage          # Generate coverage report (target: >80%)
```

### Admin Tasks
```bash
npm run set-admin <email>      # Elevate user to ADMIN role
npm run set-super-admin <email> # Elevate user to SUPERUSER role
npm run seed-models            # Seed AI models catalog
npm run validate:env           # Validate .env configuration
```

## Architecture Overview

### 7-Layer Stack (Bottom → Top)

1. **Database Layer**: Neon PostgreSQL (32 tables) + Pinecone (vector DB for RAG)
2. **ORM Layer**: Prisma 6.17 (type-safe queries, centralized schema)
3. **Data Access Layer**: Repository pattern (future abstraction)
4. **Business Logic Layer**: Services for chat, RAG, auth, rate limiting
5. **API Layer**: Next.js 15 API Routes (`/api/v1/*` and `/api/admin/*`)
6. **Frontend Layer**: React 18 Server/Client Components + shadcn/ui
7. **External Services**: Google Gemini, Claude, GPT-4o, Pinecone, Upstash Redis

### Key Architectural Decisions (ADRs)

Refer to `sys-docs/architecture/ADR-*.md` for detailed rationale:

- **ADR-001**: Vercel AI SDK for multi-LLM routing (Claude, GPT-4o, Gemini, DeepSeek)
- **ADR-002**: Dual database (PostgreSQL + Pinecone) for relational + vector data
- **ADR-003**: Next.js API Routes (no separate backend) for simplicity
- **ADR-007**: pdf-parse 1.1.1 (downgraded for LangChain compatibility)
- **ADR-008**: NextAuth v5 3-file pattern (`auth.config.ts` + `auth.ts` + `next-auth.d.ts`)
- **ADR-009**: Token Bucket rate limiting with Upstash Redis

## Database Schema Critical Notes

### Schema Files
- **Primary**: `prisma/schema.prisma` (MVP base schema - 24 tables)
- **Full**: `prisma/schema-v2.prisma` (complete 32-table schema for health/finance)

**IMPORTANT**: Always use `npx prisma generate` after modifying schema files.

### Key Models
- **User**: Roles (CLIENT, GUEST, ADMIN, SUPERUSER), tiers (FREE, PRO, ENTERPRISE)
- **ChatSession** + **ChatMessage**: Conversation history with token tracking
- **CustomAgent**: User-created AI agents with custom system prompts
- **Document** + **DocumentChunk**: RAG pipeline (upload → chunk → embed → vector DB)
- **Project** + **Artifact**: Code/document generation with versioning

### Relationships to Understand
- User → ChatSession (1:N) - Session ownership
- ChatSession → ChatMessage (1:N, cascade delete) - Message history
- User → CustomAgent (1:N) - Agent creation
- User → Document (1:N, cascade delete) - Document ownership
- Document → DocumentChunk (1:N, cascade delete) - Chunked text for embeddings

## Authentication (NextAuth v5)

### Critical Pattern: 3-File Architecture
Due to Edge Runtime + TypeScript constraints:

1. **`auth.config.ts`**: Edge-compatible config (providers, pages, callbacks)
2. **`src/lib/auth.ts`**: Full NextAuth instance (imports auth.config.ts)
3. **`src/types/next-auth.d.ts`**: Type extensions (session.user.role, session.user.tier, etc.)

**DO NOT merge these into a single file** - circular imports will break Edge Runtime.

### Auth Guards (`src/lib/auth/guards.ts`)

**Enforcement Guards** (throw error if check fails):
- `requireAuth()` - User must be authenticated
- `requireRole(role)` - User must have specific role
- `requireAdmin()` - User must be ADMIN or SUPERUSER
- `requireTier(tier)` - User must have specific subscription tier
- `requireOwnership(resourceUserId)` - User must own resource

**Optional Guards** (return boolean):
- `isAuthenticated()`
- `isAdmin()`
- `isSuperUser()`
- `isOwner(resourceUserId)`
- `hasTier(tier)`

### Session Structure
```typescript
session.user {
  id: string
  email: string
  role: 'CLIENT' | 'GUEST' | 'ADMIN' | 'SUPERUSER'
  tier: 'FREE' | 'PRO' | 'ENTERPRISE'
  isActive: boolean
}
```

## LLM Router & Multi-Model Strategy

### Hybrid Routing Algorithm (40-30-30)
Located in `src/lib/ai/router.ts`:

- **40% Quality Score**: Model capabilities + task-specific boosts
- **30% Cost Score**: Minimize token costs (tier-aware)
- **30% Availability Score**: Uptime + latency + current load

### Supported Models
| Model | Provider | Use Case | Tier |
|-------|----------|----------|------|
| claude-3.5-sonnet-20241022 | Anthropic | Code, reasoning | PRO+ |
| gpt-4o | OpenAI | Analysis, general | PRO+ |
| gemini-2.0-flash | Google | Fast, economical | FREE+ |
| deepseek-chat | DeepSeek | Budget-friendly | FREE+ |

### Fallback Strategy
Max 3 retries with exponential backoff. If primary model fails:
1. Try next-best model from routing decision
2. If all fail after 30s timeout → return generic error

### API Key Validation
All models validate API keys before client creation (`src/app/api/v1/chat/send/route.ts`).

## Custom Agents (Task 0 - Agent System Foundation)

**Status**: ✅ Production Ready (Implemented 2025-10-26)
**ADR**: [ADR-010: Custom Agent Execution](sys-docs/architecture/ADR-010-custom-agent-execution.md)
**User Guide**: [sys-docs/guides/CUSTOM-AGENTS.md](sys-docs/guides/CUSTOM-AGENTS.md)

### Overview
Custom Agents allow users to create and execute AI assistants with personalized system prompts, model preferences, and configurations. Execution uses SSE (Server-Sent Events) for real-time streaming, timeout handling (5-60s), and cost tracking.

### Execution Flow
```
POST /api/v1/agents/{agentId}/execute
  → requireAuth() - Verify session
  → requireOwnership() - Verify user owns agent (or is ADMIN/SUPER_ADMIN)
  → Tier Validation - Check user tier >= agent tier
  → LLM Router - Select model (respect agent.modelId preference)
  → Execute with timeout (AbortController, 5-60s)
  → SSE Stream - start → chunk → done → error events
  → Cost Tracking - $3/$15 per 1M tokens (Claude 3.5 Sonnet)
```

### Key Files
- **Validation**: `src/lib/validations/agent.ts` - Zod schemas (message 1-10000 chars, temp 0-2, timeout 5-60s)
- **Executor**: `src/lib/agents/executor.ts` - Core engine (executeAgent, executeAgentStream functions)
- **API Route**: `src/app/api/v1/agents/[agentId]/execute/route.ts` - POST handler with SSE response
- **Tests**: `src/__tests__/unit/executor.test.ts`, `src/__tests__/integration/agent-execute.test.ts` (67 tests, 100% passing)

### Request Schema
```typescript
{
  message: string;         // 1-10000 chars (required)
  temperature?: number;    // 0-2, default 0.7
  maxTokens?: number;      // 1-8192, default 4096
  timeout?: number;        // 5-60 seconds, default 30
  stream?: boolean;        // Default true (SSE)
}
```

### SSE Event Types
1. **start**: Execution began (`{ executionId, agentId, agentName, modelId, timestamp }`)
2. **chunk**: Content delta (`{ content, delta }`)
3. **done**: Execution complete (`{ tokensUsed, cost, duration, completedAt }`)
4. **error**: Execution failed (`{ error, code, executionId }`)

### Authorization Rules
- **Owner**: User who created the agent can execute ✅
- **ADMIN**: Can execute any agent (bypass ownership) ✅
- **SUPER_ADMIN**: Can execute any agent (bypass ownership) ✅
- **Other users**: ❌ 403 Forbidden

### Tier Validation
Hierarchy: `FREE < BASIC < PRO < ENTERPRISE < CUSTOM < UNLIMITED`

Examples:
- FREE user + FREE agent = ✅ Allowed
- FREE user + PRO agent = ❌ 403 Insufficient Tier
- PRO user + FREE agent = ✅ Allowed
- ENTERPRISE user + Any tier = ✅ Allowed

### Timeout Handling
- **Pattern**: AbortController + setTimeout
- **Range**: 5-60 seconds (MVP limit)
- **Error**: 408 Request Timeout + SSE error event
- **Cleanup**: `clearTimeout()` in finally block

```typescript
const abortController = new AbortController();
const timeoutId = setTimeout(() => {
  abortController.abort();
}, timeout * 1000);

try {
  await streamText({
    model: anthropic(modelId),
    abortSignal: abortController.signal,
    // ...
  });
} finally {
  clearTimeout(timeoutId);
}
```

### Cost Tracking Formula
```typescript
// Model pricing per 1M tokens
const pricing = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 }
};

const inputCost = (promptTokens / 1000000) * pricing.input;
const outputCost = (completionTokens / 1000000) * pricing.output;
const totalCost = inputCost + outputCost;
```

### Rate Limiting
Endpoint: `agents:execute`

Limits by Tier:
- FREE: 10 requests/min
- PRO: 50 requests/min
- ENTERPRISE: 500 requests/min

**Note**: Rate limiting temporarily disabled due to Next.js 15 type compatibility (systematic issue, not Task 0 specific).

### Common Issues & Solutions

#### Issue: 403 Forbidden (Not Owner)
**Cause**: User trying to execute someone else's agent
**Solution**: Only execute agents you created, or use ADMIN account

#### Issue: 408 Timeout
**Cause**: Complex query exceeds timeout limit
**Solution**: Increase `timeout` parameter (max 60s) or simplify query

#### Issue: High Cost
**Cause**: Long responses or high-token models
**Solution**: Use `maxTokens` to limit response, or use cheaper model (Haiku, Gemini Flash)

#### Issue: Model Mismatch
**Cause**: Agent specifies unavailable model
**Solution**: LLM Router auto-selects fallback. Check agent.modelId is valid.

### Development Pattern
1. **Create agent** in database (CustomAgent table)
2. **Set systemPrompt** (clear personality/instructions)
3. **Choose model** (optional - router selects if omitted)
4. **Execute via API** (POST /api/v1/agents/{agentId}/execute)
5. **Handle SSE stream** (parse events: start, chunk, done, error)
6. **Track costs** (log metrics from `done` event)

### Testing
Run Task 0 test suite:
```bash
npm test src/__tests__/unit/executor.test.ts
npm test src/__tests__/integration/agent-execute.test.ts
```

Expected: 67/67 passing ✅

## RAG Pipeline (Document Processing)

### Workflow
```
Upload (POST /api/v1/documents/upload)
  → Vercel Blob Storage
  → LangChain Loader (PDF/TXT/MD)
  → Text Splitter (800 tokens + 200 overlap)
  → OpenAI Embeddings (text-embedding-3-small, 1536 dims)
  → Pinecone Upsert (namespace: userId)
  → Database status: 'ready'

Query (GET /api/v1/chat/send?ragEnabled=true)
  → Embed query
  → Pinecone Search (top-5, threshold 0.7)
  → Format context
  → Inject into LLM prompt
```

### Key Files
- `src/lib/rag/pipeline.ts` - Upload & processing
- `src/lib/rag/search.ts` - Semantic search
- `src/lib/rag/context.ts` - Context builder
- `src/lib/pinecone.ts` - Pinecone client singleton

### Tier Limits
- **FREE**: RAG disabled (0MB upload)
- **PRO**: 10MB per file, 10 uploads/hour
- **ENTERPRISE**: 50MB per file, 100 uploads/hour

### Supported File Types
- PDF (`.pdf`): application/pdf
- Text (`.txt`): text/plain
- Markdown (`.md`): text/markdown

## Rate Limiting (Token Bucket Algorithm)

### Implementation
- **Algorithm**: Token Bucket (allows burst traffic, fair quota)
- **Storage**: Memory (dev) or Upstash Redis (prod) - auto-detected via `UPSTASH_REDIS_URL`
- **Middleware**: `withRateLimit(endpoint)` wrapper

### Tier Quotas
| Tier | chat:send | chat:sessions | documents:upload |
|------|-----------|---------------|------------------|
| FREE | 20/min | 5/min | 0/hour |
| PRO | 100/min | 50/min | 10/hour |
| ENTERPRISE | 1000/min | 500/min | 100/hour |

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

### Admin Endpoints
- `POST /api/v1/admin/rate-limit/reset` - Reset user's rate limits
- `GET /api/v1/user/rate-limits` - Get current user limits

## Frontend Architecture

### Page Structure
- **Server Components** (default): Data fetching, DB queries, SEO
- **Client Components** (`'use client'`): Interactivity, hooks, state

### Key Hooks
- `useChat()` - SSE streaming chat (`src/hooks/useChat.ts`)
- `useChatSession()` - Session CRUD (`src/hooks/useChatSession.ts`)
- `useDocuments()` - Document management (`src/hooks/useDocuments.ts`)

### SSE Streaming Pattern
```typescript
// Event types: start, chunk, done, error
const eventSource = new EventSource('/api/v1/chat/send', { /* ... */ });

eventSource.addEventListener('chunk', (e) => {
  const { content } = JSON.parse(e.data);
  // Append delta to message
});
```

### shadcn/ui Components
Installed: Button, Card, Input, Dialog, Sheet, Tabs, Select, Progress, AlertDialog, Avatar, Badge, Separator, ScrollArea, Dropdown Menu, Label, Table, Textarea, Checkbox, Sonner (toast)

**Location**: `src/components/ui/*`

## Environment Variables

### Required for Development
```bash
# Database
DATABASE_URL=postgresql://... # Neon PostgreSQL

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=... # openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# LLM Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
DEEPSEEK_API_KEY=sk_...

# RAG (Pinecone)
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west-2
PINECONE_INDEX_NAME=cjhirashi-agents-mvp

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=...
```

### Optional (Production)
```bash
# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

**Full reference**: `.env.example`

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file: `src/app/api/v1/[feature]/route.ts`
2. Add Zod validation: `src/lib/validations/[feature].ts`
3. Implement auth guards: Use `requireAuth()`, `requireRole()`, etc.
4. Add rate limiting: Wrap with `withRateLimit('[endpoint-name]')`
5. Add logging: Use `logger.info()` from `src/lib/logging/logger.ts`
6. Document in `sys-docs/api/ENDPOINTS.md`

### Adding a New Database Model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (dev) or `npx prisma migrate dev` (prod)
4. Update TypeScript types if needed
5. Document in `sys-docs/database/DATABASE.md`

### Adding a New AI Model

1. Add config to `src/lib/ai/models.ts`
2. Update `getTierConstraints()` in `src/lib/ai/router.ts`
3. Add API key validation in `src/app/api/v1/chat/send/route.ts`
4. Test routing with different prompts
5. Document tier availability

### Testing a Feature

1. Write unit tests: `src/__tests__/unit/[feature].test.ts`
2. Write integration tests: `src/__tests__/integration/[feature].test.ts`
3. Run `npm run test`
4. Verify coverage: `npm run test:coverage` (target: >80%)

## Build & Deployment

### Pre-Deployment Checklist
- [ ] `npm run build` succeeds (0 TypeScript errors)
- [ ] `npm run lint` passes (0 errors, warnings acceptable)
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] API keys validated

### Known Build Issues

**Issue**: Next.js 15 type incompatibility with `withRateLimit()` wrapper
**Workaround**: Type assertion in route handlers (temporary, fix pending)

**Issue**: pdf-parse version conflicts with LangChain
**Fix**: Locked to pdf-parse@1.1.1 (see ADR-007)

## Project Documentation

### Critical Docs (Read First)
- `sys-docs/PROJECT-ROADMAP.md` - Master plan, phases, progress tracking
- `sys-docs/architecture/README.md` - ADR index, architecture decisions
- `sys-docs/api/ENDPOINTS.md` - All 58 API endpoints documented
- `sys-docs/api/AUTHENTICATION.md` - RBAC matrix, auth flows

### Implementation Plans
- `sys-docs/PHASE5-IMPLEMENTATION-PLAN.md` - Backend implementation
- `sys-docs/PHASE6-IMPLEMENTATION-PLAN.md` - Frontend implementation
- `sys-docs/PHASE7-IMPLEMENTATION-PLAN.md` - Voice, deployment (next phase)

### Architecture Deep Dives
- `sys-docs/architecture/01-system-architecture.md` - System overview
- `sys-docs/architecture/02-layers.md` - 7-layer stack diagram
- `sys-docs/architecture/03-request-flow.md` - Chat message flow

## Code Quality Standards

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- No `any` types (use `unknown` or specific types)
- Type safety: 95%+ (current)

### Logging
- Use Winston logger: `import logger from '@/lib/logging/logger'`
- NO `console.log()` in production code (use `logger.info()`, `logger.error()`, etc.)
- Structured logging with context

### Error Handling
- Use `ApiError` class (`src/lib/errors/ApiError.ts`)
- Sanitize error messages (no internal details to users)
- Log full errors with stack traces

### Security
- Validate all API inputs with Zod schemas
- Use auth guards on protected routes
- Never expose API keys or secrets
- Sanitize user-generated content

## Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Module not found: Can't resolve 'pdf-parse'"
Check `package.json` - must be `pdf-parse@1.1.1` (not 2.x)

### "Invalid session" errors
Clear browser cookies or regenerate `NEXTAUTH_SECRET`

### Build fails with type errors in `.next/types`
Temporary files - safe to ignore if `src/**/*.ts` compiles cleanly

### Rate limit 429 errors in development
```bash
# Reset rate limits (requires ADMIN role)
curl -X POST http://localhost:3000/api/v1/admin/rate-limit/reset \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

## Contact & Escalation

- **Owner**: Carlos Jiménez Hirashi (cjhirashi@gmail.com)
- **Documentation Issues**: Open GitHub issue
- **Architectural Questions**: Refer to ADRs in `sys-docs/architecture/`

## Version Info

- **Current Version**: MVP v0.1.0-alpha
- **Last Updated**: 2025-10-25 (Phase 6 completed)
- **Next Milestone**: Phase 7 (Voice + Deployment)
